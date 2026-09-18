import { createFileRoute, notFound } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { DevErrorPage } from "@/pages/dev-error-page";

export const Route = createFileRoute("/dev/error")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  ssr: false,
  component: DevErrorPage,
  pendingComponent: () => <RoutePending label="Opening Error Components" />,
  head: () => ({
    meta: [{ title: "Error components | Orch" }],
  }),
});
