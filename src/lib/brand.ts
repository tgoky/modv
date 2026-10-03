/** The product name lives here so it is a one-line change. */
export const BRAND = {
  name: "Prerich",
  tagline: "Start with $1. Trade with $100.",
  description:
    "A prop firm for crypto traders. Pay $1, trade a $100 account on real futures and meme coin prices, and hit the target without breaking the loss limit.",
} as const;

/**
 * The challenge rules. Every number the UI shows about the rules comes from
 * here, and the simulation engine reads the same object, so the marketing page
 * and the enforcement can never drift apart.
 */
export const CHALLENGE = {
  entryFeeUsd: 1,
  startBalance: 100,
  /** Equity that must be reached (with no positions open) to pass. */
  profitTargetPct: 20,
  /** Equity at or below this fraction of loss fails the account. */
  maxLossPct: 15,
  maxLeverage: 20,
  minPositionUsd: 1,
  maxOpenPositions: 5,
  /** Simulated exchange taker fee on futures, charged on entry and exit. */
  perpTakerFeeBps: 4.5,
  /** Simulated DEX swap fee on meme coin buys and sells. */
  memeSwapFeeBps: 30,
  /** Share of profit the trader keeps once funded. */
  profitSplitPct: 80,
} as const;

export const TARGET_EQUITY = CHALLENGE.startBalance * (1 + CHALLENGE.profitTargetPct / 100);
export const FLOOR_EQUITY = CHALLENGE.startBalance * (1 - CHALLENGE.maxLossPct / 100);
