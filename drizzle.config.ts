import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/db.ts",
  out: "./shared/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
