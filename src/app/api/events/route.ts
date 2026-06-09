import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export async function GET(req: NextRequest) {
  try {
    const memberAccountId = req.nextUrl.searchParams.get("memberAccountId");
    const now = new Date();

    const events = await prisma.pickleballEvent.findMany({
      where: {
        status: "OPEN",
        endTime: { gte: now },
      },
      orderBy: { eventDate: "asc" },
    });

    if (events.length === 0) {
      return NextResponse.json([]);
    }

    const eventIds = events.map((e) => e.id);

    const [expectedCounts, memberRegs] = await Promise.all([
      prisma.eventRegistration.groupBy({
        by: ["eventId"],
        where: { eventId: { in: eventIds }, status: "REGISTERED" },
        _sum: { registeredParticipantCount: true },
      }),
      memberAccountId
        ? prisma.eventRegistration.findMany({
            where: {
              eventId: { in: eventIds },
              memberAccountId,
              status: "REGISTERED",
            },
          })
        : Promise.resolve([]),
    ]);

    const countByEvent = new Map(
      expectedCounts.map((row) => [
        row.eventId,
        row._sum.registeredParticipantCount ?? 0,
      ])
    );

    const memberRegByEvent = new Map(
      memberRegs.map((reg) => [reg.eventId, reg])
    );

    const result = events.map((event) => {
      const reg = memberRegByEvent.get(event.id);
      return {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        locationName: event.locationName,
        address: event.address,
        notes: event.notes,
        expectedParticipantCount: countByEvent.get(event.id) ?? 0,
        selectedAccountRegistration: reg
          ? {
              registeredParticipantCount: reg.registeredParticipantCount,
              status: reg.status,
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/events failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load events" },
      { status: 500 }
    );
  }
}
