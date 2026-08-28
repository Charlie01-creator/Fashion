import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env";
import { logger } from "./logger";

/**
 * Singleton PrismaClient. In dev, hot-reload (tsx watch) can otherwise spawn
 * a new client per reload and exhaust the Postgres connection pool — the
 * globalThis cache below is the standard Prisma-recommended workaround.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isProduction ? ["error", "warn"] : ["error", "warn", "query"],
  });

if (!isProduction) {
  global.__prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info("Database connected");
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Database disconnected");
}
