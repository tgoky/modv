import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { CHALLENGE } from "../brand";
import { PAYMENT_CHAINS, isChainId, type ChainId } from "./chains";
import { TradeError, closePosition, newChallenge, openMeme, openPerp, settle } from "./engine";
import { buildPriceBook, getMemeMarket } from "./prices";
import { createChallenge, getLatestChallenge, updateLatestChallenge } from "./store";
import type { Challenge, PaymentMethod, PriceBook, Side } from "./types";

/** Everything the terminal needs to draw itself, safe to send to the browser. */
export interface ChallengeState {
  challenge: Challenge | null;
  /** Prices the server used, so the first paint is consistent before live feeds connect. */
  book: PriceBook;
}

const heldMemes = (c: Challenge | undefined | null) =>
  (c?.positions ?? []).flatMap((p) => (p.kind === "meme" ? [{ chain: p.chain, address: p.address }] : []));

/**
 * Loads the user's latest challenge and applies the rules against current
 * prices. Rules are enforced lazily, when the account is next looked at. A
 * production build needs a background worker (for example Inngest) to check
 * accounts while the trader is away, otherwise a position could cross its
 * liquidation price and recover unseen.
 */
export async function loadState(userId: string): Promise<ChallengeState> {
  const latest = await getLatestChallenge(userId);
  const book = await buildPriceBook(heldMemes(latest));
  if (!latest || latest.status !== "active") return { challenge: latest ?? null, book };

  const settled = settle(latest, book, Date.now());
  if (settled === latest) return { challenge: latest, book };
  const saved = await updateLatestChallenge(userId, (c) => settle(c, book, Date.now()));
  return { challenge: saved, book };
}

async function mutate(
  userId: string,
  extraMemes: { chain: ChainId; address: string }[],
  apply: (c: Challenge, book: PriceBook, now: number) => Challenge,
): Promise<ChallengeState> {
  const latest = await getLatestChallenge(userId);
  if (!latest) throw new TradeError("Start a challenge first.");
  const book = await buildPriceBook([...heldMemes(latest), ...extraMemes]);
  const now = Date.now();
  const saved = await updateLatestChallenge(userId, (c) => settle(apply(settle(c, book, now), book, now), book, now));
  return { challenge: saved, book };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

export function tradePerp(userId: string, input: { coin: string; side: Side; leverage: number; marginUsd: number }) {
  if (input.side !== "long" && input.side !== "short") throw new TradeError("Pick long or short.");
  return mutate(userId, [], (c, book, now) =>
    openPerp(c, { coin: String(input.coin), side: input.side, leverage: num(input.leverage), marginUsd: num(input.marginUsd) }, book, now),
  );
}

export async function tradeMeme(userId: string, input: { chain: string; address: string; sizeUsd: number }) {
  if (!isChainId(input.chain)) throw new TradeError("Unsupported chain.");
  const chain = input.chain;
  const address = String(input.address);
  const market = await getMemeMarket(chain, address);
  if (!market) throw new TradeError("That token has no tradable pool right now.");
  return mutate(userId, [{ chain, address }], (c, book, now) =>
    openMeme(c, { chain, address, symbol: market.symbol, sizeUsd: num(input.sizeUsd) }, book, now),
  );
}

export function closeById(userId: string, positionId: string) {
  return mutate(userId, [], (c, book, now) => closePosition(c, String(positionId), book, now));
}

/**
 * Creates a challenge after the (simulated) entry payment. No money moves in
 * this build; replace this with verification of a real on-chain transfer or a
 * payment-provider webhook before charging anyone.
 */
export async function startChallenge(userId: string, method: PaymentMethod, chain?: string) {
  if (method !== "crypto" && method !== "paypal" && method !== "bank") throw new TradeError("Choose a payment method.");
  let payChain: ChainId | undefined;
  if (method === "crypto") {
    if (!chain || !isChainId(chain) || !PAYMENT_CHAINS.some((p) => p.id === chain)) {
      throw new TradeError("Choose a network to pay on.");
    }
    payChain = chain;
  }
  const hex = randomBytes(32).toString("hex");
  const reference =
    method === "crypto" ? `0x${hex}` : method === "paypal" ? `PP-${hex.slice(0, 12).toUpperCase()}` : `PRE-${hex.slice(0, 8).toUpperCase()}`;

  const result = await createChallenge(
    newChallenge({
      id: randomUUID(),
      userId,
      now: Date.now(),
      payment: { method, chain: payChain, reference, amountUsd: CHALLENGE.entryFeeUsd, simulated: true },
    }),
  );
  if (result === "already_active") throw new TradeError("You already have an active challenge.");
  return loadState(userId);
}

export { TradeError };
