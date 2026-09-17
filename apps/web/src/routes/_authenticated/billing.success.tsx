import { createFileRoute } from "@tanstack/react-router";

import { BillingSuccessPage } from "@/pages/billing-success-page";
import { validateLooseSearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/billing/success")({
  validateSearch: validateLooseSearch,
  component: BillingSuccessPage,
  head: () => ({
    meta: [{ title: "Billing | Orch" }],
  }),
});
