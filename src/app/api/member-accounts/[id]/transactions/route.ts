import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDateRangeStart } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const range = req.nextUrl.searchParams.get("range") ?? "3m";
  const from = getDateRangeStart(range);

  const transactions = await prisma.transaction.findMany({
    where: {
      memberAccountId: id,
      ...(from ? { createdAt: { gte: from } } : {}),
    },
    include: {
      event: { select: { title: true, eventDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amountCents: t.amountCents,
      balanceAfterCents: t.balanceAfterCents,
      eventTitle: t.event?.title,
      eventDate: t.event?.eventDate,
      paymentMethod: t.paymentMethod,
      description: t.description,
      createdAt: t.createdAt,
    }))
  );
}
