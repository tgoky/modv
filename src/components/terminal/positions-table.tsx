"use client";

import { Layers, X } from "lucide-react";
import { useState } from "react";
import { closePositionAction, type ActionResult } from "@/app/actions/trade";
import { fmtPrice, fmtSignedUsd, fmtUsd } from "@/lib/format";
import { perpLiqPrice, positionPnl } from "@/lib/sim/engine";
import { perpLabel } from "@/lib/sim/api-types";
import { memeKey, type Challenge, type PriceBook } from "@/lib/sim/types";
import { cn } from "@/lib/utils";
import { panel } from "./types";

export function PositionsTable({ challenge, book, onResult }: { challenge: Challenge | null; book: PriceBook; onResult: (r: ActionResult) => void }) {
  const [closing, setClosing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const positions = challenge?.positions ?? [];
  const active = challenge?.status === "active";

  const close = async (id: string) => {
    setClosing(id);
    setError(null);
    const r = await closePositionAction(id);
    setClosing(null);
    if (!r.ok) setError(r.error);
    onResult(r);
  };

  return (
    <section className={cn(panel, "p-4 sm:p-5")} aria-label="Open positions">
      <h3 className="flex items-center gap-2 font-display text-xl font-semibold"><Layers className="size-4 text-gold" aria-hidden /> Positions <span className="font-sans text-sm font-normal text-paper/45">{positions.length}</span></h3>
      {error && <p role="alert" className="mt-2 text-sm text-loss">{error}</p>}
      {positions.length === 0 ? (
        <p className="mt-3 text-sm text-paper/55">{active ? "No open positions. Pick a market and place an order." : "Nothing open."}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs text-paper/45">
              <tr>
                <th className="pb-2 font-medium">Market</th><th className="pb-2 font-medium">Size</th><th className="pb-2 font-medium">Entry</th>
                <th className="pb-2 font-medium">Mark</th><th className="pb-2 font-medium">Liq.</th><th className="pb-2 text-right font-medium">P/L</th><th className="pb-2"><span className="sr-only">Close</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper/[0.07] font-mono tabular-nums">
              {positions.map((p) => {
                const pnl = positionPnl(p, book);
                const mark = p.kind === "perp" ? book.perps[p.coin] : book.memes[memeKey(p.chain, p.address)]?.price;
                return (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-3 font-sans">
                      <span className="font-display text-base font-semibold">{p.kind === "perp" ? perpLabel(p.coin) : p.symbol}</span>{" "}
                      <span className={cn("text-xs font-semibold", p.kind === "perp" ? (p.side === "long" ? "text-gain" : "text-loss") : "text-paper/55")}>
                        {p.kind === "perp" ? `${p.side} ${p.leverage}x` : "spot"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">{fmtUsd(p.kind === "perp" ? p.notionalUsd : p.costUsd)}</td>
                    <td className="py-2.5 pr-3">${fmtPrice(p.entryPrice)}</td>
                    <td className="py-2.5 pr-3">{mark ? `$${fmtPrice(mark)}` : "-"}</td>
                    <td className="py-2.5 pr-3 text-loss">{p.kind === "perp" ? `$${fmtPrice(perpLiqPrice(p.side, p.entryPrice, p.leverage))}` : "-"}</td>
                    <td className={cn("py-2.5 text-right", (pnl ?? 0) >= 0 ? "text-gain" : "text-loss")}>{pnl === null ? "-" : fmtSignedUsd(pnl)}</td>
                    <td className="py-2.5 pl-3 text-right">
                      <button onClick={() => close(p.id)} disabled={!active || closing === p.id} aria-label={`Close ${p.kind === "perp" ? p.coin : p.symbol}`}
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-night-3 px-2.5 font-sans text-xs font-semibold hover:bg-night-3/70 disabled:opacity-40">
                        <X className="size-3.5" aria-hidden /> {closing === p.id ? "Closing" : "Close"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
