import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDateRangeStart } from "@/lib/utils";
import { effectiveBalanceCents } from "@/lib/family-balance";

type TxClient = Prisma.TransactionClient;

export async function cancelUpcomingRegistrationsForMember(
  memberAccountId: string,
  client: TxClient = prisma,
  now = new Date()
) {
  const registrations = await client.eventRegistration.findMany({
    where: {
      memberAccountId,
      status: "REGISTERED",
      event: { endTime: { gt: now } },
    },
    select: { id: true },
  });

  if (registrations.length === 0) {
    return { cancelledCount: 0, cancelledRegistrationIds: [] as string[] };
  }

  const cancelledRegistrationIds = registrations.map((r) => r.id);
  await client.eventRegistration.updateMany({
    where: { id: { in: cancelledRegistrationIds } },
    data: { status: "CANCELLED", cancelledAt: now },
  });

  return {
    cancelledCount: cancelledRegistrationIds.length,
    cancelledRegistrationIds,
  };
}

export async function searchMemberAccounts(query?: string) {
  const q = query?.trim();

  return prisma.memberAccount.findMany({
    where: {
      isActive: true,
      ...(q ? { displayName: { contains: q, mode: "insensitive" as const } } : {}),
    },
    select: {
      id: true,
      displayName: true,
      family: { select: { id: true, displayName: true } },
    },
    orderBy: { displayName: "asc" },
  });
}

export async function getMemberBalance(memberAccountId: string) {
  const account = await prisma.memberAccount.findUnique({
    where: { id: memberAccountId },
    select: {
      id: true,
      displayName: true,
      balanceCents: true,
      isActive: true,
      familyId: true,
      family: {
        select: { id: true, displayName: true, balanceCents: true, isActive: true },
      },
    },
  });

  if (!account) return null;

  return {
    memberAccountId: account.id,
    displayName: account.displayName,
    balanceCents: effectiveBalanceCents(account),
    family: account.family
      ? { id: account.family.id, displayName: account.family.displayName }
      : null,
  };
}

export async function getMemberTransactions(memberAccountId: string, range = "3m") {
  const account = await prisma.memberAccount.findUnique({
    where: { id: memberAccountId },
    select: { familyId: true },
  });
  if (!account) return [];

  const from = getDateRangeStart(range);

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(account.familyId
        ? { familyId: account.familyId }
        : { memberAccountId, familyId: null }),
      ...(from ? { createdAt: { gte: from } } : {}),
    },
    include: {
      event: { select: { title: true, eventDate: true } },
      memberAccount: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amountCents: t.amountCents,
    balanceAfterCents: t.balanceAfterCents,
    memberDisplayName: t.memberAccount.displayName,
    eventTitle: t.event?.title,
    eventDate: t.event?.eventDate,
    paymentMethod: t.paymentMethod,
    description: t.description,
    createdAt: t.createdAt,
  }));
}

export async function getMemberBalanceSummary(memberAccountId: string, range = "3m") {
  const balance = await getMemberBalance(memberAccountId);
  if (!balance) return null;

  const transactions = await getMemberTransactions(memberAccountId, range);
  return { ...balance, transactions };
}

export async function getMemberRegistrations(memberAccountId: string, scope = "all") {
  const now = new Date();

  const registrations = await prisma.eventRegistration.findMany({
    where: { memberAccountId },
    include: { event: true },
    orderBy: { event: { eventDate: "desc" } },
  });

  const mapped = registrations.map((r) => ({
    id: r.id,
    registeredParticipantCount: r.registeredParticipantCount,
    status: r.status,
    event: {
      id: r.event.id,
      title: r.event.title,
      eventDate: r.event.eventDate,
      startTime: r.event.startTime,
      endTime: r.event.endTime,
      locationName: r.event.locationName,
      status: r.event.status,
    },
  }));

  if (scope === "upcoming") {
    return mapped.filter((r) => r.event.status === "OPEN" && r.event.endTime > now);
  }
  if (scope === "past") {
    return mapped.filter((r) => r.event.status !== "OPEN" || r.event.endTime <= now);
  }

  return mapped;
}

export function splitRegistrationsByScope<T extends { event: { status: string; endTime: Date } }>(
  registrations: T[],
  now = new Date()
) {
  const upcoming = registrations.filter(
    (r) => r.event.status === "OPEN" && r.event.endTime > now
  );
  const past = registrations.filter(
    (r) => r.event.status !== "OPEN" || r.event.endTime <= now
  );
  return { upcoming, past };
}
