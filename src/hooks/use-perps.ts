"use client";

import { useEffect, useMemo, useState } from "react";
import { connectHyperliquid, type SocketState } from "@/lib/hl-socket";
import type { PerpMarket } from "@/lib/sim/api-types";

const FLUSH_MS = 250;
const REFRESH_MS = 60_000;

export interface PerpsFeed {
  markets: PerpMarket[];
  socket: SocketState;
  /** Set when the market list itself could not be loaded. */
  failed: boolean;
  /** When the newest live price arrived, ms since epoch. Zero before the first one. */
  updatedAt: number;
}

/**
 * Futures markets: the list, 24h stats and funding come from our server every
 * minute, and prices are overlaid live from Hyperliquid's allMids stream.
 */
export function usePerps(): PerpsFeed {
  const [base, setBase] = useState<PerpMarket[]>([]);
  const [failed, setFailed] = useState(false);
  const [mids, setMids] = useState<{ prices: Record<string, number>; at: number }>({ prices: {}, at: 0 });
  const [socket, setSocket] = useState<SocketState>("connecting");

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const res = await fetch("/api/perps", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as PerpMarket[];
        if (!disposed) {
          setBase(data);
          setFailed(false);
        }
      } catch {
        if (!disposed) setFailed(true);
      } finally {
        if (!disposed) timer = setTimeout(load, REFRESH_MS);
      }
    };
    void load();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let pending: Record<string, number> = {};
    const flush = () => {
      if (Object.keys(pending).length === 0) return;
      const batch = pending;
      pending = {};
      setMids((prev) => ({ prices: { ...prev.prices, ...batch }, at: Date.now() }));
    };
    const timer = setInterval(flush, FLUSH_MS);
    const stop = connectHyperliquid({
      subscriptions: [{ type: "allMids" }],
      onState: setSocket,
      onMessage: (channel, data) => {
        if (channel !== "allMids") return;
        const raw = (data as { mids?: Record<string, string> }).mids ?? {};
        for (const [coin, px] of Object.entries(raw)) {
          const n = Number(px);
          if (n > 0) pending[coin] = n;
        }
      },
    });
    return () => {
      clearInterval(timer);
      stop();
    };
  }, []);

  const markets = useMemo(
    () =>
      base.map((m) => {
        const price = mids.prices[m.coin] ?? m.price;
        return { ...m, price, changePct: m.prevDayPx > 0 ? ((price - m.prevDayPx) / m.prevDayPx) * 100 : 0 };
      }),
    [base, mids],
  );

  return { markets, socket, failed, updatedAt: mids.at };
}
