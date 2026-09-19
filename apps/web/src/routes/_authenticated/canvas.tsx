import { createFileRoute } from "@tanstack/react-router";

import { Outlet } from "@/lib/navigation";

export const Route = createFileRoute("/_authenticated/canvas")({
  ssr: false,
  component: CanvasRouteLayout,
});

function CanvasRouteLayout() {
  return <Outlet />;
}
