import "server-only";
import { CHAINS, CHAIN_LIST, isChainId, type ChainId } from "./chains";
import { perpLabel, type CandlePayload, type MemeMarket, type PerpMarket } from "./api-types";
import { memeKey, type MemeQuote, type PriceBook } from "./types";

// Overridable so the whole server path can be exercised against local fakes.
const HL_INFO = process.env.HYPERLIQUID_INFO_URL ?? "https://api.hyperliquid.xyz/info";
const DEX = process.env.DEXSCREENER_URL ?? "https://api.dexscreener.com";
const GECKO = process.env.GECKOTERMINAL_URL ?? "https://api.geckoterminal.com/api/v2";

/** Perp markets we list, in display order. Only those Hyperliquid actually has are shown. */
const PERP_COINS = [
  "BTC", "ETH", "SOL", "HYPE", "DOGE", "WIF", "kPEPE", "kBONK", "POPCAT", "FARTCOIN",
  "PENGU", "TRUMP", "SUI", "XRP", "AVAX", "LINK",
];

// ---------- tiny cache with request coalescing and stale-on-error ----------

const store = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = load()
      .then((value) => {
        store.set(key, { at: Date.now(), value });
        return value;
      })
      .catch((err) => {
        if (hit) return hit.value as T; // serve stale rather than fail the page
        throw err;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { accept: "application/json", "content-type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return (await res.json()) as T;
}

// ---------- futures: Hyperliquid ----------

interface HlMeta {
  universe: { name: string; maxLeverage: number; isDelisted?: boolean }[];
}
interface HlCtx {
  funding: string;
  prevDayPx: string;
  dayNtlVlm: string;
  markPx: string;
  midPx?: string | null;
}

export function getPerpMarkets(): Promise<PerpMarket[]> {
  return cached("perp-markets", 5_000, async () => {
    const [meta, ctxs] = await getJson<[HlMeta, HlCtx[]]>(HL_INFO, {
      method: "POST",
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    });
    const byName = new Map(meta.universe.map((u, i) => [u.name, { u, ctx: ctxs[i] }]));
    const out: PerpMarket[] = [];
    for (const coin of PERP_COINS) {
      const e = byName.get(coin);
      if (!e || e.u.isDelisted) continue;
      const price = Number(e.ctx.midPx ?? e.ctx.markPx);
      const prev = Number(e.ctx.prevDayPx);
      if (!(price > 0)) continue;
      out.push({
        coin,
        label: perpLabel(coin),
        price,
        prevDayPx: prev,
        changePct: prev > 0 ? ((price - prev) / prev) * 100 : 0,
        volumeUsd: Number(e.ctx.dayNtlVlm) || 0,
        funding: Number(e.ctx.funding) || 0,
        maxLeverage: e.u.maxLeverage,
      });
    }
    return out;
  });
}

/** Mid prices for every listed perp. Trades are always priced from this, server side. */
export function getPerpMids(): Promise<Record<string, number>> {
  return cached("perp-mids", 1_500, async () => {
    const mids = await getJson<Record<string, string>>(HL_INFO, {
      method: "POST",
      body: JSON.stringify({ type: "allMids" }),
    });
    const out: Record<string, number> = {};
    for (const coin of PERP_COINS) {
      const n = Number(mids[coin]);
      if (n > 0) out[coin] = n;
    }
    return out;
  });
}

// ---------- meme coins: DexScreener ----------

interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h1?: number; h24?: number };
  fdv?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
}

function toMarket(pair: DexPair, chain: ChainId): MemeMarket | null {
  const price = Number(pair.priceUsd);
  const liq = pair.liquidity?.usd ?? 0;
  if (!(price > 0) || !(liq > 0)) return null;
  return {
    chain,
    address: pair.baseToken.address,
    pairAddress: pair.pairAddress,
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    priceUsd: price,
    liquidityUsd: liq,
    volume24h: pair.volume?.h24 ?? 0,
    change24h: pair.priceChange?.h24 ?? null,
    change1h: pair.priceChange?.h1 ?? null,
    fdv: pair.fdv ?? null,
    dexId: pair.dexId,
    imageUrl: pair.info?.imageUrl ?? null,
    pairCreatedAt: pair.pairCreatedAt ?? null,
  };
}

