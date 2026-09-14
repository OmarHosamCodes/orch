import { useEffect, type ReactNode } from "react";
import { useLocation } from "@/lib/navigation";

import { AppShellContextBar } from "@/features/app-shell/app-shell-context-bar";
import { AppShellRail, AppShellRailOverlays } from "@/features/app-shell/app-shell-rail";
import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { useAppUpdateStore } from "@/features/app-shell/app-update-store";
import { useAppUpdateWatcher } from "@/features/app-shell/hooks/use-app-update-watcher";
import { useAppShellStore, useShellMode } from "@/features/app-shell/app-shell-store";
import { useAgencyTrackingFavicon } from "@/features/time-tracking/hooks/use-agency-time-tracker";
import { useAgencyActiveTimerQuery } from "@/features/shared/agency-queries";
import { WorkspaceAgentHost } from "@/features/workspace-agent/workspace-agent-host";
import { cn } from "@/lib/utils";
import { useCurrentAgencyTeamStore } from "@/features/time-tracking/stores/agency-timer";

export function AppShell({ children }: { children: ReactNode }) {
  const agencyTeamId = useCurrentAgencyTeamStore((s) => s.currentAgencyTeamId) ?? "";
  const activeTimer = useAgencyActiveTimerQuery(agencyTeamId).data?.timer ?? null;
  useAgencyTrackingFavicon(Boolean(activeTimer));
  useAppUpdateWatcher();
  const isRefreshing = useAppUpdateStore((s) => s.isRefreshing);

  const location = useLocation();
  const setCurrentPath = useAppShellStore((s) => s.setCurrentPath);
  const shellMode = useShellMode();

  const railPinned = useAppShellStore((s) => s.railPinned);
  const toggleCommandPalette = useAppShellStore((s) => s.toggleCommandPalette);

  const isSpatialMode = shellMode === "spatial";

  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname, setCurrentPath]);

  useEffect(() => {
    function handleShellShortcuts(event: KeyboardEvent) {
      const isMac = /mac|iphone|ipad/i.test(navigator.platform);
      const modifier = isMac ? event.metaKey : event.ctrlKey;
      if (!modifier || event.shiftKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        toggleCommandPalette();
      }
    }

    window.addEventListener("keydown", handleShellShortcuts);
    return () => window.removeEventListener("keydown", handleShellShortcuts);
  }, [toggleCommandPalette]);

  return (
    <div
      className={cn(
        "app-shell orch-grain-surface",
        isSpatialMode ? "app-shell--spatial" : "app-shell--execution",
        railPinned && "app-shell--rail-pinned",
      )}
    >
      <AppShellRail />
      <AppShellContextBar />
      <main className="app-shell__main relative">
        <div className="app-shell__page-well relative min-h-0 flex-1">
          {children}
          {isRefreshing ? (
            <div className="absolute inset-0 z-[2]">
              <LogoLoader placement="slot" label="Applying the update" />
            </div>
          ) : null}
        </div>
      </main>
      <AppShellRailOverlays />
      <WorkspaceAgentHost />
    </div>
  );
}
