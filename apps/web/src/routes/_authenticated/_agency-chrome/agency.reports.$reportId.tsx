import { createFileRoute } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { AgencyReportDetailPage } from "@/pages/agency-report-detail-page";
import { validateReportSearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/reports/$reportId")({
  ssr: false,
  validateSearch: validateReportSearch,
  component: AgencyReportDetailPage,
  pendingComponent: () => <RoutePending label="Opening report" />,
  head: () => ({
    meta: [{ title: "Report | Orch" }],
  }),
});
