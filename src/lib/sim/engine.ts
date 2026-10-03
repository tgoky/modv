import { CHALLENGE, FLOOR_EQUITY, TARGET_EQUITY } from "../brand";
import { CHAINS, type ChainId } from "./chains";
import {
  memeKey,
  type Challenge,
  type ClosedTrade,
  type CloseReason,
  type MemePosition,
  type PerpPosition,
  type Position,
  type PriceBook,
  type Side,
} from "./types";

/** An error whose message is safe to show to the trader. */
export class TradeError extends Error {}

const MAINTENANCE = 0.005; // 0.5% of notional
const round = (n: number) => Math.round(n * 1e8) / 1e8;

/** Half-spread we charge per fill, by coin. Majors are tight, small caps are not. */
export function perpSlipBps(coin: string): number {
  if (coin === "BTC" || coin === "ETH") return 1;
  if (coin === "SOL" || coin === "XRP" || coin === "DOGE" || coin === "HYPE") return 3;
  return 8;
}

// ---------- futures ----------

export function perpLiqPrice(side: Side, entry: number, leverage: number): number {
  return side === "long"
    ? entry * (1 - 1 / leverage + MAINTENANCE)
    : entry * (1 + 1 / leverage - MAINTENANCE);
}

export function perpPnl(p: PerpPosition, mark: number): number {
  return (p.side === "long" ? 1 : -1) * (mark - p.entryPrice) * p.qty;
}

/** Value of a futures position if closed at the mark, before the closing fee. Never below zero. */
function perpValue(p: PerpPosition, mark: number): number {
  return Math.max(0, p.marginUsd + perpPnl(p, mark));
}

function perpFee(notional: number): number {
  return (notional * CHALLENGE.perpTakerFeeBps) / 1e4;
}

// ---------- meme coins ----------

/** Constant-product approximation: the quote-side reserve is half the pool's USD liquidity. */
export function memeBuy(sizeUsd: number, price: number, liquidityUsd: number, chain: ChainId) {
  const reserve = liquidityUsd / 2;
  const impact = sizeUsd / reserve;
  const execPrice = price * (1 + impact);
  const feeUsd = (sizeUsd * CHALLENGE.memeSwapFeeBps) / 1e4;
  const qty = (sizeUsd - feeUsd) / execPrice;
  return { execPrice, qty, feeUsd, gasUsd: CHAINS[chain].gasUsd, impact };
}

export function memeSell(qty: number, price: number, liquidityUsd: number, chain: ChainId) {
  const reserve = liquidityUsd / 2;
  const value = qty * price;
  const gross = value * (reserve / (reserve + value));
  const feeUsd = (gross * CHALLENGE.memeSwapFeeBps) / 1e4;
  return {
    execPrice: gross / qty,
    proceedsUsd: gross - feeUsd,
    feeUsd,
    gasUsd: CHAINS[chain].gasUsd,
    impact: 1 - reserve / (reserve + value),
  };
}

function memeQuoteFor(p: MemePosition, book: PriceBook) {
  return book.memes[memeKey(p.chain, p.address)];
}

/** What a meme position would put back in cash right now, after impact, fee and gas. */
function memeExitValue(p: MemePosition, book: PriceBook): number {
  const q = memeQuoteFor(p, book)!;
  const s = memeSell(p.qty, q.price, q.liquidityUsd, p.chain);
  return Math.max(0, s.proceedsUsd - s.gasUsd);
}

// ---------- account maths ----------

export function positionValue(p: Position, book: PriceBook): number {
  if (p.kind === "perp") {
    const mark = book.perps[p.coin];
    return mark === undefined ? p.marginUsd : perpValue(p, mark);
  }
  return memeQuoteFor(p, book) ? memeExitValue(p, book) : p.costUsd;
}

export function positionPnl(p: Position, book: PriceBook): number | null {
  if (p.kind === "perp") {
    const mark = book.perps[p.coin];
    return mark === undefined ? null : Math.max(-p.marginUsd, perpPnl(p, mark));
  }
  return memeQuoteFor(p, book) ? memeExitValue(p, book) - p.costUsd : null;
}

