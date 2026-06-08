import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatEventDateKey, formatEventTimeKey } from "@/lib/timezone";

export async function GET(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "from and to are required" }, { status: 400 });
    }

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const events = await prisma.pickleballEvent.findMany({
      where: {
        eventDate: { gte: fromDate, lte: toDate },
        status: { in: ["OPEN", "COMPLETED", "CANCELLED"] },
      },
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
      include: {
        registrations: {
          where: { status: "REGISTERED" },
          select: { registeredParticipantCount: true },
        },
      },
    });

    const result = events.map((event) => ({
      id: event.id,
      title: event.title,
      eventDate: formatEventDateKey(event.eventDate),
      startTime: formatEventTimeKey(event.startTime),
      endTime: formatEventTimeKey(event.endTime),
      locationName: event.locationName,
      status: event.status,
      registeredParticipantCount: event.registrations.reduce(
        (sum, r) => sum + r.registeredParticipantCount,
        0
      ),
      registrationCount: event.registrations.length,
    }));

    return NextResponse.json({ events: result });
  } catch (error) {
    console.error("GET /api/calendar-events failed:", error);
    return NextResponse.json({ error: "Failed to load calendar events" }, { status: 500 });
  }
}
