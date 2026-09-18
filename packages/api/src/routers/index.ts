import type { RouterClient } from "@orpc/server";

import { agencyOpsRouter } from "./agency-ops";
import { agentRouter } from "./agent/router";
import { billingRouter } from "./billing/router";
import { notificationsRouter } from "./notifications/router";
import { onboardingRouter } from "./onboarding/router";
import { systemRouter } from "./system";
import { teamRouter } from "./team/router";
import { workspaceRouter } from "./workspace/router";

type AppRouterShape = {
  agent: typeof agentRouter;
  agencyOps: typeof agencyOpsRouter;
  billing: typeof billingRouter;
  notifications: typeof notificationsRouter;
  onboarding: typeof onboardingRouter;
  healthCheck: (typeof systemRouter)["healthCheck"];
  privateData: (typeof systemRouter)["privateData"];
  team: typeof teamRouter;
  workspace: typeof workspaceRouter;
};

export const appRouter: AppRouterShape = {
  agent: agentRouter,
  agencyOps: agencyOpsRouter,
  billing: billingRouter,
  notifications: notificationsRouter,
  onboarding: onboardingRouter,
  ...systemRouter,
  team: teamRouter,
  workspace: workspaceRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
