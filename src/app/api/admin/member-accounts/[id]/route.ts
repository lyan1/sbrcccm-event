import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelUpcomingRegistrationsForMember } from "@/lib/queries/member-accounts";
import { assertMemberDisplayNameAvailable, isDisplayNameConflict } from "@/lib/display-name";
import { updateMemberSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { assignMemberToFamily } from "@/lib/member-create";
import { effectiveBalanceCents } from "@/lib/family-balance";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const account = await prisma.memberAccount.findUnique({
    where: { id },
    include: {
      family: { select: { id: true, displayName: true, balanceCents: true, isActive: true } },
      registrations: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { event: true },
      },
    },
  });

  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const transactions = await prisma.transaction.findMany({
    where: account.familyId
      ? { familyId: account.familyId }
      : { memberAccountId: id, familyId: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      event: true,
      memberAccount: { select: { displayName: true } },
    },
  });

  return NextResponse.json({
    ...account,
    balanceCents: effectiveBalanceCents(account),
    transactions,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = updateMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const old = await prisma.memberAccount.findUnique({ where: { id } });
    if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const deactivating = old.isActive && parsed.data.isActive === false;
    const { familyId, ...memberFields } = parsed.data;

    if (memberFields.displayName !== undefined) {
      await assertMemberDisplayNameAvailable(memberFields.displayName, id);
    }

    const { updated, cancelledRegistrationCount, cancelledRegistrationIds } =
      await prisma.$transaction(async (tx) => {
        let account = await tx.memberAccount.update({
          where: { id },
          data: {
            ...memberFields,
            email: memberFields.email === "" ? null : memberFields.email,
          },
          include: {
            family: { select: { id: true, displayName: true, balanceCents: true, isActive: true } },
          },
        });

        if (familyId !== undefined) {
          account = await assignMemberToFamily(id, familyId, tx);
        }

        let cancelledRegistrationCount = 0;
        let cancelledRegistrationIds: string[] = [];
        if (deactivating) {
          const cancellation = await cancelUpcomingRegistrationsForMember(id, tx);
          cancelledRegistrationCount = cancellation.cancelledCount;
          cancelledRegistrationIds = cancellation.cancelledRegistrationIds;
        }

        return { updated: account, cancelledRegistrationCount, cancelledRegistrationIds };
      });

    for (const registrationId of cancelledRegistrationIds) {
      await logAudit({
        actorType: "ADMIN",
        actorId: session.adminId,
        action: "REGISTRATION_CANCELLED",
        entityType: "EventRegistration",
        entityId: registrationId,
        newValue: { reason: "MEMBER_DEACTIVATED", memberAccountId: id },
      });
    }

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "MEMBER_UPDATED",
      entityType: "MemberAccount",
      entityId: id,
      oldValue: old,
      newValue: {
        ...updated,
        ...(cancelledRegistrationCount > 0 ? { cancelledRegistrationCount } : {}),
      },
    });

    return NextResponse.json({
      ...updated,
      balanceCents: effectiveBalanceCents(updated),
      cancelledRegistrationCount,
    });
  } catch (error) {
    if (isDisplayNameConflict(error)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const existing = await prisma.memberAccount.findUnique({
      where: { id },
      include: {
        _count: { select: { transactions: true, registrations: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const hasSoloBalance = !existing.familyId && existing.balanceCents !== 0;
    if (
      existing._count.transactions > 0 ||
      existing._count.registrations > 0 ||
      hasSoloBalance
    ) {
      return NextResponse.json({ error: "MEMBER_DELETE_BLOCKED" }, { status: 409 });
    }

    await prisma.memberAccount.delete({ where: { id } });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "MEMBER_DELETED",
      entityType: "MemberAccount",
      entityId: id,
      oldValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
