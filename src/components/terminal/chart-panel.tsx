"use client";

import { useState } from "react";
import { PriceChart } from "@/components/market/price-chart";
import { useCandles } from "@/hooks/use-candles";
import { fmtCompact, fmtPct, fmtPrice } from "@/lib/format";
import type { MemeMarket, PerpMarket } from "@/lib/sim/api-types";
import { CHAINS } from "@/lib/sim/chains";
import { cn } from "@/lib/utils";
import { panel, type Selected } from "./types";

const INTERVALS = ["5m", "15m", "1h"] as const;

export function ChartPanel({
  selected, perp, meme, liveTs,
}: {
  selected: Selected;
  perp?: PerpMarket;
  meme?: MemeMarket;
  liveTs: number;
}) {
  const [interval, setInterval] = useState<(typeof INTERVALS)[number]>("15m");
  const url =
    selected.kind === "perp"
      ? `/api/candles?kind=perp&coin=${encodeURIComponent(selected.coin)}&interval=${interval}`
      : meme
        ? `/api/candles?kind=meme&chain=${meme.chain}&pair=${encodeURIComponent(meme.pairAddress)}`
        : "";
  const candles = useCandles(url);

  const title = selected.kind === "perp" ? (perp?.label ?? selected.coin) : (meme?.symbol ?? "Token");
  const price = selected.kind === "perp" ? perp?.price : meme?.priceUsd;
  const change = selected.kind === "perp" ? perp?.changePct : meme?.change24h;

  return (
    <section className={cn(panel, "p-4 sm:p-5")} aria-label="Price chart">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[2rem] leading-none font-semibold">
            {title}
            <span className="rounded bg-paper/10 px-1.5 py-0.5 font-sans text-[0.65rem] font-medium tracking-wide text-paper/60">
              {selected.kind === "perp" ? "PERP" : meme ? CHAINS[meme.chain].label.toUpperCase() : ""}
            </span>
          </h2>
          <p className="mt-1.5 text-sm text-paper/55">
            {selected.kind === "perp" && perp && `Funding ${(perp.funding * 100).toFixed(4)}% per hour, 24h volume $${fmtCompact(perp.volumeUsd)}`}
            {selected.kind === "meme" && meme && `${meme.name}, liquidity $${fmtCompact(meme.liquidityUsd)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[1.9rem] leading-none tabular-nums">{price ? `$${fmtPrice(price)}` : "-"}</p>
          <p className={cn("mt-1.5 font-mono text-sm tabular-nums", (change ?? 0) >= 0 ? "text-gain" : "text-loss")}>{fmtPct(change ?? null)} 24h</p>
        </div>
      </div>

      {selected.kind === "perp" && (
        <div className="mt-4 flex gap-1" role="group" aria-label="Chart interval">
          {INTERVALS.map((i) => (
            <button key={i} onClick={() => setInterval(i)} aria-pressed={interval === i}
              className={cn("h-8 rounded-md px-3 text-sm font-medium transition-colors", interval === i ? "bg-night-3 text-paper" : "text-paper/55 hover:text-paper")}>
              {i}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        {candles.status === "ready" && candles.data.points.length > 1 ? (
          <PriceChart
            key={url}
            points={candles.data.points}
            timeStyle="time"
            format={fmtPrice}
            label={title}
            livePrice={price ?? null}
            liveTs={price ? liveTs : null}
          />
        ) : (
          <div className="grid h-[320px] place-items-center rounded-lg border border-dashed border-paper/15 px-6 text-center text-sm text-paper/55">
            {!url ? "Loading token" : candles.status === "error" ? "Chart history is unavailable right now. The live price above still updates." : "Loading chart"}
          </div>
        )}
      </div>
    </section>
  );
}
