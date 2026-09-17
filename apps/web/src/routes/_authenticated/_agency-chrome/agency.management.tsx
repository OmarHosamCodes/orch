import { createFileRoute, redirect } from "@tanstack/react-router";

import { AgencyManagementLayoutPage } from "@/pages/agency-management-layout-page";
import { agencyManagementHref } from "@/features/shared/agency-management-sections";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/management")({
  beforeLoad: ({ location }) => {
    const path =
      location.pathname.length > 1 ? location.pathname.replace(/\/$/, "") : location.pathname;
    if (path === "/agency/management") {
      throw redirect({ href: agencyManagementHref("resourcing"), replace: true });
    }
  },
  component: AgencyManagementLayoutPage,
  head: () => ({
    meta: [{ title: "Management | Orch" }],
  }),
});
