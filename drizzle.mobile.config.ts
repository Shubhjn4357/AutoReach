import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./mobile/services/schema.ts",
  out: "./mobile/drizzle",
  dialect: "sqlite",
});
