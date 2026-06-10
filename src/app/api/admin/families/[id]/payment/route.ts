import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentSchema } from "@/lib/validation";
import { addPayment } from "@/lib/transactions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const family = await prisma.family.findUnique({
      where: { id },
      include: { members: { where: { isActive: true }, take: 1, select: { id: true } } },
    });
    if (!family) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (family.members.length === 0) {
      return NextResponse.json({ error: "FAMILY_HAS_NO_MEMBERS" }, { status: 400 });
    }

    const result = await addPayment(
      family.members[0].id,
      parsed.data.amountCents,
      parsed.data.paymentMethod,
      parsed.data.description,
      session.adminId
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}
