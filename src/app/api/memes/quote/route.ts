import type { NextRequest } from "next/server";
import { isChainId } from "@/lib/sim/chains";
import { getMemeMarket } from "@/lib/sim/prices";

export async function GET(request: NextRequest) {
  const chain = request.nextUrl.searchParams.get("chain") ?? "";
  const address = request.nextUrl.searchParams.get("address") ?? "";
  if (!isChainId(chain) || !/^[A-Za-z0-9]{20,64}$/.test(address)) {
    return Response.json({ error: "Enter a chain and a token address." }, { status: 400 });
  }
  try {
    const market = await getMemeMarket(chain, address);
    if (!market) return Response.json({ error: "No tradable pool found for that token." }, { status: 404 });
    return Response.json(market, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/memes/quote]", err);
    return Response.json({ error: "Price lookup failed." }, { status: 502 });
  }
}
