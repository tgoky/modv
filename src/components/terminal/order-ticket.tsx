"use client";

import { Lock, TriangleAlert, Zap } from "lucide-react";
import { useState } from "react";
import { openMemeAction, openPerpAction, type ActionResult } from "@/app/actions/trade";
import { CHALLENGE, FLOOR_EQUITY } from "@/lib/brand";
import { fmtPrice, fmtUsd } from "@/lib/format";
import type { MemeMarket, PerpMarket } from "@/lib/sim/api-types";
import { CHAINS } from "@/lib/sim/chains";
import { memeBuy, perpLiqPrice, perpSlipBps } from "@/lib/sim/engine";
import type { Challenge, Side } from "@/lib/sim/types";
import { cn } from "@/lib/utils";
import { panel, type Selected } from "./types";

export function OrderTicket({
  selected, perp, meme, challenge, equity, onResult, onStart,
}: {
  selected: Selected;
  perp?: PerpMarket;
  meme?: MemeMarket;
  challenge: Challenge | null;
  equity: number;
  onResult: (r: ActionResult) => void;
  onStart: () => void;
}) {
  const [side, setSide] = useState<Side>("long");
  const [leverage, setLeverage] = useState(5);
  const [amount, setAmount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = challenge?.status === "active";
  const cash = challenge?.cash ?? 0;
  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= CHALLENGE.minPositionUsd;
  const lossRoom = Math.max(0, equity - FLOOR_EQUITY);
  const maxLev = Math.min(CHALLENGE.maxLeverage, perp?.maxLeverage ?? CHALLENGE.maxLeverage);
  const lev = Math.min(leverage, maxLev);

  // ---- previews, from the same maths the server will apply ----
  const perpPreview = selected.kind === "perp" && perp && valid ? (() => {
    const slip = perpSlipBps(perp.coin) / 1e4;
    const entry = side === "long" ? perp.price * (1 + slip) : perp.price * (1 - slip);
    const notional = value * lev;
    const fee = (notional * CHALLENGE.perpTakerFeeBps) / 1e4;
    return { entry, notional, fee, liq: perpLiqPrice(side, entry, lev), total: value + fee };
  })() : null;

  const memePreview = selected.kind === "meme" && meme && valid
    ? { ...memeBuy(value, meme.priceUsd, meme.liquidityUsd, meme.chain), total: value + CHAINS[meme.chain].gasUsd }
    : null;

  const total = perpPreview?.total ?? memePreview?.total ?? 0;
  const worstLoss = selected.kind === "perp" && perpPreview ? perpPreview.total : 0;
  const breaksLimit = worstLoss > 0 && worstLoss >= lossRoom;
  const tooBig = valid && total > cash + 1e-9;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result =
      selected.kind === "perp" && perp
        ? await openPerpAction({ coin: perp.coin, side, leverage: lev, marginUsd: value })
        : meme
          ? await openMemeAction({ chain: meme.chain, address: meme.address, sizeUsd: value })
          : ({ ok: false, error: "Pick a market first." } as const);
    setBusy(false);
    if (!result.ok) setError(result.error);
    onResult(result);
  };

  const quick = (pct: number) => setAmount(String(Math.max(1, Math.floor(cash * pct * 100 * 0.985) / 100)));

  if (!active) {
    return (
      <section className={cn(panel, "grid gap-3 p-5 text-center")} aria-label="Order ticket">
        <Lock className="mx-auto size-8 text-gold" aria-hidden />
        <h3 className="font-display text-2xl font-semibold">{challenge ? "Challenge ended" : "Trading is locked"}</h3>
        <p className="text-sm text-paper/60">{challenge ? "Start a new challenge to keep trading." : `Pay ${fmtUsd(CHALLENGE.entryFeeUsd, 0)} to open a ${fmtUsd(CHALLENGE.startBalance, 0)} account.`}</p>
        <button onClick={onStart} className="mt-1 h-11 rounded-lg bg-gold font-semibold text-night hover:bg-gold/85">Start for {fmtUsd(CHALLENGE.entryFeeUsd, 0)}</button>
      </section>
    );
  }

  const isPerp = selected.kind === "perp";
  const label = isPerp ? `${side === "long" ? "Long" : "Short"} ${perp?.label ?? ""}` : `Buy ${meme?.symbol ?? ""}`;

  return (
    <section className={cn(panel, "grid gap-4 p-4")} aria-label="Order ticket">
      <h3 className="flex items-center gap-2 font-display text-xl font-semibold"><Zap className="size-4 text-gold" aria-hidden /> Market order</h3>

      {isPerp && (
        <div role="group" aria-label="Direction" className="grid grid-cols-2 gap-1 rounded-lg bg-night p-1">
          {(["long", "short"] as const).map((s) => (
            <button key={s} aria-pressed={side === s} onClick={() => setSide(s)}
              className={cn("h-10 rounded-md font-semibold capitalize transition-colors", side === s ? (s === "long" ? "bg-gain text-night" : "bg-loss text-night") : "text-paper/60 hover:text-paper")}>
              {s}
            </button>
          ))}
        </div>
      )}

      {isPerp && (
        <label className="grid gap-1.5">
          <span className="flex justify-between text-sm"><span className="text-paper/60">Leverage</span><span className="font-mono">{lev}x</span></span>
          <input type="range" min={1} max={maxLev} value={lev} onChange={(e) => setLeverage(Number(e.target.value))} className="accent-[var(--gold)]" />
        </label>
      )}

      <label className="grid gap-1.5">
        <span className="flex justify-between text-sm"><span className="text-paper/60">{isPerp ? "Margin (USD)" : "Amount to buy (USD)"}</span><span className="text-paper/45">Cash {fmtUsd(cash)}</span></span>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={tooBig}
          className="h-11 rounded-lg border border-paper/15 bg-night px-3 font-mono text-lg tabular-nums focus-visible:outline-gold" />
      </label>
      <div className="grid grid-cols-4 gap-1.5">
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <button key={p} onClick={() => quick(p)} className="h-8 rounded-md bg-night-3 text-xs font-medium text-paper/75 hover:text-paper">{p === 1 ? "Max" : `${p * 100}%`}</button>
        ))}
      </div>

      <dl className="grid gap-1.5 border-t border-paper/10 pt-3 text-sm">
        {perpPreview && (<>
          <Row k="Position size" v={fmtUsd(perpPreview.notional)} />
          <Row k="Entry (est.)" v={`$${fmtPrice(perpPreview.entry)}`} />
          <Row k="Liquidation" v={`$${fmtPrice(perpPreview.liq)}`} tone="loss" />
          <Row k="Fee" v={fmtUsd(perpPreview.fee, 3)} />
        </>)}
        {memePreview && meme && (<>
          <Row k="Price impact" v={`${(memePreview.impact * 100).toFixed(2)}%`} tone={memePreview.impact > 0.03 ? "loss" : undefined} />
          <Row k="Swap fee" v={fmtUsd(memePreview.feeUsd, 3)} />
          <Row k={`Gas on ${CHAINS[meme.chain].label} (simulated)`} v={fmtUsd(memePreview.gasUsd)} />
          <Row k="You receive (est.)" v={`${memePreview.qty.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${meme.symbol}`} />
        </>)}
        {!perpPreview && !memePreview && <p className="text-paper/45">Enter an amount of at least {fmtUsd(CHALLENGE.minPositionUsd, 0)}.</p>}
      </dl>

      {breaksLimit && (
        <p className="flex gap-2 rounded-lg bg-loss/10 p-3 text-sm text-loss" role="note">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          If this is liquidated you lose {fmtUsd(worstLoss)}, which is more than the {fmtUsd(lossRoom)} you have left before the loss limit. The challenge would end.
        </p>
      )}
      {tooBig && <p className="text-sm text-loss" role="alert">That is more than your cash of {fmtUsd(cash)}{memePreview ? ", once gas is added" : ", once the fee is added"}.</p>}
      {error && <p className="text-sm text-loss" role="alert">{error}</p>}

      <button onClick={submit} disabled={busy || !valid || tooBig || (isPerp ? !perp : !meme)}
        className={cn("h-12 rounded-lg font-semibold text-night transition-opacity disabled:opacity-40", isPerp && side === "short" ? "bg-loss" : "bg-gain")}>
        {busy ? "Placing order..." : label}
      </button>
      {!isPerp && <p className="text-xs text-paper/45">Meme coins trade like the real thing: buy and sell, no leverage, no shorting.</p>}
    </section>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "loss" }) {
  return <div className="flex justify-between gap-3"><dt className="text-paper/55">{k}</dt><dd className={cn("font-mono tabular-nums", tone === "loss" && "text-loss")}>{v}</dd></div>;
}
