import { createFileRoute } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { DevPage } from "@/pages/dev-page";

export const Route = createFileRoute("/dev/")({
  ssr: false,
  component: DevPage,
  pendingComponent: () => <RoutePending label="Opening Dev" />,
  head: () => ({
    meta: [{ title: "Dev | Orch" }],
  }),
});
