import { createFileRoute } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { CanvasPage } from "@/pages/canvas-page";

export const Route = createFileRoute("/_authenticated/canvas/$workspaceId")({
  ssr: false,
  component: CanvasPage,
  pendingComponent: () => <RoutePending label="Opening Canvas" />,
  head: () => ({
    meta: [{ title: "Canvas | Orch" }],
  }),
});
