import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createEventSchema } from "@/lib/validation";
import { parseDateTime } from "@/lib/utils";
import { startOfEventDay } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.pickleballEvent.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { memberAccount: { select: { id: true, displayName: true, balanceCents: true } } },
        orderBy: { memberAccount: { displayName: "asc" } },
      },
      settledByAdmin: { select: { username: true } },
    },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expectedTotal = event.registrations
    .filter((r) => r.status === "REGISTERED")
    .reduce((s, r) => s + r.registeredParticipantCount, 0);

  const actualTotal = event.registrations.reduce(
    (s, r) =>
      s +
      (r.actualParticipantCount ??
        (r.status === "CANCELLED" ? 0 : r.registeredParticipantCount)),
    0
  );

  return NextResponse.json({ ...event, expectedTotal, actualTotal });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const event = await prisma.pickleballEvent.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    if (event.status === "COMPLETED") {
      if (Object.keys(body).length === 1 && body.notes !== undefined) {
        const updated = await prisma.pickleballEvent.update({
          where: { id },
          data: { notes: body.notes },
        });
        return NextResponse.json(updated);
      }
      return NextResponse.json({ error: "Completed events can only edit notes" }, { status: 400 });
    }

    const parsed = createEventSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.title) data.title = parsed.data.title;
    if (parsed.data.locationName !== undefined) data.locationName = parsed.data.locationName;
    if (parsed.data.address !== undefined) data.address = parsed.data.address;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;

    if (parsed.data.eventDate && parsed.data.startTime && parsed.data.endTime) {
      const startTime = parseDateTime(parsed.data.eventDate, parsed.data.startTime);
      const endTime = parseDateTime(parsed.data.eventDate, parsed.data.endTime);
      if (endTime <= startTime) {
        return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
      }
      const eventDate = startOfEventDay(parsed.data.eventDate);
      data.eventDate = eventDate;
      data.startTime = startTime;
      data.endTime = endTime;
    }

    const updated = await prisma.pickleballEvent.update({ where: { id }, data });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "EVENT_UPDATED",
      entityType: "PickleballEvent",
      entityId: id,
      newValue: updated,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
