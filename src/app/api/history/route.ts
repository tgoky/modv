import type { NextRequest } from "next/server";
import { getHistory } from "@/lib/history";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  try {
    const data = await getHistory(id);
    if (!data) return Response.json({ error: "Unknown market." }, { status: 404 });
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60" },
    });
  } catch (err) {
    console.error("[api/history]", id, err);
    return Response.json({ error: "Price history is unavailable." }, { status: 502 });
  }
}
