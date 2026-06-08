import { SessionOptions } from "iron-session";

function getSessionPassword() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  return "development-only-secret-must-be-32-chars-min!!";
}

export interface AdminSessionData {
  adminId: string;
  username: string;
  isLoggedIn: boolean;
}

export function getSessionOptions(): SessionOptions {
  return {
    password: getSessionPassword(),
    cookieName: "pickleball_admin_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

