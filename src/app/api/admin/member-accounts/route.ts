import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createMemberSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const isActive = req.nextUrl.searchParams.get("isActive");
  const negativeBalanceOnly = req.nextUrl.searchParams.get("negativeBalanceOnly") === "true";

  const accounts = await prisma.memberAccount.findMany({
    where: {
      ...(q ? { displayName: { contains: q, mode: "insensitive" } } : {}),
      ...(isActive === "true" ? { isActive: true } : isActive === "false" ? { isActive: false } : {}),
      ...(negativeBalanceOnly ? { balanceCents: { lt: 0 } } : {}),
    },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const account = await prisma.memberAccount.create({
      data: {
        displayName: parsed.data.displayName.trim(),
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "MEMBER_CREATED",
      entityType: "MemberAccount",
      entityId: account.id,
      newValue: account,
    });

    return NextResponse.json(account);
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
