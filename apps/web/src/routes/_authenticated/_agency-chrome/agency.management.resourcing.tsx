import { createFileRoute } from "@tanstack/react-router";

import { AgencyManagementResourcingPage } from "@/pages/agency-management-resourcing-page";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/management/resourcing")(
  {
    component: AgencyManagementResourcingPage,
    head: () => ({
      meta: [{ title: "Resourcing | Orch" }],
    }),
  },
);
