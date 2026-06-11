import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertCanManageEventRoster } from "@/lib/event-roster";
import { adminAddEventRegistrationSchema } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;

  try {
    const body = await req.json();
    const parsed = adminAddEventRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const event = await prisma.pickleballEvent.findUnique({ where: { id: eventId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    assertCanManageEventRoster(event);

    const member = await prisma.memberAccount.findUnique({
      where: { id: parsed.data.memberAccountId },
    });
    if (!member || !member.isActive) {
      return NextResponse.json({ error: "Invalid member account" }, { status: 400 });
    }

    const existing = await prisma.eventRegistration.findUnique({
      where: {
        eventId_memberAccountId: {
          eventId,
          memberAccountId: parsed.data.memberAccountId,
        },
      },
    });
    if (existing && existing.status === "REGISTERED") {
      return NextResponse.json({ error: "Member is already on the roster" }, { status: 400 });
    }

    const count = parsed.data.participantCount;
    const registration = existing
      ? await prisma.eventRegistration.update({
          where: { id: existing.id },
          data: {
            status: "REGISTERED",
            registeredParticipantCount: count,
            actualParticipantCount: count,
            cancelledAt: null,
          },
        })
      : await prisma.eventRegistration.create({
          data: {
            eventId,
            memberAccountId: parsed.data.memberAccountId,
            registeredParticipantCount: count,
            actualParticipantCount: count,
            status: "REGISTERED",
          },
        });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "REGISTRATION_ADDED_BY_ADMIN",
      entityType: "EventRegistration",
      entityId: registration.id,
      newValue: { participantCount: count },
    });

    return NextResponse.json(registration);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Add failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
