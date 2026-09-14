import { defineRailway, github, preserve, project, service } from "railway/iac";

// Named partial: Internal Tools also hosts Usefull/hygiene-qa services.
// omit=delete must only apply to web, never Postgres/Redis or other apps.
export const partial = "web";

export default defineRailway(() => {
  const web = service("web", {
    source: github("OmarHosamCodes/orch", { branch: "dev" }),
    build: "bun install && bun run build",
    start: "bun run start",
    preDeploy: "bun run --cwd packages/db db:push",
    healthcheck: "/",
    healthcheckTimeout: 300,
    deploy: {
      restartPolicyMaxRetries: 3,
      limitOverride: {
        containers: {
          cpu: 1,
          memoryBytes: 1_000_000_000,
        },
      },
    },
    domains: [
      { domain: "orch.school-of-marketing.com", port: 8080 },
      { domain: "brainiac.school-of-marketing.com", port: 8080 },
    ],
    env: {
      BETTER_AUTH_URL: "https://orch.school-of-marketing.com",
      CORS_ORIGIN: "https://orch.school-of-marketing.com",
      CORS_ORIGINS: "https://brainiac.school-of-marketing.com",
      BETTER_AUTH_SECRET: preserve(),
      DATABASE_URL: preserve(),
      GOOGLE_CLIENT_ID: preserve(),
      GOOGLE_CLIENT_SECRET: preserve(),
      INTERNAL_API_PORT: preserve(),
      NODE_ENV: preserve(),
      OPENROUTER_API_KEY: preserve(),
      POLAR_ACCESS_TOKEN: preserve(),
      POLAR_PRODUCT_PRO: preserve(),
      POLAR_SERVER: preserve(),
      POLAR_WEBHOOK_SECRET: preserve(),
      REDIS_URL: preserve(),
      S3_ACCESS_KEY_ID: preserve(),
      S3_BUCKET: preserve(),
      S3_ENDPOINT: preserve(),
      S3_REGION: preserve(),
      S3_SECRET_ACCESS_KEY: preserve(),
      SENTRY_AUTH_TOKEN: preserve(),
      SENTRY_DSN: preserve(),
      SENTRY_ENVIRONMENT: preserve(),
      SENTRY_ORG: preserve(),
      SENTRY_PROJECT: preserve(),
      VAPID_PRIVATE_KEY: preserve(),
      VAPID_PUBLIC_KEY: preserve(),
      VAPID_SUBJECT: preserve(),
      VITE_PUBLIC_SENTRY_DSN: preserve(),
      VITE_PUBLIC_VAPID_KEY: preserve(),
    },
  });

  return project("Internal Tools", {
    resources: [web],
  });
});
