import { createFileRoute } from "@tanstack/react-router";

import { AgencyManagementPeoplePage } from "@/pages/agency-management-people-page";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/management/people")({
  component: AgencyManagementPeoplePage,
  head: () => ({
    meta: [{ title: "People | Orch" }],
  }),
});
