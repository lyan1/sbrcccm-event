import { NextRequest, NextResponse } from "next/server";
import { logDbError, withDbRetry } from "@/lib/db";
import { findMemberByDisplayName, isDisplayNameConflict } from "@/lib/display-name";
import { searchMemberAccounts } from "@/lib/queries/member-accounts";
import { createMemberSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { createMemberAccount } from "@/lib/member-create";
import { effectiveBalanceCents } from "@/lib/family-balance";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const exact = req.nextUrl.searchParams.get("exact") === "true";

    if (exact && q?.trim()) {
      const match = await withDbRetry(() => findMemberByDisplayName(q));
      return NextResponse.json(match ? [match] : [], {
        headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
      });
    }

    const accounts = await withDbRetry(() => searchMemberAccounts(q));
    return NextResponse.json(accounts, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
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

    const { displayName, phone, email, notes, familyId, newFamilyDisplayName } = parsed.data;

    const account = await withDbRetry(() =>
      createMemberAccount({
        displayName,
        phone,
        email,
        notes,
        familyId,
        newFamilyDisplayName,
      })
    );

    await logAudit({
      actorType: "PUBLIC",
      action: "MEMBER_CREATED",
      entityType: "MemberAccount",
      entityId: account.id,
      newValue: {
        displayName: account.displayName,
        familyId: account.familyId,
      },
    });

    return NextResponse.json({
      id: account.id,
      displayName: account.displayName,
      balanceCents: effectiveBalanceCents(account),
      family: account.family
        ? { id: account.family.id, displayName: account.family.displayName }
        : null,
    });
  } catch (error) {
    if (isDisplayNameConflict(error)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logDbError("POST /api/member-accounts failed", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
