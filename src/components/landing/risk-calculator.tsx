"use client";

import { useState } from "react";
import { CHALLENGE, FLOOR_EQUITY, TARGET_EQUITY } from "@/lib/brand";
import { fmtPct, fmtSignedUsd, fmtUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAINTENANCE = 0.005; // keep in step with src/lib/sim/engine.ts
const START = CHALLENGE.startBalance;
const GAUGE_MIN = 60;
const GAUGE_MAX = 140;

/** Play with one futures trade on a fresh account and see what the rules would do. */
export function RiskCalculator() {
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState(10);
  const [margin, setMargin] = useState(20);
  const [move, setMove] = useState(6);

  const dir = side === "long" ? 1 : -1;
  const notional = margin * leverage;
  const feeRate = CHALLENGE.perpTakerFeeBps / 1e4;
  const openFee = notional * feeRate;
  const liqDistance = 1 / leverage - MAINTENANCE; // adverse move that liquidates, as a fraction
  const adverse = -dir * (move / 100);
  const liquidated = adverse >= liqDistance;

  const closeFee = liquidated ? 0 : notional * feeRate;
  const pnl = liquidated ? -margin : notional * dir * (move / 100);
  const equity = START - margin - openFee + (liquidated ? 0 : Math.max(0, margin + pnl - closeFee));

  const status =
    equity <= FLOOR_EQUITY ? "failed" : equity >= TARGET_EQUITY ? "target" : liquidated ? "liquidated" : "open";
  const pos = (v: number) => `${((Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, v)) - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100}%`;

  const targetMove = ((TARGET_EQUITY - START + openFee + notional * feeRate) / notional) * 100;
  const lossLimitMove = ((START - FLOOR_EQUITY - openFee - notional * feeRate) / notional) * 100;
  const canBreachByLiq = margin + openFee >= START - FLOOR_EQUITY;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
      <div className="grid gap-6">
        <div role="group" aria-label="Direction" className="grid grid-cols-2 gap-2 rounded-lg bg-paper-2 p-1">
          {(["long", "short"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={side === s}
              onClick={() => setSide(s)}
              className={cn(
                "h-11 rounded-md text-[0.95rem] font-semibold capitalize transition-colors",
                side === s ? (s === "long" ? "bg-gain-ink text-paper" : "bg-loss-ink text-paper") : "text-foreground/70 hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <Slider label="Leverage" value={leverage} min={1} max={CHALLENGE.maxLeverage} step={1} format={(v) => `${v}x`} onChange={setLeverage} />
        <Slider label="Margin from your $100" value={margin} min={1} max={START} step={1} format={(v) => fmtUsd(v, 0)} onChange={setMargin} />
        <Slider label="Price moves" value={move} min={-30} max={30} step={0.5} format={(v) => fmtPct(v, 1)} onChange={setMove} />
        <p className="text-sm text-muted-foreground">
          Position size is {fmtUsd(notional, 0)}. It is liquidated if price moves {fmtPct(liqDistance * 100, 1).replace("+", "")} against you.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Account equity after this trade</p>
            <p className="mt-1 font-display text-[3.4rem] leading-none font-semibold tabular-nums">{fmtUsd(equity)}</p>
          </div>
          <p className={cn("font-display text-2xl font-semibold tabular-nums", pnl >= 0 ? "text-gain-ink" : "text-loss-ink")}>
            {fmtSignedUsd(pnl)}
          </p>
        </div>

        <div className="mt-8">
          <div className="relative h-3 overflow-hidden rounded-full bg-paper-2">
            <div className="absolute inset-y-0 left-0 bg-loss-ink/25" style={{ width: pos(FLOOR_EQUITY) }} />
            <div className="absolute inset-y-0 right-0 bg-gain-ink/25" style={{ left: pos(TARGET_EQUITY) }} />
          </div>
          <div className="relative -mt-[1.15rem] h-6">
            <div
              className="absolute top-0 size-6 -translate-x-1/2 rounded-full border-[3px] border-ink bg-gold shadow transition-[left] duration-200"
              style={{ left: pos(equity) }}
              aria-hidden
            />
          </div>
          <div className="relative mt-1 h-10 text-xs text-muted-foreground">
            <span className="absolute -translate-x-1/2 text-center" style={{ left: pos(FLOOR_EQUITY) }}>
              {fmtUsd(FLOOR_EQUITY, 0)}<br />loss limit
            </span>
            <span className="absolute -translate-x-1/2 text-center" style={{ left: pos(START) }}>
              {fmtUsd(START, 0)}<br />start
            </span>
            <span className="absolute -translate-x-1/2 text-center" style={{ left: pos(TARGET_EQUITY) }}>
              {fmtUsd(TARGET_EQUITY, 0)}<br />target
            </span>
          </div>
        </div>

        <p
          className={cn(
            "mt-2 rounded-lg px-4 py-3 text-[0.95rem] font-medium",
            status === "failed" && "bg-loss-ink/10 text-loss-ink",
            status === "target" && "bg-gain-ink/10 text-gain-ink",
            (status === "open" || status === "liquidated") && "bg-paper-2 text-foreground",
          )}
          aria-live="polite"
        >
          {status === "failed" && (liquidated ? "Liquidated, and the loss breaks your limit. The challenge fails." : "This breaks your loss limit. The challenge fails.")}
          {status === "target" && "Target reached. Close your positions to bank the pass."}
          {status === "liquidated" && "Liquidated. You lose the margin but stay inside the loss limit, so you can keep trading."}
          {status === "open" && "Still in play. Not at the target, not at the limit."}
        </p>

        <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 border-t border-border pt-3">
            <dt className="text-muted-foreground">Fees paid (both sides)</dt>
            <dd className="font-medium tabular-nums">{fmtUsd(openFee + closeFee)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-3">
            <dt className="text-muted-foreground">Move to reach target</dt>
            <dd className="font-medium tabular-nums">{fmtPct(dir * targetMove, 1)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-3 sm:col-span-2">
            <dt className="text-muted-foreground">Move that breaks the loss limit</dt>
            <dd className="font-medium tabular-nums">
              {canBreachByLiq
                ? `liquidation at ${fmtPct(-dir * liqDistance * 100, 1)}`
                : lossLimitMove < liqDistance * 100
                  ? fmtPct(-dir * lossLimitMove, 1)
                  : "not on this trade alone"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-baseline justify-between text-[0.95rem]">
        <span className="font-medium">{label}</span>
        <span className="font-display text-2xl font-semibold tabular-nums">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--ink)]"
      />
    </label>
  );
}
