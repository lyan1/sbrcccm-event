import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertCanManageEventRoster } from "@/lib/event-roster";
import { adminUpdateEventRegistrationSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = adminUpdateEventRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const reg = await prisma.eventRegistration.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (reg.status === "CANCELLED") {
      return NextResponse.json({ error: "Registration is cancelled" }, { status: 400 });
    }

    assertCanManageEventRoster(reg.event);

    const updated = await prisma.eventRegistration.update({
      where: { id },
      data: {
        ...(parsed.data.registeredParticipantCount !== undefined
          ? { registeredParticipantCount: parsed.data.registeredParticipantCount }
          : {}),
        ...(parsed.data.actualParticipantCount !== undefined
          ? { actualParticipantCount: parsed.data.actualParticipantCount }
          : {}),
        ...(parsed.data.adminNote !== undefined ? { adminNote: parsed.data.adminNote } : {}),
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "REGISTRATION_UPDATED_BY_ADMIN",
      entityType: "EventRegistration",
      entityId: id,
      newValue: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
