"use server";

import { requireUser } from "@/lib/auth/dal";
import { TradeError } from "@/lib/sim/engine";
import * as service from "@/lib/sim/service";
import type { ChallengeState } from "@/lib/sim/service";
import type { PaymentMethod, Side } from "@/lib/sim/types";

export type ActionResult = { ok: true; state: ChallengeState } | { ok: false; error: string };

async function run(fn: (userId: string) => Promise<ChallengeState>): Promise<ActionResult> {
  const user = await requireUser();
  try {
    return { ok: true, state: await fn(user.id) };
  } catch (err) {
    if (err instanceof TradeError) return { ok: false, error: err.message };
    console.error("[trade]", err);
    return { ok: false, error: "Something went wrong. Try again in a moment." };
  }
}

export async function startChallengeAction(method: PaymentMethod, chain?: string): Promise<ActionResult> {
  return run((id) => service.startChallenge(id, method, chain));
}

export async function openPerpAction(input: {
  coin: string;
  side: Side;
  leverage: number;
  marginUsd: number;
}): Promise<ActionResult> {
  return run((id) => service.tradePerp(id, input));
}

export async function openMemeAction(input: { chain: string; address: string; sizeUsd: number }): Promise<ActionResult> {
  return run((id) => service.tradeMeme(id, input));
}

export async function closePositionAction(positionId: string): Promise<ActionResult> {
  return run((id) => service.closeById(id, positionId));
}

/** Re-check the rules against live prices; the terminal calls this when it sees a limit crossed. */
export async function syncAction(): Promise<ActionResult> {
  return run((id) => service.loadState(id));
}
