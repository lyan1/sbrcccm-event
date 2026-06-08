import { NextRequest, NextResponse } from "next/server";
import { logDbError, prisma, withDbRetry } from "@/lib/db";
import { searchMemberAccounts } from "@/lib/queries/member-accounts";
import { createMemberSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const accounts = await withDbRetry(() => searchMemberAccounts(q));
    return NextResponse.json(accounts);
  } catch (error) {
    logDbError("GET /api/member-accounts failed", error);
    return NextResponse.json({ error: "Failed to load member accounts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { displayName, phone, email, notes } = parsed.data;

    const account = await withDbRetry(() =>
      prisma.memberAccount.create({
        data: {
          displayName: displayName.trim(),
          phone: phone || null,
          email: email || null,
          notes: notes || null,
          balanceCents: 0,
          isActive: true,
        },
      })
    );

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
  } catch (error) {
    logDbError("POST /api/member-accounts failed", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
