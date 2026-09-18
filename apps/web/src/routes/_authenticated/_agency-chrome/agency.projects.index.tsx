import { createFileRoute } from "@tanstack/react-router";

import { AgencyProjectsPage } from "@/pages/agency-projects-page";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/projects/")({
  component: AgencyProjectsPage,
  head: () => ({
    meta: [{ title: "Projects | Orch" }],
  }),
});
