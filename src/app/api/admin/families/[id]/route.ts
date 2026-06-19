import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertFamilyDisplayNameAvailable, isDisplayNameConflict } from "@/lib/display-name";
import { updateFamilySchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const family = await prisma.family.findUnique({
    where: { id },
    include: {
      members: { orderBy: { displayName: "asc" } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          event: true,
          memberAccount: { select: { displayName: true } },
        },
      },
    },
  });

  if (!family) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(family);
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
    const parsed = updateFamilySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const old = await prisma.family.findUnique({ where: { id } });
    if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (parsed.data.displayName !== undefined) {
      await assertFamilyDisplayNameAvailable(parsed.data.displayName, id);
    }

    const updated = await prisma.family.update({
      where: { id },
      data: {
        ...parsed.data,
        email: parsed.data.email === "" ? null : parsed.data.email,
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "FAMILY_UPDATED",
      entityType: "Family",
      entityId: id,
      oldValue: old,
      newValue: updated,
    });

    return NextResponse.json(updated);
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
    const existing = await prisma.family.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true, transactions: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (
      existing._count.members > 0 ||
      existing._count.transactions > 0 ||
      existing.balanceCents !== 0
    ) {
      return NextResponse.json({ error: "FAMILY_DELETE_BLOCKED" }, { status: 409 });
    }

    await prisma.family.delete({ where: { id } });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "FAMILY_DELETED",
      entityType: "Family",
      entityId: id,
      oldValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
