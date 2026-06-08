import { prisma } from "@/lib/db";
import { getDateRangeStart } from "@/lib/utils";

export async function searchMemberAccounts(query?: string) {
  const q = query?.trim();

  return prisma.memberAccount.findMany({
    where: {
      isActive: true,
      ...(q ? { displayName: { contains: q, mode: "insensitive" as const } } : {}),
    },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });
}

export async function getMemberBalance(memberAccountId: string) {
  const account = await prisma.memberAccount.findUnique({
    where: { id: memberAccountId },
    select: { id: true, displayName: true, balanceCents: true, isActive: true },
  });

  if (!account) return null;

  return {
    memberAccountId: account.id,
    displayName: account.displayName,
    balanceCents: account.balanceCents,
  };
}

export async function getMemberTransactions(memberAccountId: string, range = "3m") {
  const from = getDateRangeStart(range);

  const transactions = await prisma.transaction.findMany({
    where: {
      memberAccountId,
      ...(from ? { createdAt: { gte: from } } : {}),
    },
    include: {
      event: { select: { title: true, eventDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amountCents: t.amountCents,
    balanceAfterCents: t.balanceAfterCents,
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
    return mapped.filter((r) => r.event.status === "OPEN" && r.event.eventDate >= now);
  }
  if (scope === "past") {
    return mapped.filter((r) => r.event.status !== "OPEN" || r.event.eventDate < now);
  }

  return mapped;
}

export function splitRegistrationsByScope<T extends { event: { status: string; eventDate: Date } }>(
  registrations: T[],
  now = new Date()
) {
  const upcoming = registrations.filter(
    (r) => r.event.status === "OPEN" && r.event.eventDate >= now
  );
  const past = registrations.filter(
    (r) => r.event.status !== "OPEN" || r.event.eventDate < now
  );
  return { upcoming, past };
}
