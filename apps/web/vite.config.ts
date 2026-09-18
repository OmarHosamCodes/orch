import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

import "@orch/env/vite";

function resolveAppBuildId(): string {
  return (
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.SOURCE_COMMIT ||
    process.env.VITE_APP_BUILD_ID ||
    `build-${Date.now()}`
  );
}

function appVersionPlugin(buildId: string): Plugin {
  return {
    name: "orch-app-version",
    async writeBundle(outputOptions) {
      const outDir = outputOptions.dir;
      if (!outDir) return;
      await mkdir(outDir, { recursive: true });
      await writeFile(
        path.join(outDir, "version.json"),
        `${JSON.stringify({ buildId }, null, 2)}\n`,
      );
    },
  };
}

function hasSentryUploadCredentials(env: Record<string, string>): boolean {
  return Boolean(
    (process.env.SENTRY_AUTH_TOKEN || env.SENTRY_AUTH_TOKEN) &&
    (process.env.SENTRY_ORG || env.SENTRY_ORG) &&
    (process.env.SENTRY_PROJECT || env.SENTRY_PROJECT),
  );
}

const MARKETING_PRERENDER_PATHS = new Set(["/", "/privacy", "/terms", "/login"]);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const serverUrl =
    process.env.VITE_PUBLIC_SERVER_URL ??
    process.env.NUXT_PUBLIC_SERVER_URL ??
    env.VITE_PUBLIC_SERVER_URL ??
    env.NUXT_PUBLIC_SERVER_URL;
  const sentryDsn = process.env.VITE_PUBLIC_SENTRY_DSN ?? env.VITE_PUBLIC_SENTRY_DSN ?? "";
  const appBuildId = resolveAppBuildId();
  const shouldUploadSourceMaps = hasSentryUploadCredentials(env);

  return {
    define: {
      __BRAINIAC_SERVER_URL__: JSON.stringify(serverUrl ?? ""),
      __APP_BUILD_ID__: JSON.stringify(appBuildId),
      __SENTRY_DSN__: JSON.stringify(sentryDsn),
    },
    resolve: {
      tsconfigPaths: true,
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 7001,
      strictPort: true,
      proxy: {
        // Match apps/web/scripts/railway-ssr-server.mjs so first-party asset URLs work in dev.
        "/api": {
          target: "http://localhost:7000",
          changeOrigin: true,
        },
        "/rpc": {
          target: "http://localhost:7000",
          changeOrigin: true,
          ws: true,
        },
        "/uploads": {
          target: "http://localhost:7000",
          changeOrigin: true,
        },
        "/billing": {
          target: "http://localhost:7000",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 7001,
      strictPort: true,
    },
    build: {
      sourcemap: shouldUploadSourceMaps ? "hidden" : false,
    },
    optimizeDeps: {
      include: [
        "better-auth/react",
        "@orpc/client",
        "@orpc/client/fetch",
        "@orpc/tanstack-query",
        "@tanstack/react-query",
        "zod",
      ],
    },
    plugins: [
      tailwindcss(),
      tanstackStart({
        prerender: {
          enabled: true,
          crawlLinks: false,
          filter: ({ path: prerenderPath }) => MARKETING_PRERENDER_PATHS.has(prerenderPath),
        },
      }),
      react(),
      appVersionPlugin(appBuildId),
      ...(shouldUploadSourceMaps
        ? [
            sentryVitePlugin({
              org: process.env.SENTRY_ORG || env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT || env.SENTRY_PROJECT,
              authToken: process.env.SENTRY_AUTH_TOKEN || env.SENTRY_AUTH_TOKEN,
              release: {
                name: appBuildId,
              },
              sourcemaps: {
                filesToDeleteAfterUpload: ["./dist/**/*.map"],
              },
            }),
          ]
        : []),
    ],
  };
});
