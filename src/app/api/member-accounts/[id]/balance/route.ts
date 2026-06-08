import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const account = await prisma.memberAccount.findUnique({
    where: { id },
    select: { id: true, displayName: true, balanceCents: true, isActive: true },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    memberAccountId: account.id,
    displayName: account.displayName,
    balanceCents: account.balanceCents,
  });
}
