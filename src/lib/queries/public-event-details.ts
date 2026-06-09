import { prisma } from "@/lib/db";
import { formatEventDateKey, formatEventTimeKey } from "@/lib/timezone";

export interface PublicEventDetails {
  event: {
    id: string;
    title: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    locationName: string | null;
    address: string | null;
    notes: string | null;
    status: string;
  };
  registeredParticipantCount: number;
  registrations: Array<{
    id: string;
    memberAccountId: string;
    displayName: string;
    registeredParticipantCount: number;
    status: string;
  }>;
}

export async function getPublicEventDetails(
  eventId: string
): Promise<PublicEventDetails | null> {
  const event = await prisma.pickleballEvent.findUnique({
    where: { id: eventId },
    include: {
      registrations: {
        where: {
          status: "REGISTERED",
          memberAccount: { isActive: true },
        },
        include: {
          memberAccount: { select: { id: true, displayName: true, isActive: true } },
        },
        orderBy: { memberAccount: { displayName: "asc" } },
      },
    },
  });

  if (!event) return null;

  const registeredParticipantCount = event.registrations.reduce(
    (sum, r) => sum + r.registeredParticipantCount,
    0
  );

  return {
    event: {
      id: event.id,
      title: event.title,
      eventDate: formatEventDateKey(event.eventDate),
      startTime: formatEventTimeKey(event.startTime),
      endTime: formatEventTimeKey(event.endTime),
      locationName: event.locationName,
      address: event.address,
      notes: event.notes,
      status: event.status,
    },
    registeredParticipantCount,
    registrations: event.registrations.map((r) => ({
      id: r.id,
      memberAccountId: r.memberAccountId,
      displayName: r.memberAccount.displayName,
      registeredParticipantCount: r.registeredParticipantCount,
      status: r.status,
    })),
  };
}
