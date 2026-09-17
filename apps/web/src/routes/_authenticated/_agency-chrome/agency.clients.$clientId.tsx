import { createFileRoute } from "@tanstack/react-router";

import { AgencyClientDetailPage } from "@/pages/agency-client-detail-page";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/clients/$clientId")({
  component: AgencyClientDetailPage,
  head: () => ({
    meta: [{ title: "Client | Orch" }],
  }),
});
