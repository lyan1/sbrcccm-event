import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes("?") ? "&" : "?";
  if (url.includes(`${key}=`)) return url;
  return `${url}${separator}${key}=${value}`;
}

function isSupabaseUrl(url: string): boolean {
  return url.includes("supabase.co") || url.includes("supabase.com");
}

/**
 * Supabase's pooler (PgBouncer/Supavisor) breaks Prisma prepared statements.
 *
 * - Development: use DIRECT_URL (port 5432, no pooler) — most reliable locally
 * - Production:  use DATABASE_URL (port 6543) with pgbouncer=true & connection_limit=1
 */
function getDatabaseUrl(): string {
  const isDev = process.env.NODE_ENV === "development";
  const direct = process.env.DIRECT_URL;
  const pooled = process.env.DATABASE_URL;

  if (!pooled && !direct) {
    throw new Error("DATABASE_URL is not set");
  }

  // Local dev: bypass the pooler entirely
  if (isDev && direct) {
    return direct;
  }

  let url = pooled!;

  if (isSupabaseUrl(url)) {
    url = appendQueryParam(url, "pgbouncer", "true");
    url = appendQueryParam(url, "connection_limit", "1");
  }

  return url;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: getDatabaseUrl() },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
