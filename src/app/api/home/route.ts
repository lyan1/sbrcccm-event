import { NextRequest, NextResponse } from "next/server";
import { logDbError, withDbRetry } from "@/lib/db";
import { getCalendarEvents } from "@/lib/queries/calendar-events";
import { getPublicPromotions } from "@/lib/queries/promotions";

export async function GET(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "from and to are required" }, { status: 400 });
    }

    const [events, promotions] = await withDbRetry(() =>
      Promise.all([getCalendarEvents(from, to), getPublicPromotions()])
    );

    return NextResponse.json({ events, promotions });
  } catch (error) {
    logDbError("GET /api/home failed", error);
    return NextResponse.json({ error: "Failed to load home data" }, { status: 500 });
  }
}
