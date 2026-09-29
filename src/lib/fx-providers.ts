import "server-only";
import { FX_INSTRUMENTS, type FxPayload, type Instrument } from "./markets";

const FRANKFURTER = "https://api.frankfurter.dev/v1";
const TWELVE_DATA = "https://api.twelvedata.com";

/** Units of a currency per 1 USD. */
export type UsdRates = Record<string, number>;

/** Every non-USD currency the board needs, derived from the instrument list. */
const CURRENCIES = [
  ...new Set(
    FX_INSTRUMENTS.flatMap((i) => [i.base, i.quote]).filter(
      (c): c is string => !!c && c !== "USD",
    ),
  ),
];

/** Convert USD-based rates into the price of one FX instrument. */
export function priceFromUsdRates(inst: Instrument, rates: UsdRates): number | null {
  if (inst.base === "USD") {
    const r = rates[inst.quote!];
    return r > 0 ? r : null;
  }
  const r = rates[inst.base!];
  return r > 0 ? 1 / r : null;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const utcMidnight = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** Daily ECB reference rates, oldest first, for roughly the last `days` days. */
export async function fetchFrankfurterSeries(
  days: number,
): Promise<{ date: string; rates: UsdRates }[]> {
  const from = isoDate(new Date(Date.now() - days * 86_400_000));
  const url = `${FRANKFURTER}/${from}..?base=USD&symbols=${CURRENCIES.join(",")}`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`);
  const json = (await res.json()) as { rates?: Record<string, UsdRates> };
  const rows = Object.entries(json.rates ?? {})
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, rates]) => ({ date, rates }));
  if (rows.length === 0) throw new Error("Frankfurter returned no rates");
  return rows;
}

/** Keyless fallback. Rates are published once per working day. */
export async function fetchFrankfurterRates(): Promise<FxPayload> {
  const series = await fetchFrankfurterSeries(7);
  const latest = series[series.length - 1];
  const previous = series.length > 1 ? series[series.length - 2] : null;

  const rates: FxPayload["rates"] = {};
  for (const inst of FX_INSTRUMENTS) {
    const price = priceFromUsdRates(inst, latest.rates);
    if (price === null) continue;
    rates[inst.id] = {
      price,
      prevClose: previous ? priceFromUsdRates(inst, previous.rates) : null,
    };
  }
  return {
    mode: "reference",
    source: "the European Central Bank (daily reference rates)",
    asOf: utcMidnight(latest.date),
    rates,
  };
}

interface TwelveDataQuote {
  status?: string;
  close?: string;
  previous_close?: string;
  timestamp?: number;
}

/** Real-time quotes. Needs TWELVE_DATA_API_KEY. One credit per symbol per call. */
export async function fetchTwelveDataRates(apiKey: string): Promise<FxPayload> {
  const symbols = FX_INSTRUMENTS.map((i) => i.label).join(",");
  const url = `${TWELVE_DATA}/quote?symbol=${symbols}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Twelve Data responded ${res.status}`);

  const json = (await res.json()) as Record<string, unknown>;
  // Errors such as an exhausted daily quota arrive as HTTP 200 with a status field.
  if (json.status === "error") {
    throw new Error(`Twelve Data: ${String(json.message ?? json.code ?? "error")}`);
  }

  const rates: FxPayload["rates"] = {};
  let newest = 0;
  for (const inst of FX_INSTRUMENTS) {
    const q = json[inst.label] as TwelveDataQuote | undefined;
    if (!q || q.status === "error") continue;
    const price = Number(q.close);
    if (!Number.isFinite(price) || price <= 0) continue;
    const prev = Number(q.previous_close);
    rates[inst.id] = { price, prevClose: prev > 0 ? prev : null };
    if (typeof q.timestamp === "number") newest = Math.max(newest, q.timestamp * 1000);
  }
  if (Object.keys(rates).length === 0) throw new Error("Twelve Data returned no usable quotes");

  return {
    mode: "live",
    source: "Twelve Data",
    asOf: newest || Date.now(),
    rates,
  };
}
