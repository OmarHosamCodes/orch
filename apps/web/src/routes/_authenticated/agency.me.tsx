import { createFileRoute } from "@tanstack/react-router";

import { AgencyMemberProfilePage } from "@/pages/agency-member-profile-page";
import { validateProfileSearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/agency/me")({
  validateSearch: validateProfileSearch,
  component: AgencyMemberProfilePage,
  head: () => ({
    meta: [{ title: "Profile | Orch" }],
  }),
});
