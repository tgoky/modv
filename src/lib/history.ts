import "server-only";
import { fetchFrankfurterSeries, priceFromUsdRates } from "./fx-providers";
import { getInstrument, type HistoryPayload, type Instrument } from "./markets";

const CRYPTO_TTL_MS = 60_000;
const FX_TTL_MS = 60 * 60_000;

const cache = new Map<string, { at: number; data: HistoryPayload }>();

/** Last 300 five-minute candles (about 25 hours). Public endpoint, no key. */
async function cryptoHistory(inst: Instrument): Promise<HistoryPayload> {
  const url = `https://api.exchange.coinbase.com/products/${inst.product}/candles?granularity=300`;
  const res = await fetch(url, {
    // Coinbase rejects requests that carry no User-Agent.
    headers: { accept: "application/json", "user-agent": "modv/0.1" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Coinbase candles responded ${res.status}`);
  // Rows are [time (s), low, high, open, close, volume], newest first.
  const rows = (await res.json()) as number[][];
  const points = rows
    .map((r) => [r[0] * 1000, r[4]] as [number, number])
    .filter(([t, v]) => Number.isFinite(t) && Number.isFinite(v))
    .sort((a, b) => a[0] - b[0]);
  return { id: inst.id, interval: "5m", points };
}

/** Roughly six weeks of ECB daily reference rates. */
async function fxHistory(inst: Instrument): Promise<HistoryPayload> {
  const series = await fetchFrankfurterSeries(45);
  const points: [number, number][] = [];
  for (const { date, rates } of series) {
    const price = priceFromUsdRates(inst, rates);
    if (price !== null) points.push([Date.parse(`${date}T00:00:00Z`), price]);
  }
  return { id: inst.id, interval: "1d", points };
}

/** Returns null for an unknown market id. Throws when the upstream provider fails. */
export async function getHistory(id: string): Promise<HistoryPayload | null> {
  const inst = getInstrument(id);
  if (!inst) return null;

  const hit = cache.get(id);
  const ttl = inst.cls === "crypto" ? CRYPTO_TTL_MS : FX_TTL_MS;
  if (hit && Date.now() - hit.at < ttl) return hit.data;

  try {
    const data = inst.cls === "crypto" ? await cryptoHistory(inst) : await fxHistory(inst);
    cache.set(id, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (hit) return hit.data; // serve stale rather than an empty chart
    throw err;
  }
}
