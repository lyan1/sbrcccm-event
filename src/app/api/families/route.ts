import { NextRequest, NextResponse } from "next/server";
import { logDbError, withDbRetry } from "@/lib/db";
import { searchFamilies } from "@/lib/family-balance";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const families = await withDbRetry(() => searchFamilies(q));
    return NextResponse.json(families, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch (error) {
    logDbError("GET /api/families failed", error);
    return NextResponse.json({ error: "Failed to load families" }, { status: 500 });
  }
}
