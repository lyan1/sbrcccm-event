import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bulkEventsSchema } from "@/lib/validation";
import { parseDateTime } from "@/lib/utils";
import { startOfEventDay } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import { upsertEventLocation } from "@/lib/locations";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = bulkEventsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const created = [];
    for (const e of parsed.data.events) {
      const startTime = parseDateTime(e.eventDate, e.startTime);
      const endTime = parseDateTime(e.eventDate, e.endTime);
      if (endTime <= startTime) {
        return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
      }

      const eventDate = startOfEventDay(e.eventDate);

      const locationName = e.locationName.trim();
      const address = e.address.trim();

      await upsertEventLocation(locationName, address);

      const event = await prisma.pickleballEvent.create({
        data: {
          title: e.title || "Pickleball",
          eventDate,
          startTime,
          endTime,
          locationName,
          address,
          notes: e.notes,
          status: "OPEN",
        },
      });
      created.push(event);
    }

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "EVENTS_BULK_CREATED",
      entityType: "PickleballEvent",
      entityId: "bulk",
      newValue: { count: created.length },
    });

    return NextResponse.json({ events: created });
  } catch {
    return NextResponse.json({ error: "Bulk create failed" }, { status: 500 });
  }
}
