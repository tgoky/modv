import { getPerpMarkets } from "@/lib/sim/prices";

export async function GET() {
  try {
    return Response.json(await getPerpMarkets(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/perps]", err);
    return Response.json({ error: "Futures prices are unavailable." }, { status: 502 });
  }
}
