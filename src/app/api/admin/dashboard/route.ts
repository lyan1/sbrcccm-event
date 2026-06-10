import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchNegativeBalanceUnits } from "@/lib/family-balance";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const [
    upcomingEvents,
    eventsNeedingSettlement,
    recentRegistrations,
    recentPayments,
    recentDeductions,
    activeMemberCount,
    negativeUnits,
  ] = await Promise.all([
    prisma.pickleballEvent.findMany({
      where: { status: "OPEN", endTime: { gte: now } },
      orderBy: { eventDate: "asc" },
      take: 5,
    }),
    prisma.pickleballEvent.findMany({
      where: { status: "OPEN", endTime: { lt: now } },
      orderBy: { eventDate: "desc" },
      take: 10,
    }),
    prisma.eventRegistration.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        memberAccount: { select: { displayName: true } },
        event: { select: { title: true, eventDate: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { type: "PAYMENT" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { memberAccount: { select: { displayName: true } } },
    }),
    prisma.transaction.findMany({
      where: { type: "GAME_FEE" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        memberAccount: { select: { displayName: true } },
        event: { select: { title: true, eventDate: true } },
      },
    }),
    prisma.memberAccount.count({ where: { isActive: true } }),
    fetchNegativeBalanceUnits(),
  ]);

  const negativeBalanceAccounts = [
    ...negativeUnits.negativeFamilies.map((f) => ({
      id: f.id,
      displayName: f.displayName,
      balanceCents: f.balanceCents,
      kind: "family" as const,
    })),
    ...negativeUnits.negativeSolo.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      balanceCents: m.balanceCents,
      kind: "solo" as const,
    })),
  ].sort((a, b) => a.balanceCents - b.balanceCents);

  return NextResponse.json({
    upcomingEvents,
    eventsNeedingSettlement,
    recentRegistrations,
    recentPayments,
    recentDeductions,
    activeMemberCount,
    negativeBalanceCount: negativeBalanceAccounts.length,
    negativeBalanceAccounts,
  });
}
