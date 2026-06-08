import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adjustmentSchema } from "@/lib/validation";
import { addAdjustment } from "@/lib/transactions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await addAdjustment(
      id,
      parsed.data.amountCents,
      parsed.data.description,
      session.adminId
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Adjustment failed" }, { status: 500 });
  }
}
