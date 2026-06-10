import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createFamilySchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const isActive = req.nextUrl.searchParams.get("isActive");
  const negativeBalanceOnly = req.nextUrl.searchParams.get("negativeBalanceOnly") === "true";

  const families = await prisma.family.findMany({
    where: {
      ...(q ? { displayName: { contains: q, mode: "insensitive" } } : {}),
      ...(isActive === "true" ? { isActive: true } : isActive === "false" ? { isActive: false } : {}),
      ...(negativeBalanceOnly ? { balanceCents: { lt: 0 } } : {}),
    },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json(
    families.map((family) => ({
      id: family.id,
      displayName: family.displayName,
      balanceCents: family.balanceCents,
      phone: family.phone,
      email: family.email,
      notes: family.notes,
      isActive: family.isActive,
      memberCount: family._count.members,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createFamilySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const family = await prisma.family.create({
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
      action: "FAMILY_CREATED",
      entityType: "Family",
      entityId: family.id,
      newValue: family,
    });

    return NextResponse.json(family);
  } catch {
    return NextResponse.json({ error: "Failed to create family" }, { status: 500 });
  }
}
