import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createMemberSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  const accounts = await prisma.memberAccount.findMany({
    where: {
      isActive: true,
      ...(q ? { displayName: { contains: q, mode: "insensitive" } } : {}),
    },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { displayName, phone, email, notes } = parsed.data;

    const account = await prisma.memberAccount.create({
      data: {
        displayName: displayName.trim(),
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        balanceCents: 0,
        isActive: true,
      },
    });

    await logAudit({
      actorType: "PUBLIC",
      action: "MEMBER_CREATED",
      entityType: "MemberAccount",
      entityId: account.id,
      newValue: { displayName: account.displayName },
    });

    return NextResponse.json({
      id: account.id,
      displayName: account.displayName,
      balanceCents: account.balanceCents,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