/** For each token, the pool with the most liquidity (the one a trader would actually use). */
async function fetchTokens(chain: ChainId, addresses: string[]): Promise<MemeMarket[]> {
  const out = new Map<string, MemeMarket>();
  for (let i = 0; i < addresses.length; i += 30) {
    const batch = addresses.slice(i, i + 30).join(",");
    const pairs = await getJson<DexPair[]>(`${DEX}/tokens/v1/${CHAINS[chain].dexscreener}/${batch}`);
    for (const pair of pairs) {
      const m = toMarket(pair, chain);
      if (!m) continue;
      const key = m.address.toLowerCase();
      const prev = out.get(key);
      if (!prev || m.liquidityUsd > prev.liquidityUsd) out.set(key, m);
    }
  }
  return [...out.values()];
}

export function getMemeMarket(chain: ChainId, address: string): Promise<MemeMarket | null> {
  return cached(`meme:${chain}:${address.toLowerCase()}`, 10_000, async () => {
    const [m] = await fetchTokens(chain, [address]);
    return m ?? null;
  });
}

/** Trending meme coins across our chains, filtered to pools deep enough to trade $100 accounts in. */
export function discoverMemes(): Promise<MemeMarket[]> {
  return cached("meme-discover", 90_000, async () => {
    const boosts = await getJson<{ chainId: string; tokenAddress: string }[]>(`${DEX}/token-boosts/top/v1`);
    const wanted = new Map<ChainId, string[]>();
    for (const b of boosts) {
      if (!isChainId(b.chainId)) continue;
      const list = wanted.get(b.chainId) ?? [];
      if (list.length < 25 && !list.includes(b.tokenAddress)) list.push(b.tokenAddress);
      wanted.set(b.chainId, list);
    }
    const all = (
      await Promise.all(
        CHAIN_LIST.map((c) => (wanted.get(c.id)?.length ? fetchTokens(c.id, wanted.get(c.id)!) : Promise.resolve([]))),
      )
    ).flat();
    const now = Date.now();
    return all
      .filter((m) => m.liquidityUsd >= 25_000 && m.volume24h >= 50_000)
      .filter((m) => !m.pairCreatedAt || now - m.pairCreatedAt > 6 * 3_600_000)
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 30);
  });
}

// ---------- candles ----------

interface HlCandle { t: number; c: string }

export function getPerpCandles(coin: string, interval: "5m" | "15m" | "1h"): Promise<CandlePayload> {
  return cached(`hl-candles:${coin}:${interval}`, 30_000, async () => {
    const span = { "5m": 300, "15m": 900, "1h": 3600 }[interval] * 1000 * 240;
    const rows = await getJson<HlCandle[]>(HL_INFO, {
      method: "POST",
      body: JSON.stringify({
        type: "candleSnapshot",
        req: { coin, interval, startTime: Date.now() - span, endTime: Date.now() },
      }),
    });
    return { interval, points: rows.map((r) => [r.t, Number(r.c)] as [number, number]).filter((p) => p[1] > 0) };
  });
}

export function getMemeCandles(chain: ChainId, pair: string): Promise<CandlePayload> {
  return cached(`gt-candles:${chain}:${pair}`, 60_000, async () => {
    const url = `${GECKO}/networks/${CHAINS[chain].gecko}/pools/${pair}/ohlcv/minute?aggregate=15&limit=200&currency=usd`;
    const json = await getJson<{ data: { attributes: { ohlcv_list: number[][] } } }>(url);
    // Rows are [seconds, open, high, low, close, volume], newest first.
    const points = json.data.attributes.ohlcv_list
      .map((r) => [r[0] * 1000, r[4]] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    return { interval: "15m", points };
  });
}

// ---------- price book for the engine ----------

export async function buildPriceBook(memes: { chain: ChainId; address: string }[]): Promise<PriceBook> {
  const [perps, quotes] = await Promise.all([
    getPerpMids().catch(() => ({}) as Record<string, number>),
    Promise.all(memes.map((m) => getMemeMarket(m.chain, m.address).catch(() => null))),
  ]);
  const book: PriceBook = { perps, memes: {} };
  memes.forEach((m, i) => {
    const q = quotes[i];
    if (q) book.memes[memeKey(m.chain, m.address)] = { price: q.priceUsd, liquidityUsd: q.liquidityUsd } satisfies MemeQuote;
  });
  return book;
}
