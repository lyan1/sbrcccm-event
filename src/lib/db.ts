import { PrismaClient } from "@prisma/client";

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes("?") ? "&" : "?";
  if (url.includes(`${key}=`)) return url;
  return `${url}${separator}${key}=${value}`;
}

function isSupabaseUrl(url: string): boolean {
  return url.includes("supabase.co") || url.includes("supabase.com");
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

  let url = pooled!;

  if (isSupabaseUrl(url)) {
    url = appendQueryParam(url, "pgbouncer", "true");
    url = appendQueryParam(url, "connection_limit", "1");
    url = appendQueryParam(url, "pool_timeout", "30");
    url = appendQueryParam(url, "connect_timeout", "15");
  }

  return url;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDbError(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    return ["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code);
  }
  const message = String(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes("connection pool") ||
    message.includes("Max client connections")
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
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableDbError(error) || attempt === 2) throw error;
      await sleep(150 * (attempt + 1));
    }
  }
  throw lastError;
}
