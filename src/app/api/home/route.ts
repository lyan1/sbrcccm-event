import { NextRequest, NextResponse } from "next/server";
import { logDbError, withDbRetry } from "@/lib/db";
import { getCalendarEvents } from "@/lib/queries/calendar-events";
import { pickFeaturedEventId } from "@/lib/queries/home";
import { getPublicPromotions } from "@/lib/queries/promotions";
import { getPublicEventDetails } from "@/lib/queries/public-event-details";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
};

export async function GET(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const featuredDate = req.nextUrl.searchParams.get("featuredDate");

    if (!from || !to) {
      return NextResponse.json({ error: "from and to are required" }, { status: 400 });
    }

    const payload = await withDbRetry(async () => {
      const events = await getCalendarEvents(from, to);
      const promotions = await getPublicPromotions();

      const featuredEventId = pickFeaturedEventId(events, featuredDate);
      const featuredEventDetails = featuredEventId
        ? await getPublicEventDetails(featuredEventId)
        : null;

      return { events, promotions, featuredEventDetails };
    });

    return NextResponse.json(payload, { headers: CACHE_HEADERS });
  } catch (error) {
    logDbError("GET /api/home failed", error);
    return NextResponse.json({ error: "Failed to load home data" }, { status: 500 });
  }
}
