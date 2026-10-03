import type { NextRequest } from "next/server";
import { isChainId } from "@/lib/sim/chains";
import { getMemeCandles, getPerpCandles } from "@/lib/sim/prices";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  try {
    if (q.get("kind") === "perp") {
      const coin = q.get("coin") ?? "";
      const interval = q.get("interval") === "1h" ? "1h" : q.get("interval") === "5m" ? "5m" : "15m";
      if (!/^[A-Za-z0-9]{2,12}$/.test(coin)) return Response.json({ error: "Bad coin." }, { status: 400 });
      return Response.json(await getPerpCandles(coin, interval), { headers: { "Cache-Control": "public, max-age=15" } });
    }
    const chain = q.get("chain") ?? "";
    const pair = q.get("pair") ?? "";
    if (!isChainId(chain) || !/^[A-Za-z0-9]{20,64}$/.test(pair)) {
      return Response.json({ error: "Bad pool." }, { status: 400 });
    }
    return Response.json(await getMemeCandles(chain, pair), { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (err) {
    console.error("[api/candles]", err);
    return Response.json({ error: "Chart data is unavailable." }, { status: 502 });
  }
}
