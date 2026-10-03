"use client";

import { usePerps } from "@/hooks/use-perps";
import { fmtPct, fmtPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A short live price list for the sign-in screens. */
export function MiniTape() {
  const { markets } = usePerps();
  const rows = markets.slice(0, 6);
  return (
    <ul className="divide-y divide-paper/10 rounded-xl border border-paper/10 bg-night-2">
      {rows.length === 0
        ? Array.from({ length: 6 }, (_, i) => <li key={i} className="h-14 animate-pulse" />)
        : rows.map((m) => (
            <li key={m.coin} className="grid grid-cols-[1fr_auto_4.5rem] items-center gap-4 px-5 py-3.5">
              <span className="font-display text-xl font-semibold">{m.label}</span>
              <span className="font-mono text-[0.95rem] tabular-nums">${fmtPrice(m.price)}</span>
              <span className={cn("text-right font-mono text-sm tabular-nums", m.changePct >= 0 ? "text-gain" : "text-loss")}>
                {fmtPct(m.changePct)}
              </span>
            </li>
          ))}
    </ul>
  );
}
