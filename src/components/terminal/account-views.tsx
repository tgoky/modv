"use client";

import { Banknote, Coins, Percent, Receipt, ScrollText, ShieldCheck, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { CHALLENGE, FLOOR_EQUITY, TARGET_EQUITY } from "@/lib/brand";
import { fmtPrice, fmtSignedUsd, fmtUsd, shortAddress } from "@/lib/format";
import { CHAINS } from "@/lib/sim/chains";
import type { Challenge, ClosedTrade } from "@/lib/sim/types";
import { cn } from "@/lib/utils";
import { panel } from "./types";

const REASON: Record<ClosedTrade["reason"], string> = {
  manual: "Closed by you",
  liquidated: "Liquidated",
  challenge_failed: "Loss limit hit",
  challenge_passed: "Target banked",
};

export function AccountView({ challenge, equity, onStart }: { challenge: Challenge | null; equity: number; onStart: () => void }) {
  if (!challenge) {
    return (
      <div className={cn(panel, "grid place-items-center gap-4 p-10 text-center")}>
        <Trophy className="size-10 text-gold" aria-hidden />
        <h2 className="font-display text-3xl font-semibold">No challenge yet</h2>
        <p className="max-w-[40ch] text-paper/60">Your stats, payment record and rules progress will appear here once you start.</p>
        <button onClick={onStart} className="h-11 rounded-lg bg-gold px-6 font-semibold text-night hover:bg-gold/85">Start for {fmtUsd(CHALLENGE.entryFeeUsd, 0)}</button>
      </div>
    );
  }

  const trades = challenge.trades;
  const wins = trades.filter((t) => t.pnlUsd > 0).length;
  const best = trades.reduce<ClosedTrade | null>((a, t) => (!a || t.pnlUsd > a.pnlUsd ? t : a), null);
  const worst = trades.reduce<ClosedTrade | null>((a, t) => (!a || t.pnlUsd < a.pnlUsd ? t : a), null);
  const fees = trades.reduce((s, t) => s + t.feesUsd, 0);
  const net = equity - challenge.startBalance;
  const stats = [
    { icon: Receipt, k: "Closed trades", v: String(trades.length) },
    { icon: Percent, k: "Win rate", v: trades.length ? `${Math.round((wins / trades.length) * 100)}%` : "n/a" },
    { icon: TrendingUp, k: "Best trade", v: best ? fmtSignedUsd(best.pnlUsd) : "n/a", tone: "gain" },
    { icon: TrendingDown, k: "Worst trade", v: worst ? fmtSignedUsd(worst.pnlUsd) : "n/a", tone: "loss" },
    { icon: Coins, k: "Fees and gas paid", v: fmtUsd(fees) },
    { icon: Banknote, k: "Net result", v: fmtSignedUsd(net), tone: net >= 0 ? "gain" : "loss" },
  ] as const;
  const p = challenge.payment;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className={cn(panel, "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold">Your challenge</h2>
          <span className={cn("stamp-in inline-block -rotate-[9deg] rounded-md border-[3px] px-3 py-1 font-display text-2xl font-bold tracking-widest uppercase",
            challenge.status === "active" && "border-gain text-gain", challenge.status === "passed" && "border-gold text-gold", challenge.status === "failed" && "border-stamp text-stamp")}>
            {challenge.status === "passed" ? "Funded" : challenge.status}
          </span>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((s) => (
            <div key={s.k} className="rounded-lg bg-night p-4">
              <dt className="flex items-center gap-1.5 text-xs text-paper/55"><s.icon className="size-3.5" aria-hidden /> {s.k}</dt>
              <dd className={cn("mt-1 font-display text-2xl font-semibold tabular-nums", "tone" in s && (s.tone === "gain" ? "text-gain" : "text-loss"))}>{s.v}</dd>
            </div>
          ))}
        </dl>
        {challenge.status !== "active" && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-paper/10 p-4">
            <p className="text-paper/70">{challenge.status === "passed" ? "You hit the target. Nice." : "The loss limit ended this one. It happens to most people."}</p>
            <button onClick={onStart} className="h-10 rounded-lg bg-gold px-5 font-semibold text-night hover:bg-gold/85">Start another for {fmtUsd(CHALLENGE.entryFeeUsd, 0)}</button>
          </div>
        )}
      </section>

      <section className={cn(panel, "p-5 sm:p-6")}>
        <h3 className="flex items-center gap-2 font-display text-xl font-semibold"><ShieldCheck className="size-4 text-gold" aria-hidden /> Entry payment</h3>
        <dl className="mt-3 divide-y divide-paper/[0.07] text-sm">
          {[
            ["Method", p.method === "crypto" ? `Crypto on ${p.chain ? CHAINS[p.chain].label : ""}` : p.method === "paypal" ? "PayPal" : "Bank transfer"],
            ["Amount", fmtUsd(p.amountUsd)],
            ["Reference", shortAddress(p.reference)],
            ["Started", new Date(challenge.createdAt).toLocaleString()],
            ["Status", p.simulated ? "Demo, no money moved" : "Paid"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-paper/55">{k}</dt><dd className="text-right font-mono">{v}</dd></div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export function HistoryView({ trades }: { trades: ClosedTrade[] }) {
  return (
    <section className={cn(panel, "p-5 sm:p-6")}>
      <h2 className="flex items-center gap-2 font-display text-3xl font-semibold">Trade history</h2>
      {trades.length === 0 ? (
        <p className="mt-4 text-paper/55">Closed trades will show up here with their fees and how they ended.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-paper/45"><tr>
              <th className="pb-2 font-medium">Market</th><th className="pb-2 font-medium">Entry</th><th className="pb-2 font-medium">Exit</th>
              <th className="pb-2 font-medium">Fees</th><th className="pb-2 font-medium">How it ended</th><th className="pb-2 text-right font-medium">P/L</th>
            </tr></thead>
            <tbody className="divide-y divide-paper/[0.07] font-mono tabular-nums">
              {trades.map((t) => (
                <tr key={t.id}>
                  <td className="py-2.5 pr-3 font-sans"><span className="font-display text-base font-semibold">{t.label}</span>{" "}
                    <span className={cn("text-xs font-semibold", t.kind === "perp" ? (t.side === "long" ? "text-gain" : "text-loss") : "text-paper/55")}>{t.kind === "perp" ? `${t.side} ${t.leverage}x` : "spot"}</span></td>
                  <td className="py-2.5 pr-3">${fmtPrice(t.entryPrice)}</td><td className="py-2.5 pr-3">${fmtPrice(t.exitPrice)}</td>
                  <td className="py-2.5 pr-3">{fmtUsd(t.feesUsd)}</td>
                  <td className="py-2.5 pr-3 font-sans text-paper/70">{REASON[t.reason]}</td>
                  <td className={cn("py-2.5 text-right", t.pnlUsd >= 0 ? "text-gain" : "text-loss")}>{fmtSignedUsd(t.pnlUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function RulesView() {
  const rows: [string, string][] = [
    ["Account size", fmtUsd(CHALLENGE.startBalance, 0)],
    ["Profit target", `${fmtUsd(TARGET_EQUITY, 0)} equity, with every position closed`],
    ["Loss limit", `${fmtUsd(FLOOR_EQUITY, 0)} equity, checked on live prices`],
    ["Futures", `Long or short up to ${CHALLENGE.maxLeverage}x, ${(CHALLENGE.perpTakerFeeBps / 100).toFixed(3)}% fee each side`],
    ["Meme coins", `Spot only, ${(CHALLENGE.memeSwapFeeBps / 100).toFixed(2)}% swap fee, simulated gas per swap, slippage from real pool liquidity`],
    ["Open positions", `${CHALLENGE.maxOpenPositions} at a time`],
    ["Liquidation", "Futures close at zero if price reaches the liquidation level. That loss counts against the loss limit."],
    ["Pass", "Reach the target and close everything to become funded"],
  ];
  return (
    <section className={cn(panel, "p-5 sm:p-6")}>
      <h2 className="flex items-center gap-2 font-display text-3xl font-semibold"><ScrollText className="size-6 text-gold" aria-hidden /> Rules</h2>
      <dl className="mt-4 divide-y divide-paper/[0.07]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-6"><dt className="text-paper/55">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </section>
  );
}
