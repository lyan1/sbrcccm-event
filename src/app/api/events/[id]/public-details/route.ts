import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatEventDateKey, formatEventTimeKey } from "@/lib/timezone";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await prisma.pickleballEvent.findUnique({
      where: { id },
      include: {
        registrations: {
          where: { status: "REGISTERED" },
          include: {
            memberAccount: { select: { id: true, displayName: true, isActive: true } },
          },
          orderBy: { memberAccount: { displayName: "asc" } },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const registeredParticipantCount = event.registrations.reduce(
      (sum, r) => sum + r.registeredParticipantCount,
      0
    );

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        eventDate: formatEventDateKey(event.eventDate),
        startTime: formatEventTimeKey(event.startTime),
        endTime: formatEventTimeKey(event.endTime),
        locationName: event.locationName,
        address: event.address,
        notes: event.notes,
        status: event.status,
      },
      registeredParticipantCount,
      registrations: event.registrations.map((r) => ({
        id: r.id,
        memberAccountId: r.memberAccountId,
        displayName: r.memberAccount.displayName,
        registeredParticipantCount: r.registeredParticipantCount,
        status: r.status,
      })),
    });
  } catch (error) {
    console.error("GET public-details failed:", error);
    return NextResponse.json({ error: "Failed to load event details" }, { status: 500 });
  }
}
