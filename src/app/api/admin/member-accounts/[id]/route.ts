import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelUpcomingRegistrationsForMember } from "@/lib/queries/member-accounts";
import { updateMemberSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

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
      transactions: { orderBy: { createdAt: "desc" }, take: 50, include: { event: true } },
      registrations: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { event: true },
      },
    },
  });

  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(account);
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

    const { updated, cancelledRegistrationCount, cancelledRegistrationIds } =
      await prisma.$transaction(async (tx) => {
        const account = await tx.memberAccount.update({
          where: { id },
          data: {
            ...parsed.data,
            email: parsed.data.email === "" ? null : parsed.data.email,
          },
        });

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

    return NextResponse.json({ ...updated, cancelledRegistrationCount });
  } catch {
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

    if (
      existing._count.transactions > 0 ||
      existing._count.registrations > 0 ||
      existing.balanceCents !== 0
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
