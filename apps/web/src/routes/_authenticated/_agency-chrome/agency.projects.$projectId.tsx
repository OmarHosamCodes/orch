import { createFileRoute } from "@tanstack/react-router";

import { AgencyProjectDetailPage } from "@/pages/agency-project-detail-page";
import { validateProjectSearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/projects/$projectId")({
  component: AgencyProjectDetailPage,
  validateSearch: validateProjectSearch,
  head: () => ({
    meta: [{ title: "Project | Orch" }],
  }),
});
