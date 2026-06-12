import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logDbError } from "@/lib/db";
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

    const result = await addPayment(
      id,
      parsed.data.amountCents,
      parsed.data.paymentMethod,
      parsed.data.description,
      session.adminId
    );

    return NextResponse.json(result);
  } catch (error) {
    logDbError(`POST /api/admin/member-accounts/${id}/payment`, error);
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}
