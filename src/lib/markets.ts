export type AssetClass = "fx" | "crypto";

export interface Instrument {
  /** Stable id used in URLs, state keys and API payloads, e.g. "EURUSD". */
  id: string;
  /** Display symbol, e.g. "EUR/USD". */
  label: string;
  name: string;
  cls: AssetClass;
  /** Decimal places shown on the board. */
  decimals: number;
  /** Coinbase product id. Crypto only. */
  product?: string;
  /** ISO currency codes. FX only. */
  base?: string;
  quote?: string;
}

export const INSTRUMENTS: readonly Instrument[] = [
  { id: "EURUSD", label: "EUR/USD", name: "Euro / US dollar", cls: "fx", decimals: 5, base: "EUR", quote: "USD" },
  { id: "GBPUSD", label: "GBP/USD", name: "British pound / US dollar", cls: "fx", decimals: 5, base: "GBP", quote: "USD" },
  { id: "USDJPY", label: "USD/JPY", name: "US dollar / Japanese yen", cls: "fx", decimals: 3, base: "USD", quote: "JPY" },
  { id: "USDCHF", label: "USD/CHF", name: "US dollar / Swiss franc", cls: "fx", decimals: 5, base: "USD", quote: "CHF" },
  { id: "AUDUSD", label: "AUD/USD", name: "Australian dollar / US dollar", cls: "fx", decimals: 5, base: "AUD", quote: "USD" },
  { id: "USDCAD", label: "USD/CAD", name: "US dollar / Canadian dollar", cls: "fx", decimals: 5, base: "USD", quote: "CAD" },
  { id: "BTCUSD", label: "BTC/USD", name: "Bitcoin", cls: "crypto", decimals: 2, product: "BTC-USD" },
  { id: "ETHUSD", label: "ETH/USD", name: "Ethereum", cls: "crypto", decimals: 2, product: "ETH-USD" },
  { id: "SOLUSD", label: "SOL/USD", name: "Solana", cls: "crypto", decimals: 2, product: "SOL-USD" },
  { id: "XRPUSD", label: "XRP/USD", name: "XRP", cls: "crypto", decimals: 4, product: "XRP-USD" },
];

export const FX_INSTRUMENTS = INSTRUMENTS.filter((i) => i.cls === "fx");
export const CRYPTO_INSTRUMENTS = INSTRUMENTS.filter((i) => i.cls === "crypto");

const BY_ID = new Map(INSTRUMENTS.map((i) => [i.id, i]));
export function getInstrument(id: string): Instrument | undefined {
  return BY_ID.get(id);
}

/** A latest price for one instrument. */
export interface Quote {
  price: number;
  /** Percent change against the reference close/open. Null when unknown. */
  changePct: number | null;
  /** When the price was struck, ms since epoch. */
  ts: number;
}

/** Response of GET /api/fx. */
export interface FxPayload {
  /** "live" = real-time quote provider, "reference" = ECB daily reference rates. */
  mode: "live" | "reference";
  source: string;
  /** Provider timestamp of the newest rate, ms since epoch. */
  asOf: number;
  /** True when the provider failed and an older cached answer was served. */
  stale?: boolean;
  rates: Record<string, { price: number; prevClose: number | null }>;
}

/** Response of GET /api/history. Points are [ms since epoch, price]. */
export interface HistoryPayload {
  id: string;
  interval: "5m" | "1d";
  points: [number, number][];
}

const formatters = new Map<number, Intl.NumberFormat>();
export function formatPrice(value: number, decimals: number): string {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, f);
  }
  return f.format(value);
}

export function formatChange(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "n/a";
  const rounded = Math.abs(pct) < 0.005 ? 0 : pct;
  return `${rounded > 0 ? "+" : rounded < 0 ? "-" : ""}${Math.abs(rounded).toFixed(2)}%`;
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
