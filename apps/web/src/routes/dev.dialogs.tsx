import { createFileRoute, notFound } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { DevDialogsPage } from "@/pages/dev-dialogs-page";

export const Route = createFileRoute("/dev/dialogs")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  // Dialogs are client-interactive; skip SSR like Tracker/Reports.
  // Public in dev so Sample mode works logged-out; Real data mode needs a session.
  ssr: false,
  component: DevDialogsPage,
  pendingComponent: () => <RoutePending label="Opening Dialogs" />,
  head: () => ({
    meta: [{ title: "Dev dialogs | Orch" }],
  }),
});
