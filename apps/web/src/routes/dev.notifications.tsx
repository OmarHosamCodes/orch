import { createFileRoute, notFound } from "@tanstack/react-router";

import { RoutePending } from "@/features/app-shell/route-status";
import { DevNotificationsPage } from "@/pages/dev-notifications-page";

export const Route = createFileRoute("/dev/notifications")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  ssr: false,
  component: DevNotificationsPage,
  pendingComponent: () => <RoutePending label="Opening Notifications" />,
  head: () => ({
    meta: [{ title: "Notifications (dev) — Orch" }],
  }),
});
