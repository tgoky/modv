"use client";

import { Flame, Layers } from "lucide-react";
import { usePerps } from "@/hooks/use-perps";
import { fmtPct, fmtPrice, fmtCompact } from "@/lib/format";
import { CHALLENGE } from "@/lib/brand";
import { CHAIN_LIST } from "@/lib/sim/chains";
import { cn } from "@/lib/utils";

export function MarketsPreview() {
  const { markets } = usePerps();
  const top = [...markets].sort((a, b) => b.volumeUsd - a.volumeUsd).slice(0, 7);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl bg-night p-6 text-paper sm:p-8">
        <h3 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Flame className="size-5 text-gold" aria-hidden /> Futures
        </h3>
        <p className="mt-2 text-sm text-paper/65">
          Perpetuals priced from Hyperliquid&apos;s live market, up to {CHALLENGE.maxLeverage}x. Go long or short.
        </p>
        <ul className="mt-5 divide-y divide-paper/10">
          {top.length === 0
            ? Array.from({ length: 6 }, (_, i) => <li key={i} className="h-12 animate-pulse" />)
            : top.map((m) => (
                <li key={m.coin} className="grid grid-cols-[1fr_auto_4.5rem] items-center gap-4 py-3">
                  <span className="font-display text-lg font-semibold">{m.label}</span>
                  <span className="font-mono text-sm tabular-nums">${fmtPrice(m.price)}</span>
                  <span className={cn("text-right font-mono text-sm tabular-nums", m.changePct >= 0 ? "text-gain" : "text-loss")}>
                    {fmtPct(m.changePct)}
                  </span>
                </li>
              ))}
        </ul>
        {top.length > 0 && (
          <p className="mt-3 text-xs text-paper/50">24h volume leader: {top[0].label}, ${fmtCompact(top[0].volumeUsd)}</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h3 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Layers className="size-5 text-ink" aria-hidden /> Meme coins, four chains
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Trending tokens straight from on-chain pools. Every swap costs a simulated network fee and moves the price by your share of the pool&apos;s liquidity, like the real thing.
        </p>
        <ul className="mt-5 divide-y divide-border">
          {CHAIN_LIST.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 py-3">
              <span className="font-display text-lg font-semibold">{c.label}</span>
              <span className="text-sm text-muted-foreground">
                gas about <span className="font-mono font-medium text-foreground">${c.gasUsd.toFixed(2)}</span> per swap
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Ethereum mainnet is included on purpose: at $3.50 a swap it shows why a $100 account trades elsewhere.
        </p>
      </section>
    </div>
  );
}
