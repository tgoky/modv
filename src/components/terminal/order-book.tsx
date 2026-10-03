"use client";

import { BookOpen, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useOrderBook, type BookLevel } from "@/hooks/use-order-book";
import { fmtCompact, fmtPct, fmtPrice } from "@/lib/format";
import type { MemeMarket } from "@/lib/sim/api-types";
import { CHAINS } from "@/lib/sim/chains";
import { cn } from "@/lib/utils";
import { panel } from "./types";

export function OrderBook({ coin }: { coin: string }) {
  const book = useOrderBook(coin);
  const asks = book ? [...book.asks].reverse() : [];
  const bids = book?.bids ?? [];
  const max = Math.max(1, ...asks.map((l) => l.size), ...bids.map((l) => l.size));
  const spread = book && book.asks[0] && book.bids[0] ? book.asks[0].price - book.bids[0].price : null;

  return (
    <section className={cn(panel, "p-4")} aria-label={`${coin} order book`}>
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><BookOpen className="size-4 text-gold" aria-hidden /> Order book</h3>
      <div className="mt-3 grid grid-cols-2 px-1 text-xs text-paper/45"><span>Price</span><span className="text-right">Size</span></div>
      {!book ? (
        <div className="mt-2 grid gap-1" aria-busy>{Array.from({ length: 12 }, (_, i) => <div key={i} className="h-5 animate-pulse rounded bg-night-3/60" />)}</div>
      ) : (
        <div className="mt-1 font-mono text-[0.8rem] tabular-nums">
          <Side levels={asks} max={max} tone="loss" />
          <div className="my-1 flex items-center justify-between border-y border-paper/10 px-1 py-1.5 text-xs text-paper/60">
            <span>Spread</span><span>{spread !== null ? fmtPrice(spread) : "-"}</span>
          </div>
          <Side levels={bids} max={max} tone="gain" />
        </div>
      )}
    </section>
  );
}

function Side({ levels, max, tone }: { levels: BookLevel[]; max: number; tone: "gain" | "loss" }) {
  return (
    <ul>
      {levels.map((l) => (
        <li key={l.price} className="relative flex justify-between px-1 py-[3px]">
          <span aria-hidden className={cn("absolute inset-y-0 right-0", tone === "gain" ? "bg-gain/12" : "bg-loss/12")} style={{ width: `${(l.size / max) * 100}%` }} />
          <span className={cn("relative", tone === "gain" ? "text-gain" : "text-loss")}>{fmtPrice(l.price)}</span>
          <span className="relative text-paper/80">{l.size >= 1000 ? fmtCompact(l.size) : l.size.toFixed(l.size < 1 ? 4 : 2)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Meme coins have no central book, so show what actually sets the price: the pool. */
export function PoolInfo({ m }: { m: MemeMarket }) {
  const [now] = useState(() => Date.now());
  const age = m.pairCreatedAt ? Math.max(1, Math.round((now - m.pairCreatedAt) / 3_600_000)) : null;
  const rows: [string, string][] = [
    ["Pool liquidity", `$${fmtCompact(m.liquidityUsd)}`],
    ["24h volume", `$${fmtCompact(m.volume24h)}`],
    ["1h change", fmtPct(m.change1h)],
    ["24h change", fmtPct(m.change24h)],
    ["Fully diluted value", m.fdv ? `$${fmtCompact(m.fdv)}` : "n/a"],
    ["Pool age", age === null ? "n/a" : age < 48 ? `${age}h` : `${Math.round(age / 24)}d`],
    ["Venue", `${m.dexId} on ${CHAINS[m.chain].label}`],
  ];
  return (
    <section className={cn(panel, "p-4")} aria-label="Pool details">
      <h3 className="font-display text-lg font-semibold">Pool details</h3>
      <dl className="mt-3 divide-y divide-paper/[0.07] text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-paper/55">{k}</dt><dd className="font-mono tabular-nums">{v}</dd></div>
        ))}
      </dl>
      <a href={`https://dexscreener.com/${CHAINS[m.chain].dexscreener}/${m.pairAddress}`} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-1.5 text-sm text-gold hover:underline">
        View pool on DexScreener <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </section>
  );
}
