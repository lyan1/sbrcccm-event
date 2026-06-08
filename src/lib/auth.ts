import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { getSessionOptions, type AdminSessionData } from "./session";

export type { AdminSessionData };
export { getSessionOptions };

export async function getAdminSession() {
  const cookieStore = await cookies();
  return getIronSession<AdminSessionData>(cookieStore, getSessionOptions());
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.isLoggedIn || !session.adminId) {
    return null;
  }
  return session;
}

export async function requireAdminApi() {
  const session = await requireAdmin();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

export async function loginAdmin(username: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { username } });
  if (!admin) return false;

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return false;

  const session = await getAdminSession();
  session.adminId = admin.id;
  session.username = admin.username;
  session.isLoggedIn = true;
  await session.save();

  return true;
}

export async function logoutAdmin() {
  const session = await getAdminSession();
  session.destroy();
}

export function withAdminAuth(
  handler: (req: NextRequest, session: AdminSessionData) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const result = await requireAdminApi();
    if (result.error) return result.error;
    return handler(req, result.session!);
  };
}
