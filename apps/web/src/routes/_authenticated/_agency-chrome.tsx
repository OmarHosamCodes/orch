import { createFileRoute } from "@tanstack/react-router";

import { RouteError, RouteNotFound, RoutePending } from "@/features/app-shell/route-status";
import { AgencyPage } from "@/pages/agency-page";

export const Route = createFileRoute("/_authenticated/_agency-chrome")({
  component: AgencyPage,
  pendingComponent: () => <RoutePending label="Opening Agency" />,
  errorComponent: ({ error, reset }) => (
    <RouteError message="Couldn't open Agency." error={error} reset={reset} />
  ),
  notFoundComponent: RouteNotFound,
  head: () => ({
    meta: [{ title: "Agency | Orch" }],
  }),
});
