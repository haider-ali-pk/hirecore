import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/*
  Server-only database client (Prisma 7 + pg driver adapter).
  Never import this file from a "use client" component.

  In development Next.js reloads modules often, so the client is cached on
  globalThis to avoid opening a new connection pool on every reload.
*/

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const createClient = () =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}