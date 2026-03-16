import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  // Keep a single Prisma client in development to avoid exhausting connections.
  var familyFlowPrisma: PrismaClient | undefined;
}

const BUILD_TIME_DATABASE_URL = "postgresql://familyflow:familyflow@localhost:5432/familyflow?schema=public";
const connectionString =
  process.env.DATABASE_URL ||
  (process.env.npm_lifecycle_event === "build" ? BUILD_TIME_DATABASE_URL : "");

if (!connectionString) {
  throw new Error("DATABASE_URL is required to start FamilyFlow with PostgreSQL.");
}

const adapter = new PrismaPg({ connectionString });

export const db =
  global.familyFlowPrisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.familyFlowPrisma = db;
}

export async function checkDatabaseConnection() {
  const startedAt = Date.now();

  try {
    await db.$queryRawUnsafe("SELECT 1");
    return {
      ok: true as const,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false as const,
      latencyMs: Date.now() - startedAt,
      error,
    };
  }
}
