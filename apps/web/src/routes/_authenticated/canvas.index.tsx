import { createFileRoute } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { CanvasBrainsIndex } from "@/features/workspace/canvas-brains";

export const Route = createFileRoute("/_authenticated/canvas/")({
  ssr: false,
  component: CanvasIndexRoute,
  pendingComponent: () => <RoutePending label="Opening Canvas" />,
  head: () => ({
    meta: [{ title: "Canvas | Orch" }],
  }),
});

function CanvasIndexRoute() {
  return (
    <AppShellPage>
      <CanvasBrainsIndex />
    </AppShellPage>
  );
}
