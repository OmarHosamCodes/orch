import { createFileRoute } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { FirstRun } from "@/features/first-run/first-run";

export const Route = createFileRoute("/_authenticated/welcome")({
  component: FirstRun,
  pendingComponent: () => <RoutePending variant="logo" label="Opening Orch" />,
  head: () => ({
    meta: [{ title: "Welcome | Orch" }],
  }),
});
