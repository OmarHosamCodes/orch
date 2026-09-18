import { createFileRoute } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { AgencyTrackerPage } from "@/pages/agency-tracker-page";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/")({
  ssr: false,
  component: AgencyTrackerPage,
  pendingComponent: () => <RoutePending label="Opening Tracker" />,
  head: () => ({
    meta: [{ title: "Tracker | Orch" }],
  }),
});
