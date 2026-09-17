import { createFileRoute } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { WorkspaceObjectPage } from "@/pages/workspace-object-page";
import { validateLooseSearch } from "@/lib/router-search";

export const Route = createFileRoute("/_authenticated/object/$id")({
  ssr: false,
  validateSearch: validateLooseSearch,
  component: WorkspaceObjectPage,
  pendingComponent: () => <RoutePending label="Opening object" />,
  head: () => ({
    meta: [{ title: "Knowledge | Orch" }],
  }),
});
