import { PrismaClient } from "@prisma/client";

function isSupabaseUrl(url: string): boolean {
  return url.includes("supabase.co") || url.includes("supabase.com");
}

function isSupabasePoolerUrl(url: string): boolean {
  return isSupabaseUrl(url) && (url.includes(":6543") || url.includes("pooler.supabase.com"));
}

/**
 * Normalize pooled Supabase URLs so Prisma disables prepared statements.
 * Malformed env values (e.g. `postgres??pgbouncer=true`) are parsed incorrectly
 * and cause "prepared statement already exists" errors on Supavisor.
 */
function normalizeSupabasePooledUrl(url: string): string {
  const parsed = new URL(url);
  parsed.search = "";
  parsed.searchParams.set("pgbouncer", "true");
  parsed.searchParams.set("connection_limit", "1");
  parsed.searchParams.set("pool_timeout", "30");
  parsed.searchParams.set("connect_timeout", "15");
  return parsed.toString();
}

/**
 * Supabase Supavisor (transaction mode, port 6543) for Vercel serverless.
 *
 * - Development: DIRECT_URL (port 5432) bypasses the pooler
 * - Production: DATABASE_URL (port 6543) with pgbouncer=true & connection_limit=1
 */
function getDatabaseUrl(): string {
  const isDev = process.env.NODE_ENV === "development";
  const direct = process.env.DIRECT_URL;
  const pooled = process.env.DATABASE_URL;

  if (!pooled && !direct) {
    throw new Error("DATABASE_URL is not set");
  }

  if (isDev && direct) {
    return direct;
  }

  const url = pooled!;

  if (isSupabasePoolerUrl(url)) {
    return normalizeSupabasePooledUrl(url);
  }

  return url;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDbError(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code?: unknown; meta?: { code?: unknown } };
    const code = String(prismaError.code);
    if (["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code)) {
      return true;
    }
    // Supavisor transaction pooler: prepared statement name collision (42P05)
    if (code === "P2010" && prismaError.meta?.code === "42P05") {
      return true;
    }
  }
  const message = String(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes("connection pool") ||
    message.includes("Max client connections") ||
    message.includes("prepared statement") && message.includes("already exists")
  );
}

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: { url: getDatabaseUrl() },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

export function logDbError(context: string, error: unknown): void {
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code?: string; message?: string };
    console.error(`${context}: [${prismaError.code}] ${prismaError.message}`);
    return;
  }
  console.error(context, error);
}

export async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableDbError(error) || attempt === 4) throw error;
      await sleep(250 * (attempt + 1));
    }
  }
  throw lastError;
}
