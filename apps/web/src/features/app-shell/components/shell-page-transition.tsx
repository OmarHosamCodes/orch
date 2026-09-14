import { Outlet, useLocation } from "@/lib/navigation";

import { resolveShellMode } from "@/features/app-shell/app-navigation";
import { shellContentFrameClass } from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";

/** Authenticated route outlet — no page-enter fade; navigation commits instantly. */
export function ShellPageTransition() {
  const location = useLocation();
  const isSpatial = resolveShellMode(location.pathname) === "spatial";

  return (
    <div className={cn("h-full min-h-0", !isSpatial && shellContentFrameClass)}>
      <Outlet />
    </div>
  );
}
