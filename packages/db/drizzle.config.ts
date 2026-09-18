import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const envPath of [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../apps/server/.env"),
  path.resolve(__dirname, "../../apps/server/.env.local"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, ".env.local"),
]) {
  dotenv.config({ path: envPath, override: false });
}

const databaseUrl =
  process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL || process.env.POSTGRES_URL || "";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
