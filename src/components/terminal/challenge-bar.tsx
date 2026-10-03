"use client";

import { Activity, Flag, ShieldAlert, Target, Wallet } from "lucide-react";
import { CHALLENGE, FLOOR_EQUITY, TARGET_EQUITY } from "@/lib/brand";
import { fmtSignedUsd, fmtUsd } from "@/lib/format";
import type { Challenge } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

/** The prop-firm heartbeat: equity, distance to the target, and how much loss room is left. */
export function ChallengeBar({ challenge, equity, onStart }: { challenge: Challenge | null; equity: number; onStart: () => void }) {
  if (!challenge) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gold/40 bg-gold/10 px-5 py-4">
        <p className="text-paper/90">
          <span className="font-display text-xl font-semibold text-gold">No active challenge.</span>{" "}
          Pay {fmtUsd(CHALLENGE.entryFeeUsd, 0)} to open a {fmtUsd(CHALLENGE.startBalance, 0)} account.
        </p>
        <button type="button" onClick={onStart} className="h-10 rounded-lg bg-gold px-5 font-semibold text-night hover:bg-gold/85">
          Start for {fmtUsd(CHALLENGE.entryFeeUsd, 0)}
        </button>
      </div>
    );
  }

  const start = challenge.startBalance;
  const progress = Math.min(1, Math.max(0, (equity - start) / (TARGET_EQUITY - start)));
  const room = Math.min(1, Math.max(0, (equity - FLOOR_EQUITY) / (start - FLOOR_EQUITY)));
  const pnl = equity - start;
  const open = challenge.positions.length;

  return (
    <section aria-label="Challenge progress" className="grid gap-4 rounded-xl border border-paper/10 bg-night-2 p-4 sm:p-5 lg:grid-cols-[auto_1fr_1fr] lg:gap-8">
      <div className="flex items-center gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-paper/55"><Wallet className="size-3.5" aria-hidden /> Equity</p>
          <p className="font-display text-[2.6rem] leading-none font-semibold tabular-nums">{fmtUsd(equity)}</p>
        </div>
        <div className="text-sm">
          <p className={cn("font-mono tabular-nums", pnl >= 0 ? "text-gain" : "text-loss")}>{fmtSignedUsd(pnl)}</p>
          <p className="flex items-center gap-1 text-paper/55"><Activity className="size-3.5" aria-hidden /> {open} open</p>
        </div>
        <StatusChip status={challenge.status} />
      </div>

      <Meter
        icon={<Target className="size-3.5" aria-hidden />}
        label="Profit target"
        value={progress}
        left={fmtUsd(start, 0)}
        right={`${fmtUsd(TARGET_EQUITY, 0)}${open ? ", close positions to pass" : ""}`}
        tone="gain"
      />
      <Meter
        icon={<ShieldAlert className="size-3.5" aria-hidden />}
        label="Loss room left"
        value={room}
        left={fmtUsd(FLOOR_EQUITY, 0)}
        right={`${fmtUsd(Math.max(0, equity - FLOOR_EQUITY))} to the limit`}
        tone={room < 0.3 ? "loss" : "gold"}
      />
    </section>
  );
}

function Meter({ icon, label, value, left, right, tone }: { icon: React.ReactNode; label: string; value: number; left: string; right: string; tone: "gain" | "loss" | "gold" }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs text-paper/55">{icon} {label}</p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper/10"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", tone === "gain" && "bg-gain", tone === "loss" && "bg-loss", tone === "gold" && "bg-gold")}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <p className="mt-1.5 flex justify-between gap-3 font-mono text-xs text-paper/55">
        <span>{left}</span>
        <span className="truncate text-right">{right}</span>
      </p>
    </div>
  );
}

function StatusChip({ status }: { status: Challenge["status"] }) {
  const map = {
    active: ["Active", "border-gain/40 text-gain"],
    passed: ["Funded", "border-gold/60 text-gold"],
    failed: ["Failed", "border-loss/50 text-loss"],
  } as const;
  const [text, cls] = map[status];
  return (
    <span className={cn("ml-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-semibold", cls)}>
      <Flag className="size-3.5" aria-hidden /> {text}
    </span>
  );
}
