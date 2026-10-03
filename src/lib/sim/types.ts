import type { ChainId } from "./chains";

export type Side = "long" | "short";

export interface PerpPosition {
  id: string;
  kind: "perp";
  coin: string;
  side: Side;
  leverage: number;
  marginUsd: number;
  notionalUsd: number;
  qty: number;
  entryPrice: number;
  openFeeUsd: number;
  openedAt: number;
}

export interface MemePosition {
  id: string;
  kind: "meme";
  chain: ChainId;
  address: string;
  symbol: string;
  qty: number;
  costUsd: number;
  entryPrice: number;
  /** Pool liquidity when we bought. Used for exit slippage if no fresh quote exists. */
  liquidityUsd: number;
  openFeeUsd: number;
  openGasUsd: number;
  openedAt: number;
}

export type Position = PerpPosition | MemePosition;

export type CloseReason = "manual" | "liquidated" | "challenge_failed" | "challenge_passed";

export interface ClosedTrade {
  id: string;
  kind: "perp" | "meme";
  label: string;
  side: Side;
  leverage: number;
  entryPrice: number;
  exitPrice: number;
  pnlUsd: number;
  feesUsd: number;
  openedAt: number;
  closedAt: number;
  reason: CloseReason;
}

export type PaymentMethod = "crypto" | "paypal" | "bank";

export interface Challenge {
  id: string;
  userId: string;
  status: "active" | "passed" | "failed";
  startBalance: number;
  cash: number;
  positions: Position[];
  trades: ClosedTrade[];
  payment: {
    method: PaymentMethod;
    chain?: ChainId;
    reference: string;
    amountUsd: number;
    /** Always true in this build: no real payment is taken. */
    simulated: true;
  };
  createdAt: number;
  endedAt?: number;
}

export interface MemeQuote {
  price: number;
  liquidityUsd: number;
}

/** Current prices the engine marks positions against. */
export interface PriceBook {
  perps: Record<string, number>;
  /** Keyed by memeKey(chain, address). */
  memes: Record<string, MemeQuote>;
}

export const memeKey = (chain: ChainId, address: string) => `${chain}:${address}`;
