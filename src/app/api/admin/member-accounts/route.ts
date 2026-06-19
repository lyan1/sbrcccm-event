import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDisplayNameConflict } from "@/lib/display-name";
import { createMemberSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { createMemberAccount } from "@/lib/member-create";
import { effectiveBalanceCents } from "@/lib/family-balance";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const isActive = req.nextUrl.searchParams.get("isActive");
  const unassignedOnly = req.nextUrl.searchParams.get("unassignedOnly") === "true";
  const negativeBalanceOnly = req.nextUrl.searchParams.get("negativeBalanceOnly") === "true";

  const accounts = await prisma.memberAccount.findMany({
    where: {
      ...(q ? { displayName: { contains: q, mode: "insensitive" } } : {}),
      ...(isActive === "true" ? { isActive: true } : isActive === "false" ? { isActive: false } : {}),
      ...(unassignedOnly ? { familyId: null } : {}),
    },
    include: {
      family: { select: { id: true, displayName: true, balanceCents: true, isActive: true } },
    },
    orderBy: { displayName: "asc" },
  });

  const mapped = accounts.map((account) => ({
    ...account,
    balanceCents: effectiveBalanceCents(account),
  }));

  const filtered = negativeBalanceOnly
    ? mapped.filter((account) => account.balanceCents < 0)
    : mapped;

  return NextResponse.json(filtered);
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

    const account = await createMemberAccount(parsed.data);

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "MEMBER_CREATED",
      entityType: "MemberAccount",
      entityId: account.id,
      newValue: account,
    });

    return NextResponse.json({
      ...account,
      balanceCents: effectiveBalanceCents(account),
    });
  } catch (error) {
    if (isDisplayNameConflict(error)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
