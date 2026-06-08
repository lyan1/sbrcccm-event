import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scope = req.nextUrl.searchParams.get("scope") ?? "all";
  const now = new Date();

  const registrations = await prisma.eventRegistration.findMany({
    where: { memberAccountId: id },
    include: {
      event: true,
    },
    orderBy: { event: { eventDate: "desc" } },
  });

  const filtered = registrations.filter((r) => {
    if (scope === "upcoming") {
      return r.event.status === "OPEN" && r.event.eventDate >= now;
    }
    if (scope === "past") {
      return r.event.status !== "OPEN" || r.event.eventDate < now;
    }
    return true;
  });

  return NextResponse.json(
    filtered.map((r) => ({
      id: r.id,
      registeredParticipantCount: r.registeredParticipantCount,
      status: r.status,
      event: {
        id: r.event.id,
        title: r.event.title,
        eventDate: r.event.eventDate,
        startTime: r.event.startTime,
        endTime: r.event.endTime,
        locationName: r.event.locationName,
        status: r.event.status,
      },
    }))
  );
}
