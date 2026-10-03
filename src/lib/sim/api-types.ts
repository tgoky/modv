import type { ChainId } from "./chains";

export interface PerpMarket {
  coin: string;
  label: string;
  price: number;
  prevDayPx: number;
  changePct: number;
  volumeUsd: number;
  /** Hourly funding rate as a fraction, e.g. 0.0000125. */
  funding: number;
  maxLeverage: number;
}

export interface MemeMarket {
  chain: ChainId;
  address: string;
  pairAddress: string;
  symbol: string;
  name: string;
  priceUsd: number;
  liquidityUsd: number;
  volume24h: number;
  change24h: number | null;
  change1h: number | null;
  fdv: number | null;
  dexId: string;
  imageUrl: string | null;
  pairCreatedAt: number | null;
}

export interface CandlePayload {
  interval: string;
  /** [ms since epoch, close] oldest first. */
  points: [number, number][];
}

/** "kPEPE" is Hyperliquid's price per 1,000 PEPE. Show it the way other venues do. */
export function perpLabel(coin: string): string {
  return /^k[A-Z]/.test(coin) ? `1000${coin.slice(1)}` : coin;
}
