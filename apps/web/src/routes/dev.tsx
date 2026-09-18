import { createFileRoute, notFound } from "@tanstack/react-router";

import { Outlet } from "@/lib/navigation";
import { DevChrome } from "@/features/dev/dev-chrome";
import { RoutePending } from "@/features/app-shell/route-status";

export const Route = createFileRoute("/dev")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  ssr: false,
  component: DevLayout,
  pendingComponent: () => <RoutePending label="Opening Dev" />,
  head: () => ({
    meta: [{ title: "Dev | Orch" }],
  }),
});

function DevLayout() {
  return (
    <DevChrome>
      <Outlet />
    </DevChrome>
  );
}