export function equity(c: Challenge, book: PriceBook): number {
  return c.cash + c.positions.reduce((sum, p) => sum + positionValue(p, book), 0);
}

// ---------- actions ----------

let counter = 0;
const newId = (now: number) => `${now.toString(36)}${(counter++).toString(36)}`;

function assertActive(c: Challenge) {
  if (c.status !== "active") throw new TradeError("This challenge has ended.");
}

function assertRoom(c: Challenge) {
  if (c.positions.length >= CHALLENGE.maxOpenPositions) {
    throw new TradeError(`You can hold at most ${CHALLENGE.maxOpenPositions} positions at once.`);
  }
}

export function openPerp(
  c: Challenge,
  input: { coin: string; side: Side; leverage: number; marginUsd: number },
  book: PriceBook,
  now: number,
): Challenge {
  assertActive(c);
  assertRoom(c);
  const mid = book.perps[input.coin];
  if (!mid || !(mid > 0)) throw new TradeError("No live price for that market right now.");
  const { side: dir, leverage, marginUsd, coin } = input;
  if (!Number.isFinite(leverage) || leverage < 1 || leverage > CHALLENGE.maxLeverage) {
    throw new TradeError(`Leverage must be between 1x and ${CHALLENGE.maxLeverage}x.`);
  }
  if (!Number.isFinite(marginUsd) || marginUsd < CHALLENGE.minPositionUsd) {
    throw new TradeError(`Minimum margin is $${CHALLENGE.minPositionUsd}.`);
  }

  const notionalUsd = marginUsd * leverage;
  const openFeeUsd = perpFee(notionalUsd);
  if (marginUsd + openFeeUsd > c.cash + 1e-9) throw new TradeError("Not enough cash for that margin and fee.");

  const slip = perpSlipBps(coin) / 1e4;
  const entryPrice = dir === "long" ? mid * (1 + slip) : mid * (1 - slip);
  const position: PerpPosition = {
    id: newId(now),
    kind: "perp",
    coin,
    side: dir,
    leverage,
    marginUsd: round(marginUsd),
    notionalUsd: round(notionalUsd),
    qty: notionalUsd / entryPrice,
    entryPrice,
    openFeeUsd: round(openFeeUsd),
    openedAt: now,
  };
  return { ...c, cash: round(c.cash - marginUsd - openFeeUsd), positions: [...c.positions, position] };
}

export function openMeme(
  c: Challenge,
  input: { chain: ChainId; address: string; symbol: string; sizeUsd: number },
  book: PriceBook,
  now: number,
): Challenge {
  assertActive(c);
  assertRoom(c);
  const q = book.memes[memeKey(input.chain, input.address)];
  if (!q || !(q.price > 0) || !(q.liquidityUsd > 0)) throw new TradeError("No live price for that token right now.");
  if (c.positions.some((p) => p.kind === "meme" && p.chain === input.chain && p.address === input.address)) {
    throw new TradeError("You already hold this token. Close it first.");
  }
  if (!Number.isFinite(input.sizeUsd) || input.sizeUsd < CHALLENGE.minPositionUsd) {
    throw new TradeError(`Minimum size is $${CHALLENGE.minPositionUsd}.`);
  }
  const fill = memeBuy(input.sizeUsd, q.price, q.liquidityUsd, input.chain);
  if (input.sizeUsd + fill.gasUsd > c.cash + 1e-9) throw new TradeError("Not enough cash for that size plus gas.");
  if (fill.impact > 0.1) throw new TradeError("That size would move this pool by more than 10%. Trade smaller.");

  const position: MemePosition = {
    id: newId(now),
    kind: "meme",
    chain: input.chain,
    address: input.address,
    symbol: input.symbol,
    qty: fill.qty,
    costUsd: round(input.sizeUsd + fill.gasUsd),
    entryPrice: fill.execPrice,
    liquidityUsd: q.liquidityUsd,
    openFeeUsd: round(fill.feeUsd),
    openGasUsd: fill.gasUsd,
    openedAt: now,
  };
  return { ...c, cash: round(c.cash - input.sizeUsd - fill.gasUsd), positions: [...c.positions, position] };
}

