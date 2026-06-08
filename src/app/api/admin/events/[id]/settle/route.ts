import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { settlementSchema } from "@/lib/validation";
import { confirmSettlement } from "@/lib/settlement";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = settlementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await confirmSettlement(
      id,
      parsed.data.totalCostCents,
      parsed.data.items,
      session.adminId
    );

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Settlement failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
