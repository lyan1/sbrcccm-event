import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
    negativeBalanceAccounts,
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
    prisma.memberAccount.findMany({
      where: { isActive: true, balanceCents: { lt: 0 } },
      orderBy: { balanceCents: "asc" },
      select: { id: true, displayName: true, balanceCents: true },
    }),
  ]);

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