function closeOne(c: Challenge, p: Position, book: PriceBook, now: number, reason: CloseReason): Challenge {
  let proceeds = 0;
  let trade: ClosedTrade;

  if (p.kind === "perp") {
    const mid = book.perps[p.coin] ?? p.entryPrice;
    const slip = perpSlipBps(p.coin) / 1e4;
    const exitPrice = reason === "liquidated" ? mid : p.side === "long" ? mid * (1 - slip) : mid * (1 + slip);
    const pnl = Math.max(-p.marginUsd, perpPnl(p, exitPrice));
    const closeFee = reason === "liquidated" ? 0 : perpFee(p.notionalUsd);
    proceeds = reason === "liquidated" ? 0 : Math.max(0, p.marginUsd + pnl - closeFee);
    trade = {
      id: p.id, kind: "perp", label: `${p.coin}-PERP`, side: p.side, leverage: p.leverage,
      entryPrice: p.entryPrice, exitPrice,
      pnlUsd: round(reason === "liquidated" ? -p.marginUsd - p.openFeeUsd : pnl - closeFee - p.openFeeUsd),
      feesUsd: round(p.openFeeUsd + closeFee), openedAt: p.openedAt, closedAt: now, reason,
    };
  } else {
    const q = memeQuoteFor(p, book);
    const s = memeSell(p.qty, q?.price ?? p.entryPrice, q?.liquidityUsd ?? p.liquidityUsd, p.chain);
    proceeds = Math.max(0, s.proceedsUsd - s.gasUsd);
    trade = {
      id: p.id, kind: "meme", label: p.symbol, side: "long", leverage: 1,
      entryPrice: p.entryPrice, exitPrice: s.execPrice,
      pnlUsd: round(proceeds - p.costUsd),
      feesUsd: round(p.openFeeUsd + s.feeUsd + p.openGasUsd + s.gasUsd),
      openedAt: p.openedAt, closedAt: now, reason,
    };
  }

  return {
    ...c,
    cash: round(c.cash + proceeds),
    positions: c.positions.filter((x) => x.id !== p.id),
    trades: [trade, ...c.trades],
  };
}

export function closePosition(c: Challenge, id: string, book: PriceBook, now: number): Challenge {
  assertActive(c);
  const p = c.positions.find((x) => x.id === id);
  if (!p) throw new TradeError("That position is already closed.");
  return settle(closeOne(c, p, book, now, "manual"), book, now);
}

/**
 * Applies the rules to the current prices: liquidates futures that crossed
 * their liquidation price, fails the account at the loss limit, and passes it
 * once the target is banked with nothing left open. Safe to call repeatedly.
 */
export function settle(c: Challenge, book: PriceBook, now: number): Challenge {
  if (c.status !== "active") return c;
  let next = c;

  for (const p of c.positions) {
    if (p.kind !== "perp") continue;
    const mark = book.perps[p.coin];
    if (mark === undefined) continue;
    const liq = perpLiqPrice(p.side, p.entryPrice, p.leverage);
    if (p.side === "long" ? mark <= liq : mark >= liq) next = closeOne(next, p, book, now, "liquidated");
  }

  if (equity(next, book) <= FLOOR_EQUITY + 1e-9) {
    for (const p of next.positions) next = closeOne(next, p, book, now, "challenge_failed");
    return { ...next, status: "failed", endedAt: now };
  }

  if (next.positions.length === 0 && next.cash >= TARGET_EQUITY - 1e-9) {
    return { ...next, status: "passed", endedAt: now };
  }
  return next;
}

/** A fresh challenge, created after the entry fee is paid. */
export function newChallenge(input: {
  id: string;
  userId: string;
  payment: Challenge["payment"];
  now: number;
}): Challenge {
  return {
    id: input.id,
    userId: input.userId,
    status: "active",
    startBalance: CHALLENGE.startBalance,
    cash: CHALLENGE.startBalance,
    positions: [],
    trades: [],
    payment: input.payment,
    createdAt: input.now,
  };
}
