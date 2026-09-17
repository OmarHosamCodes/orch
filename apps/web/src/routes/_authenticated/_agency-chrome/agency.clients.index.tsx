import { createFileRoute } from "@tanstack/react-router";

import { AgencyClientsPage } from "@/pages/agency-clients-page";

export const Route = createFileRoute("/_authenticated/_agency-chrome/agency/clients/")({
  component: AgencyClientsPage,
  head: () => ({
    meta: [{ title: "Clients | Orch" }],
  }),
});
