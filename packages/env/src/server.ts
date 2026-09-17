import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export {
  planForPolarProductId,
  polarCheckoutProducts,
  resolvePolarCatalog,
} from "./polar-catalog";

/**
 * Server environment validation
 *
 * This validates that all required environment variables are set and valid
 * when the server starts. If validation fails, the application will not start.
 *
 * See .env.example and apps/server/.env.example for details on each variable.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required for database connection"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(
        32,
        "BETTER_AUTH_SECRET must be at least 32 characters (generate with: openssl rand -hex 16)",
      ),
    BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL (e.g., http://localhost:7001)"),
    GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required for Google OAuth"),
    GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required for Google OAuth"),
    CORS_ORIGIN: z.url("CORS_ORIGIN must be a valid URL (e.g., http://localhost:7001)"),
    CORS_ORIGINS: z
      .string()
      .optional()
      .describe("Comma-separated extra origins (alias domains) allowed for CORS and Better Auth"),
    OPENROUTER_API_KEY: z
      .string()
      .min(1, "OPENROUTER_API_KEY is required. Get one from https://openrouter.ai/keys"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    POLAR_ACCESS_TOKEN: z.string().min(1, "POLAR_ACCESS_TOKEN is required for payment features"),
    POLAR_WEBHOOK_SECRET: z
      .string()
      .min(1, "POLAR_WEBHOOK_SECRET is required for payment features"),
    POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_PRODUCT_PRO: z.string().min(1, "POLAR_PRODUCT_PRO is required for Pro tier billing"),
    POLAR_PRODUCT_AGENCY: z.string().optional(),
    POLAR_PRODUCT_AGENCY_UNLIMITED: z.string().optional(),
    POLAR_PRODUCT_ORCH_CREDITS: z.string().optional(),
    S3_ENDPOINT: z.string().min(1, "S3_ENDPOINT is required for file storage"),
    S3_REGION: z.string().min(1, "S3_REGION is required for file storage"),
    S3_BUCKET: z.string().min(1, "S3_BUCKET is required for file storage"),
    S3_ACCESS_KEY_ID: z.string().min(1, "S3_ACCESS_KEY_ID is required for file storage"),
    S3_SECRET_ACCESS_KEY: z.string().min(1, "S3_SECRET_ACCESS_KEY is required for file storage"),
    REDIS_URL: z
      .string()
      .min(1, "REDIS_URL is required for live sync (e.g., redis://localhost:6379)"),
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().optional(),
    PORT: z.coerce.number().optional(),
    BRAINIAC_SEED_SCALE: z.enum(["default", "massive"]).optional(),
    BRAINIAC_SEED_PASSWORD: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().optional(),
    SENTRY_RELEASE: z.string().optional(),
    RAILWAY_GIT_COMMIT_SHA: z.string().optional(),
    SOURCE_COMMIT: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: true,
});

function parseCorsOrigins(): string[] {
  const origins = [env.CORS_ORIGIN, env.CORS_ORIGINS]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(origins)];
}

export const corsOrigins = parseCorsOrigins();

const firstCorsOrigin = corsOrigins[0];

if (!firstCorsOrigin) {
  throw new Error(
    "CORS_ORIGIN is required. Set it to the deployed web app origin, for example https://web-orch.up.railway.app",
  );
}

export const primaryCorsOrigin = firstCorsOrigin;

/** Prefer an explicit release, then Railway/source commit SHAs. */
export function resolveSentryRelease(): string | undefined {
  return env.SENTRY_RELEASE || env.RAILWAY_GIT_COMMIT_SHA || env.SOURCE_COMMIT || undefined;
}
