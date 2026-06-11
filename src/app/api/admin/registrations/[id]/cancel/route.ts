import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertCanManageEventRoster } from "@/lib/event-roster";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (reg.status === "CANCELLED") {
      return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
    }

    assertCanManageEventRoster(reg.event);

    const updated = await prisma.eventRegistration.update({
      where: { id },
      data: {
        status: "CANCELLED",
        actualParticipantCount: 0,
        cancelledAt: new Date(),
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "REGISTRATION_CANCELLED_BY_ADMIN",
      entityType: "EventRegistration",
      entityId: id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancel failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
