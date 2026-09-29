"use client";

import { useEffect, useState } from "react";
import {
  CRYPTO_INSTRUMENTS,
  FX_INSTRUMENTS,
  type FxPayload,
  type Quote,
} from "@/lib/markets";

const COINBASE_WS = "wss://ws-feed.exchange.coinbase.com";
/** UI updates are batched so a busy market does not re-render on every trade. */
const FLUSH_MS = 250;
/** No message for this long means the socket is dead even if it says it is open. */
const STALE_MS = 20_000;
/** The server caches, so polling often is cheap. */
const FX_POLL_MS = 30_000;

export type FeedState = "connecting" | "live" | "reconnecting";

export interface FxStatus {
  phase: "loading" | "ready" | "error";
  mode: FxPayload["mode"] | null;
  source: string | null;
  /** Provider timestamp of the newest rate. */
  asOf: number | null;
}

export interface LiveMarkets {
  quotes: Record<string, Quote>;
  feed: FeedState;
  fx: FxStatus;
}

export function useLiveMarkets(): LiveMarkets {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [feed, setFeed] = useState<FeedState>("connecting");
  const [fx, setFx] = useState<FxStatus>({
    phase: "loading",
    mode: null,
    source: null,
    asOf: null,
  });

  // Crypto: Coinbase public WebSocket.
  useEffect(() => {
    const byProduct = new Map(CRYPTO_INSTRUMENTS.map((i) => [i.product!, i]));
    const pending = new Map<string, Quote>();

    let ws: WebSocket | null = null;
    let disposed = false;
    let paused = false;
    let attempt = 0;
    let receivedTicker = false;
    let lastMessageAt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      if (pending.size === 0) return;
      const batch = Object.fromEntries(pending);
      pending.clear();
      setQuotes((prev) => ({ ...prev, ...batch }));
    };
    const flushTimer = setInterval(flush, FLUSH_MS);

    const teardownSocket = () => {
      if (!ws) return;
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      ws.close();
      ws = null;
    };

    const scheduleReconnect = () => {
      teardownSocket();
      if (disposed || paused) return;
      const delay = Math.min(30_000, 1_000 * 2 ** attempt);
      attempt += 1;
      receivedTicker = false;
      setFeed("reconnecting");
      retryTimer = setTimeout(open, delay);
    };

    function open() {
      if (disposed || paused) return;
      const socket = new WebSocket(COINBASE_WS);
      ws = socket;
      lastMessageAt = Date.now();

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: "subscribe",
            product_ids: [...byProduct.keys()],
            channels: ["ticker"],
          }),
        );
      };

      socket.onmessage = (event) => {
        lastMessageAt = Date.now();
        let msg: Record<string, string>;
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (msg.type !== "ticker") return;
        const inst = byProduct.get(msg.product_id);
        const price = Number(msg.price);
        if (!inst || !Number.isFinite(price)) return;

        const open24h = Number(msg.open_24h);
        pending.set(inst.id, {
          price,
          changePct: open24h > 0 ? ((price - open24h) / open24h) * 100 : null,
          ts: Date.parse(msg.time) || Date.now(),
        });
        if (!receivedTicker) {
          receivedTicker = true;
          attempt = 0;
          setFeed("live");
        }
      };

      socket.onerror = () => socket.close();
      socket.onclose = scheduleReconnect;
    }

    const watchdog = setInterval(() => {
      if (ws && Date.now() - lastMessageAt > STALE_MS) scheduleReconnect();
    }, 5_000);

    const onVisibility = () => {
      if (document.hidden) {
        paused = true;
        clearTimeout(retryTimer);
        teardownSocket();
      } else if (paused) {
        paused = false;
        attempt = 0;
        open();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    open();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearInterval(flushTimer);
      clearInterval(watchdog);
      document.removeEventListener("visibilitychange", onVisibility);
      teardownSocket();
    };
  }, []);

  // Currencies: polled from our own /api/fx route, which caches the provider.
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      try {
        const res = await fetch("/api/fx", { cache: "no-store" });
        if (!res.ok) throw new Error(`fx ${res.status}`);
        const data = (await res.json()) as FxPayload;
        if (disposed) return;

        const next: Record<string, Quote> = {};
        for (const inst of FX_INSTRUMENTS) {
          const r = data.rates[inst.id];
          if (!r) continue;
          next[inst.id] = {
            price: r.price,
            changePct: r.prevClose ? ((r.price - r.prevClose) / r.prevClose) * 100 : null,
            ts: data.asOf,
          };
        }
        setQuotes((prev) => ({ ...prev, ...next }));
        setFx({ phase: "ready", mode: data.mode, source: data.source, asOf: data.asOf });
      } catch {
        if (!disposed) setFx((prev) => (prev.phase === "ready" ? prev : { ...prev, phase: "error" }));
      } finally {
        if (!disposed && !document.hidden) timer = setTimeout(run, FX_POLL_MS);
      }
    };

    const onVisibility = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void run();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    void run();

    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { quotes, feed, fx };
}
