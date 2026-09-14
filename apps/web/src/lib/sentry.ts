import * as Sentry from "@sentry/react";
import type { AnyRouter } from "@tanstack/react-router";

import { parameterizeTransactionName } from "@/lib/sentry-transaction-name";

declare const __APP_BUILD_ID__: string;
declare const __SENTRY_DSN__: string;

function resolveSentryDsn(): string | undefined {
  const dsn = typeof __SENTRY_DSN__ === "string" ? __SENTRY_DSN__ : "";
  return dsn.length > 0 ? dsn : undefined;
}

function resolveSentryRelease(): string | undefined {
  const release = typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "";
  return release.length > 0 ? release : undefined;
}

const sentryDsn = resolveSentryDsn();

export const isSentryEnabled = Boolean(sentryDsn) && import.meta.env.PROD;

let browserSentryInitialized = false;

export function initBrowserSentry(router: AnyRouter): void {
  if (browserSentryInitialized || typeof window === "undefined" || !sentryDsn) {
    return;
  }

  browserSentryInitialized = true;

  Sentry.init({
    dsn: sentryDsn,
    enabled: import.meta.env.PROD,
    environment: import.meta.env.PROD ? "production" : "development",
    release: resolveSentryRelease(),
    sendDefaultPii: false,
    ignoreErrors: ["TimeoutError", /signal timed out/i, /Failed to fetch/i],
    integrations: [
      Sentry.tanstackRouterBrowserTracingIntegration(router, {
        beforeStartSpan: (context) => ({
          ...context,
          name: parameterizeTransactionName(context.name ?? ""),
        }),
      }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/orch\.school-of-marketing\.com/,
      /^https:\/\/brainiac\.school-of-marketing\.com/,
      /^https:\/\/web-orch\.up\.railway\.app/,
      /^\//,
    ],
  });
}

export { Sentry };
