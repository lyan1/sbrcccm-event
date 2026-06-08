import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bulkRegistrationSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { startOfToday } from "@/lib/calendar";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bulkRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { memberAccountId, items } = parsed.data;

    const account = await prisma.memberAccount.findUnique({
      where: { id: memberAccountId },
    });
    if (!account || !account.isActive) {
      return NextResponse.json({ error: "Invalid member account" }, { status: 400 });
    }

    const eventIds = items.map((i) => i.eventId);
    const today = startOfToday();
    const events = await prisma.pickleballEvent.findMany({
      where: { id: { in: eventIds }, status: "OPEN", eventDate: { gte: today } },
    });

    if (events.length !== eventIds.length) {
      return NextResponse.json({ error: "One or more events are not open" }, { status: 400 });
    }

    const results = [];
    for (const item of items) {
      const reg = await prisma.eventRegistration.upsert({
        where: {
          eventId_memberAccountId: {
            eventId: item.eventId,
            memberAccountId,
          },
        },
        create: {
          eventId: item.eventId,
          memberAccountId,
          registeredParticipantCount: item.participantCount,
          status: "REGISTERED",
        },
        update: {
          registeredParticipantCount: item.participantCount,
          status: "REGISTERED",
          cancelledAt: null,
        },
      });

      await logAudit({
        actorType: "PUBLIC",
        actorId: memberAccountId,
        action: "REGISTRATION_UPSERTED",
        entityType: "EventRegistration",
        entityId: reg.id,
        newValue: { participantCount: item.participantCount },
      });

      results.push(reg);
    }

    return NextResponse.json({ success: true, registrations: results });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
