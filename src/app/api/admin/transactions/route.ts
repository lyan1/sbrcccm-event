import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PaymentMethod, Prisma, TransactionType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const memberAccountId = req.nextUrl.searchParams.get("memberAccountId");
  const eventId = req.nextUrl.searchParams.get("eventId");
  const type = req.nextUrl.searchParams.get("type");
  const paymentMethod = req.nextUrl.searchParams.get("paymentMethod");
  const negativeBalanceOnly = req.nextUrl.searchParams.get("negativeBalanceOnly") === "true";

  const where: Prisma.TransactionWhereInput = {
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
    ...(memberAccountId ? { memberAccountId } : {}),
    ...(eventId ? { eventId } : {}),
    ...(type ? { type: type as TransactionType } : {}),
    ...(paymentMethod ? { paymentMethod: paymentMethod as PaymentMethod } : {}),
    ...(negativeBalanceOnly
      ? {
          OR: [
            { familyId: { not: null }, family: { balanceCents: { lt: 0 } } },
            { familyId: null, memberAccount: { balanceCents: { lt: 0 } } },
          ],
        }
      : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      memberAccount: { select: { displayName: true } },
      family: { select: { displayName: true } },
      event: { select: { title: true, eventDate: true } },
      createdByAdmin: { select: { username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json(transactions);
}
