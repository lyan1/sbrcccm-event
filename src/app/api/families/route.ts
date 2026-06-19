import { NextRequest, NextResponse } from "next/server";
import { logDbError, withDbRetry } from "@/lib/db";
import { findFamilyByDisplayName } from "@/lib/display-name";
import { searchFamilies } from "@/lib/family-balance";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const exact = req.nextUrl.searchParams.get("exact") === "true";

    if (exact && q?.trim()) {
      const match = await withDbRetry(() => findFamilyByDisplayName(q));
      return NextResponse.json(match ? [match] : [], {
        headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
      });
    }

    const families = await withDbRetry(() => searchFamilies(q));
    return NextResponse.json(families, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch (error) {
    logDbError("GET /api/families failed", error);
    return NextResponse.json({ error: "Failed to load families" }, { status: 500 });
  }
}
