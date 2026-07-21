import "server-only";

import { PrismaClient } from "../node_modules/.prisma/auth-client";

const globalForAuthPrisma = globalThis as unknown as {
  authPrisma?: PrismaClient;
};

export const authPrisma =
  globalForAuthPrisma.authPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForAuthPrisma.authPrisma = authPrisma;
}
