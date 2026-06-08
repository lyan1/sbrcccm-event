import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateRegistrationSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { startOfToday } from "@/lib/calendar";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = updateRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const reg = await prisma.eventRegistration.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const today = startOfToday();
    if (reg.event.status !== "OPEN" || reg.event.eventDate < today) {
      return NextResponse.json({ error: "Event is not open for changes" }, { status: 400 });
    }
    if (reg.status === "CANCELLED") {
      return NextResponse.json({ error: "Registration cancelled" }, { status: 400 });
    }

    const updated = await prisma.eventRegistration.update({
      where: { id },
      data: { registeredParticipantCount: parsed.data.registeredParticipantCount },
    });

    await logAudit({
      actorType: "PUBLIC",
      actorId: reg.memberAccountId,
      action: "REGISTRATION_MODIFIED",
      entityType: "EventRegistration",
      entityId: id,
      newValue: { count: parsed.data.registeredParticipantCount },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
