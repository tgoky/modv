import { discoverMemes } from "@/lib/sim/prices";

export async function GET() {
  try {
    return Response.json(await discoverMemes(), { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (err) {
    console.error("[api/memes]", err);
    return Response.json({ error: "Meme coin prices are unavailable." }, { status: 502 });
  }
}
