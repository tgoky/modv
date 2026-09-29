import "server-only";
import { fetchFrankfurterRates, fetchTwelveDataRates } from "./fx-providers";
import type { FxPayload } from "./markets";

/*
 * Twelve Data's free plan allows 800 credits a day and each of the 6 pairs costs
 * one credit per call, so we cache hard. Every browser polls /api/fx, but the
 * provider is only called when the cache is older than the TTL below.
 * Set FX_CACHE_SECONDS to tune it (minimum 5).
 */
const LIVE_TTL_MS = 90_000;
const REFERENCE_TTL_MS = 15 * 60_000;
/** After a Twelve Data failure, wait this long before trying it again. */
const LIVE_RETRY_MS = 5 * 60_000;

let cache: { at: number; data: FxPayload } | null = null;
let inflight: Promise<FxPayload> | null = null;
let liveBlockedUntil = 0;

function liveTtl(): number {
  const seconds = Number(process.env.FX_CACHE_SECONDS);
  return Number.isFinite(seconds) && seconds >= 5 ? seconds * 1000 : LIVE_TTL_MS;
}

function ttlFor(data: FxPayload, hasKey: boolean): number {
  if (data.mode === "live") return liveTtl();
  // With a key configured but currently falling back, recheck the live provider sooner.
  return hasKey ? Math.min(REFERENCE_TTL_MS, LIVE_RETRY_MS) : REFERENCE_TTL_MS;
}

async function load(apiKey: string | undefined): Promise<FxPayload> {
  try {
    let data: FxPayload | null = null;
    if (apiKey && Date.now() >= liveBlockedUntil) {
      try {
        data = await fetchTwelveDataRates(apiKey);
      } catch (err) {
        liveBlockedUntil = Date.now() + LIVE_RETRY_MS;
        console.warn("[fx] live provider failed, using ECB reference rates:", err);
      }
    }
    data ??= await fetchFrankfurterRates();
    cache = { at: Date.now(), data };
    return data;
  } catch (err) {
    if (cache) return { ...cache.data, stale: true };
    throw err;
  }
}

export async function getFxRates(): Promise<FxPayload> {
  const apiKey = process.env.TWELVE_DATA_API_KEY || undefined;
  if (cache && Date.now() - cache.at < ttlFor(cache.data, !!apiKey)) return cache.data;
  if (!inflight) {
    inflight = load(apiKey).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
