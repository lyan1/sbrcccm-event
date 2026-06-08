import { NextRequest, NextResponse } from "next/server";
import { loginAdmin } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const success = await loginAdmin(parsed.data.username, parsed.data.password);
    if (!success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { username: parsed.data.username },
    });

    if (admin) {
      await logAudit({
        actorType: "ADMIN",
        actorId: admin.id,
        action: "ADMIN_LOGIN",
        entityType: "AdminUser",
        entityId: admin.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
