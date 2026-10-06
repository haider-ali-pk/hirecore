import "dotenv/config";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/*
  Bootstraps the platform Super Admin.
  Run with:  npx prisma db seed

  Required in .env:
    SEED_ADMIN_EMAIL     login email
    SEED_ADMIN_PASSWORD  at least 12 characters
  Optional:
    SEED_ADMIN_NAME      display name (default "Platform Admin")

  Remove SEED_ADMIN_PASSWORD from .env once the account exists.
*/

const schema = z.object({
  DIRECT_URL: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  SEED_ADMIN_EMAIL: z.string().email("must be a valid email address"),
  SEED_ADMIN_PASSWORD: z.string().min(12, "must be at least 12 characters"),
  SEED_ADMIN_NAME: z.string().trim().min(1).default("Platform Admin"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Seed configuration is invalid:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const config = parsed.data;
const connectionString = config.DIRECT_URL ?? config.DATABASE_URL;

if (!connectionString) {
  console.error("Neither DIRECT_URL nor DATABASE_URL is set in .env.");
  process.exit(1);
}

async function main() {
  const email = config.SEED_ADMIN_EMAIL.trim().toLowerCase();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });

    if (existing) {
      if (existing.role === "SUPER_ADMIN") {
        console.log(`Super admin ${email} already exists. Nothing to do.`);
      } else {
        console.error(
          `A user with ${email} already exists with role ${existing.role}. ` +
            "Refusing to change it. Use a different SEED_ADMIN_EMAIL."
        );
        process.exitCode = 1;
      }
      return;
    }

    const passwordHash = await bcrypt.hash(config.SEED_ADMIN_PASSWORD, 12);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: config.SEED_ADMIN_NAME,
          passwordHash,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          action: "user.created",
          entityType: "User",
          entityId: user.id,
          metadata: { role: "SUPER_ADMIN", source: "seed" },
        },
      });

      return user;
    });

    console.log(`Created super admin ${email} (id: ${created.id}).`);
    console.log("Remove SEED_ADMIN_PASSWORD from .env now that the account exists.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});