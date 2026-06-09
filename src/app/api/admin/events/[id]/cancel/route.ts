import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { isRegistrationOpenForEvent } from "@/lib/calendar";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.pickleballEvent.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isRegistrationOpenForEvent(event)) {
    return NextResponse.json({ error: "Only open events can be cancelled" }, { status: 400 });
  }

  const updated = await prisma.pickleballEvent.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await logAudit({
    actorType: "ADMIN",
    actorId: session.adminId,
    action: "EVENT_CANCELLED",
    entityType: "PickleballEvent",
    entityId: id,
  });

  return NextResponse.json(updated);
}
