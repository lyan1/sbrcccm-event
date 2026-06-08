import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createEventSchema } from "@/lib/validation";
import { parseDateTime } from "@/lib/utils";
import { startOfEventDay } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const events = await prisma.pickleballEvent.findMany({
    where: {
      ...(status ? { status: status as "OPEN" | "CANCELLED" | "COMPLETED" } : {}),
      ...(from || to
        ? {
            eventDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { eventDate: "desc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const startTime = parseDateTime(parsed.data.eventDate, parsed.data.startTime);
    const endTime = parseDateTime(parsed.data.eventDate, parsed.data.endTime);
    if (endTime <= startTime) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const eventDate = startOfEventDay(parsed.data.eventDate);

    const event = await prisma.pickleballEvent.create({
      data: {
        title: parsed.data.title || "Pickleball",
        eventDate,
        startTime,
        endTime,
        locationName: parsed.data.locationName,
        address: parsed.data.address,
        notes: parsed.data.notes,
        status: "OPEN",
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "EVENT_CREATED",
      entityType: "PickleballEvent",
      entityId: event.id,
      newValue: event,
    });

    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
