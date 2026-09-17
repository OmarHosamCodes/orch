import { createFileRoute } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { AgencyReportsPage } from "@/pages/agency-reports-page";
import { validateReportSearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/reports/")({
  ssr: false,
  validateSearch: validateReportSearch,
  component: AgencyReportsPage,
  pendingComponent: () => <RoutePending label="Opening Reports" />,
  head: () => ({
    meta: [{ title: "Reports | Orch" }],
  }),
});
