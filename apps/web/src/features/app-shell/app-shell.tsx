import { useEffect, useState, type ReactNode } from "react";

import { GlobalGrain } from "@/components/global-grain";
import { useLocation } from "@/lib/navigation";

import { AppShellContextBar } from "@/features/app-shell/app-shell-context-bar";
import { AppShellRail, AppShellRailOverlays } from "@/features/app-shell/app-shell-rail";
import { SurfaceShimmer } from "@/ui/skeleton";
import { useAppUpdateStore } from "@/features/app-shell/app-update-store";
import { useAppUpdateWatcher } from "@/features/app-shell/hooks/use-app-update-watcher";
import { useAppShellStore, useShellMode } from "@/features/app-shell/app-shell-store";
import { useAgencyTrackingFavicon } from "@/features/time-tracking/hooks/use-agency-time-tracker";
import { useAgencyActiveTimerQuery } from "@/features/shared/agency-queries";
import { WorkspaceAgentHost } from "@/features/workspace-agent/workspace-agent-host";
import { scheduleIdle } from "@/lib/schedule-idle";
import { cn } from "@/lib/utils";
import { useCurrentAgencyTeamStore } from "@/features/time-tracking/stores/agency-timer";
import { TeamSeatInviteDialog } from "@/features/team/team-seat-invite-dialog";

export function AppShell({ children }: { children: ReactNode }) {
  const agencyTeamId = useCurrentAgencyTeamStore((s) => s.currentAgencyTeamId) ?? "";
  const activeTimer = useAgencyActiveTimerQuery(agencyTeamId).data?.timer ?? null;
  useAgencyTrackingFavicon(Boolean(activeTimer));
  useAppUpdateWatcher();
  const isRefreshing = useAppUpdateStore((s) => s.isRefreshing);

  const location = useLocation();
  const setCurrentPath = useAppShellStore((s) => s.setCurrentPath);
  const shellMode = useShellMode();

  const toggleCommandPalette = useAppShellStore((s) => s.toggleCommandPalette);

  const isSpatialMode = shellMode === "spatial";
  const [agentReady, setAgentReady] = useState(false);

  useEffect(() => scheduleIdle(() => setAgentReady(true)), []);

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
    <div className={cn("app-shell", isSpatialMode ? "app-shell--spatial" : "app-shell--execution")}>
      <GlobalGrain />
      <AppShellRail />
      <AppShellContextBar />
      <main className="app-shell__main relative">
        <div className="app-shell__page-well relative min-h-0 flex-1">
          {children}
          {isRefreshing ? (
            <SurfaceShimmer overlay className="z-[2]" label="Applying the update" />
          ) : null}
        </div>
      </main>
      <AppShellRailOverlays />
      {agentReady ? <WorkspaceAgentHost /> : null}
      <TeamSeatInviteDialog />
    </div>
  );
}
