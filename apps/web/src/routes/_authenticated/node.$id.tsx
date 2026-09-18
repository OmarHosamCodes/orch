import { createFileRoute } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { NodePage } from "@/pages/node-page";

export const Route = createFileRoute("/_authenticated/node/$id")({
  ssr: false,
  component: NodePage,
  pendingComponent: () => <RoutePending label="Opening node" />,
  head: () => ({
    meta: [{ title: "Page | Orch" }],
  }),
});
