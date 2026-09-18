import { createFileRoute } from "@tanstack/react-router";

import { AgencyDashboardPage } from "@/pages/agency-dashboard-page";
import { validatePeriodSearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/dashboard")({
  validateSearch: validatePeriodSearch,
  component: AgencyDashboardPage,
  head: () => ({
    meta: [{ title: "Dashboard | Orch" }],
  }),
});
