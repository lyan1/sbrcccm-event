import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { isRegistrationOpenForEvent } from "@/lib/calendar";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reg = await prisma.eventRegistration.findUnique({
    where: { id },
    include: { event: true },
  });

  if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isRegistrationOpenForEvent(reg.event)) {
    return NextResponse.json({ error: "Event is not open for changes" }, { status: 400 });
  }

  const updated = await prisma.eventRegistration.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  await logAudit({
    actorType: "PUBLIC",
    actorId: reg.memberAccountId,
    action: "REGISTRATION_CANCELLED",
    entityType: "EventRegistration",
    entityId: id,
  });

  return NextResponse.json(updated);
}
