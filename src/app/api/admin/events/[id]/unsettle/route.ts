import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reopenSettlement } from "@/lib/settlement";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const event = await prisma.pickleballEvent.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (event.status === "CANCELLED") {
      return NextResponse.json({ error: "Cancelled events cannot be reopened" }, { status: 400 });
    }

    await reopenSettlement(id, session.adminId);
    const updated = await prisma.pickleballEvent.findUnique({ where: { id } });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reopen failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
