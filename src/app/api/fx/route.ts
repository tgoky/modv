import { getFxRates } from "@/lib/fx";

export async function GET() {
  try {
    const data = await getFxRates();
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/fx]", err);
    return Response.json({ error: "Currency rates are unavailable." }, { status: 502 });
  }
}
