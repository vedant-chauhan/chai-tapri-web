import { defineConfig } from "drizzle-kit";

// One migration tool for every environment (DATABASE.md §6). `pnpm db:generate` writes SQL to
// db/migrations (reviewed and committed); `pnpm db:migrate` applies it (scripts/migrate.ts).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./db/migrations",
  strict: true,
  verbose: true,
});
