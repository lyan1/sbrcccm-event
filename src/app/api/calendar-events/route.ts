import { NextRequest, NextResponse } from "next/server";
import { logDbError } from "@/lib/db";
import { getCalendarEvents } from "@/lib/queries/calendar-events";

export async function GET(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "from and to are required" }, { status: 400 });
    }

    const result = await getCalendarEvents(from, to);
    return NextResponse.json({ events: result });
  } catch (error) {
    logDbError("GET /api/calendar-events failed", error);
    return NextResponse.json({ error: "Failed to load calendar events" }, { status: 500 });
  }
}
