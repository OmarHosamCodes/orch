import { createFileRoute } from "@tanstack/react-router";

import { AgencyManagementMoneyPage } from "@/pages/agency-management-money-page";
import { validateMoneySearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/management/money")({
  validateSearch: validateMoneySearch,
  component: AgencyManagementMoneyPage,
  head: () => ({
    meta: [{ title: "Money | Orch" }],
  }),
});
