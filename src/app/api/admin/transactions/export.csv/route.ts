import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/utils";
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
  };

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      memberAccount: { select: { displayName: true } },
      event: { select: { title: true, eventDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Date",
    "Member",
    "Type",
    "Amount",
    "Balance After",
    "Event Date",
    "Event Title",
    "Payment Method",
    "Description",
  ].join(",");

  const rows = transactions.map((t) =>
    [
      t.createdAt.toISOString(),
      `"${t.memberAccount.displayName.replace(/"/g, '""')}"`,
      t.type,
      formatCents(t.amountCents),
      formatCents(t.balanceAfterCents),
      t.event?.eventDate?.toISOString().split("T")[0] ?? "",
      `"${(t.event?.title ?? "").replace(/"/g, '""')}"`,
      t.paymentMethod ?? "",
      `"${(t.description ?? "").replace(/"/g, '""')}"`,
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
    },
  });
}
