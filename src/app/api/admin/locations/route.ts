import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eventLocationSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locations = await prisma.eventLocation.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = eventLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const location = await prisma.eventLocation.create({
      data: {
        name: parsed.data.name.trim(),
        address: parsed.data.address.trim(),
      },
    });

    await logAudit({
      actorType: "ADMIN",
      actorId: session.adminId,
      action: "LOCATION_CREATED",
      entityType: "EventLocation",
      entityId: location.id,
      newValue: location,
    });

    return NextResponse.json(location);
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Location name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
