import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI (migrate, studio) needs the direct/session connection.
    // The app itself uses DATABASE_URL (the pooler) at runtime through the pg adapter.
    url: env("DIRECT_URL"),
  },
});