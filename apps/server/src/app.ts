/**
 * Backend Application Setup (Hono + oRPC)
 *
 * This file configures the main Hono server with:
 * - CORS for cross-origin requests from the frontend
 * - Authentication via Better Auth
 * - oRPC endpoint at /api/app (type-safe RPC layer)
 * - Error handling and logging
 *
 * Entry point: apps/server/src/index.ts
 * Start with: bun run dev (runs on port 7000 via BETTER_AUTH_URL)
 */

import { createContext } from "@orch/api/context";
import { recoverStaleRuns } from "@orch/api/routers/agent/run-service";
import { bootstrapAgencyLiveRedisSubscriber } from "@orch/api/routers/agency-ops/live/live";
import { registerNotificationPushHandler } from "@orch/api/routers/notifications/delivery";
import {
  auth,
  registerPolarOrderPaid,
  registerPolarSubscriptionActive,
} from "@orch/auth";
import { corsOrigins, env, primaryCorsOrigin, resolveSentryRelease } from "@orch/env/server";
import { sentry } from "@sentry/hono/bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { handleAppRouterRequest } from "./lib/handlers";
import { logStartup } from "./lib/startup";
import { registerKnowledgeSourceUploadRoute } from "./lib/knowledge-sources";
import { registerTaskAttachmentUploadRoute } from "./lib/task-attachments";
import { registerTeamAvatarRoutes } from "./lib/team-avatar";
import { registerUserAvatarRoutes } from "./lib/user-avatar";
import {
  authenticateWebSocket,
  handleWebSocketClose,
  handleWebSocketMessage,
  type AgencyWebSocketData,
} from "./lib/ws-handler";
import { startAgentDetectionScheduler } from "./lib/agent-detection";
import { startNotificationDigestScheduler } from "./lib/notification-digest";
import { registerTeamPolarBillingHandlers } from "./lib/register-team-polar-billing";
import { sendWebPushForNotification } from "./lib/web-push";

function getRpcDebugResponse(error: unknown, path: string) {
  /**
   * Format RPC errors with debugging info in development
   * This helps frontend developers understand what went wrong
   */
  const message =
    error instanceof Error && error.message ? error.message : "Unhandled server error";
  const cause =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : error instanceof Error && typeof error.cause === "string"
        ? error.cause
        : undefined;

  return Response.json(
    {
      defined: false,
      code: "INTERNAL_SERVER_ERROR",
      status: 500,
      message,
      data: {
        debug: JSON.stringify(
          {
            procedure: path,
            errorName: error instanceof Error ? error.name : typeof error,
            message,
            cause,
            stack: error instanceof Error ? error.stack : undefined,
          },
          null,
          2,
        ),
      },
    },
    { status: 500 },
  );
}

function createApp() {
  /**
   * Initialize the Hono application
   *
   * Setup order:
   * 1. Sentry middleware - request isolation + unexpected error capture
   * 2. Error handler - catches all errors and logs them
   * 3. Logging - logs incoming requests
   * 4. CORS - enables cross-origin requests from frontend
   * 5. Auth routes - /api/auth/* endpoints from Better Auth
   * 6. Billing redirect - /billing/success for payment webhooks
   * 7. RPC handler - all /api/app/* requests go to oRPC router
   * 8. Health check - GET / returns "OK" for monitoring
   */
  const app = new Hono();

  if (env.SENTRY_DSN) {
    app.use(
      "*",
      sentry(app, {
        dsn: env.SENTRY_DSN,
        environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
        release: resolveSentryRelease(),
        sendDefaultPii: false,
        tracesSampleRate: 1.0,
        ignoreTransactions: [/^GET \/$/],
      }),
    );
  }

  app.onError((error, context) => {
    console.error(error);

    if (env.NODE_ENV === "development" && context.req.path.startsWith("/rpc/")) {
      return getRpcDebugResponse(error, context.req.path);
    }

    return context.text("Internal Server Error", 500);
  });

  app.use(logger());
  app.use(
    "/*",
    cors({
      origin: corsOrigins,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "sentry-trace", "baggage"],
      credentials: true,
    }),
  );

  app.on(["GET", "POST"], "/api/auth/*", (context) => auth.handler(context.req.raw));

  app.get("/billing/success", (context) => {
    const url = new URL("/billing/success", primaryCorsOrigin);
    url.search = new URL(context.req.url).search;
    return context.redirect(url.toString(), 302);
  });

  app.get("/error", (context) => {
    const url = new URL("/login", primaryCorsOrigin);
    url.search = new URL(context.req.url).search;
    return context.redirect(url.toString(), 302);
  });

  registerTaskAttachmentUploadRoute(app);
  registerKnowledgeSourceUploadRoute(app);
  registerUserAvatarRoutes(app);
  registerTeamAvatarRoutes(app);

  app.use("/*", async (context, next) => {
    const requestContext = await createContext({ context });
    const response = await handleAppRouterRequest(context.req.raw, requestContext);

    if (response) {
      return response;
    }

    await next();
  });

  app.get("/", (context) => {
    return context.text("OK");
  });

  return app;
}

const app = createApp();
const port = env.PORT ?? 7000;

registerTeamPolarBillingHandlers({
  registerPolarOrderPaid,
  registerPolarSubscriptionActive,
});
await bootstrapAgencyLiveRedisSubscriber();
registerNotificationPushHandler(sendWebPushForNotification);
startNotificationDigestScheduler();
startAgentDetectionScheduler();
void recoverStaleRuns();

// Log startup information in development
if (env.NODE_ENV === "development") {
  logStartup({
    port,
    baseUrl: env.BETTER_AUTH_URL,
    corsOrigin: corsOrigins.join(", "),
  });
}

export default {
  port,
  fetch(request: Request, server: Bun.Server<AgencyWebSocketData>) {
    const url = new URL(request.url);

    if (url.pathname === "/rpc/ws") {
      const upgraded = server.upgrade(request, {
        data: { request },
      });

      if (upgraded) {
        return undefined;
      }

      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    return app.fetch(request, server);
  },
  websocket: {
    async open(ws: Bun.ServerWebSocket<AgencyWebSocketData>) {
      await authenticateWebSocket(ws, ws.data.request);
    },
    message(ws: Bun.ServerWebSocket<AgencyWebSocketData>, message: string | Buffer) {
      handleWebSocketMessage(ws, message);
    },
    close(ws: Bun.ServerWebSocket<AgencyWebSocketData>) {
      handleWebSocketClose(ws);
    },
  },
};
