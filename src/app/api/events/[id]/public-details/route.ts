import { NextRequest, NextResponse } from "next/server";
import { logDbError, withDbRetry } from "@/lib/db";
import { getPublicEventDetails } from "@/lib/queries/public-event-details";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const details = await withDbRetry(() => getPublicEventDetails(id));

    if (!details) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(details, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch (error) {
    logDbError("GET /api/events/[id]/public-details failed", error);
    return NextResponse.json({ error: "Failed to load event details" }, { status: 500 });
  }
}
