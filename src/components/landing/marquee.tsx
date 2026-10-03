"use client";

import { useEffect, useState } from "react";
import { useMemes } from "@/hooks/use-memes";
import { usePerps } from "@/hooks/use-perps";
import { fmtPct, fmtPrice } from "@/lib/format";
import { CHAINS } from "@/lib/sim/chains";
import { cn } from "@/lib/utils";

interface Item {
  key: string;
  symbol: string;
  tag: string;
  price: number;
  change: number | null;
}

/** Rolling tape of live futures and trending meme coins. Pauses under the pointer. */
export function Marquee({ className }: { className?: string }) {
  const { markets } = usePerps();
  const { memes } = useMemes();

  const items: Item[] = [
    ...markets.map((m) => ({ key: `p:${m.coin}`, symbol: m.label, tag: "PERP", price: m.price, change: m.changePct })),
    ...memes.slice(0, 14).map((m) => ({
      key: `m:${m.chain}:${m.address}`,
      symbol: m.symbol,
      tag: CHAINS[m.chain].label.toUpperCase(),
      price: m.priceUsd,
      change: m.change24h,
    })),
  ];

  return (
    <div
      className={cn("marquee overflow-hidden", className)}
      role="region"
      aria-label="Live prices, futures and meme coins"
    >
      {items.length === 0 ? (
        <div className="flex h-12 items-center px-6 text-sm text-paper/60">Loading live prices</div>
      ) : (
        <div className="marquee-track" style={{ ["--marquee-duration" as string]: `${Math.max(30, items.length * 3.6)}s` }}>
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0">
              {items.map((it) => (
                <TickerItem key={it.key} item={it} />
              ))}
            </ul>
          ))}
        </div>
      )}
    </div>
  );
}

function TickerItem({ item }: { item: Item }) {
  const [last, setLast] = useState(item.price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  if (item.price !== last) {
    setLast(item.price);
    setFlash(item.price > last ? "up" : "down");
  }
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 750);
    return () => clearTimeout(t);
  }, [flash, item.price]);

  const up = (item.change ?? 0) >= 0;
  return (
    <li className="flex items-center gap-3 border-r border-paper/10 px-6 py-3 whitespace-nowrap">
      <span className="font-display text-lg font-semibold text-paper">{item.symbol}</span>
      <span className="rounded-sm bg-paper/10 px-1.5 py-0.5 text-[0.62rem] tracking-wider text-paper/60">{item.tag}</span>
      <span
        className={cn(
          "rounded px-1 font-mono text-[0.92rem] text-paper tabular-nums",
          flash === "up" && "tick-up",
          flash === "down" && "tick-down",
        )}
      >
        ${fmtPrice(item.price)}
      </span>
      <span className={cn("font-mono text-[0.85rem] tabular-nums", item.change === null ? "text-paper/50" : up ? "text-gain" : "text-loss")}>
        {fmtPct(item.change)}
      </span>
    </li>
  );
}
