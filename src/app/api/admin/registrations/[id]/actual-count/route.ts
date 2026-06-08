import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { actualCountSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = actualCountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const reg = await prisma.eventRegistration.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (reg.event.status === "COMPLETED") {
      return NextResponse.json({ error: "Event completed" }, { status: 400 });
    }

    const updated = await prisma.eventRegistration.update({
      where: { id },
      data: {
        actualParticipantCount: parsed.data.actualParticipantCount,
        adminNote: parsed.data.adminNote,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
