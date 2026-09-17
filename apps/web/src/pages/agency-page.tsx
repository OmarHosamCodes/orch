import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "@/lib/navigation";

import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { ShellBootSurface } from "@/features/app-shell/components/shell-boot-surface";
import {
  shellPageBodyClass,
  shellPageNestClass,
  shellPageScrollClass,
} from "@/features/app-shell/app-shell-ui";
import { AgencyProUpsell } from "@/features/billing/agency-pro-upsell";
import { useBilling } from "@/features/billing/billing-queries";
import { useAgencyActiveTimerQuery } from "@/features/shared/agency-queries";
import { AgencyPlaceholderSurface } from "@/features/shared/agency-placeholder-surface";
import {
  agencySegmentFromPathname,
  agencySegmentLabel,
  type AgencySegmentId,
} from "@/features/shared/agency-segments";
import { AGENCY_PAGE_SCROLL_ATTR } from "@/features/shared/agency-ui";
import { useAgencyOptimisticStore } from "@/features/shared/stores/agency-optimistic";
import { useAgencyBootGate } from "@/features/shared/use-agency-boot-gate";
import { useAgencyJourneyLiveSync } from "@/features/task-management/hooks/use-agency-journey-live-sync";
import { teamListQueryOptions } from "@/features/team/team-queries";
import { useTeamStore } from "@/features/team/team-store";
import { setAgencyTimeTrackingUserId } from "@/features/time-tracking/stores/agency-time-tracking";
import { useCurrentAgencyTeam } from "@/features/time-tracking/stores/agency-timer";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

function panelIdFor(segmentId: AgencySegmentId) {
  return `agency-panel-${segmentId}`;
}

export function AgencyPage() {
  const { user } = useAuthSession();
  const authEnabled = Boolean(user);
  const currentUserId = user?.id ?? "";
  const location = useLocation();
  const segment = agencySegmentFromPathname(location.pathname) ?? "work";
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const syncSelectedTeam = useTeamStore((s) => s.syncSelectedTeam);

  const { limits, billingQuery } = useBilling(selectedTeamId);
  const agencyEnabled = Boolean(limits.agencyOps);
  const billingGatePending = billingQuery.isPending;
  const showAgencyUpsell = !billingGatePending && !agencyEnabled;

  const teamsQuery = useQuery({
    ...teamListQueryOptions(),
    enabled: authEnabled,
  });

  const teams = teamsQuery.data?.items ?? [];

  useEffect(() => {
    syncSelectedTeam(teams);
  }, [teams, syncSelectedTeam]);

  const { setCurrentAgencyTeamId } = useCurrentAgencyTeam();

  useEffect(() => {
    setCurrentAgencyTeamId(selectedTeamId || null);
  }, [selectedTeamId, setCurrentAgencyTeamId]);

  useEffect(() => {
    setAgencyTimeTrackingUserId(currentUserId || null);
  }, [currentUserId]);

  const previousTeamIdRef = useRef<string | null>(null);
  useEffect(() => {
    const previousTeamId = previousTeamIdRef.current;
    if (previousTeamId && previousTeamId !== selectedTeamId) {
      useAgencyOptimisticStore.getState().resetTeam(previousTeamId);
    }
    previousTeamIdRef.current = selectedTeamId || null;
  }, [selectedTeamId]);

  const agencySyncTeamId = agencyEnabled && selectedTeamId ? selectedTeamId : "";
  useAgencyActiveTimerQuery(agencySyncTeamId);
  useAgencyJourneyLiveSync({ teamId: agencySyncTeamId });

  const { isBooting, bootLabel } = useAgencyBootGate({
    segment,
    teamId: selectedTeamId,
    userId: currentUserId,
    agencyEnabled,
    teamsCount: teams.length,
    showAgencyUpsell,
    teamsQuery,
    billingQuery,
    pathname: location.pathname,
  });

  const isFullHeightSegment = segment === "work" || segment === "management";

  return (
    <AppShellPage>
      <div
        className={cn(
          "flex h-full min-h-0 flex-col bg-background text-foreground",
          isFullHeightSegment ? "overflow-hidden" : "overflow-y-auto",
        )}
        {...{ [AGENCY_PAGE_SCROLL_ATTR]: "" }}
      >
        <main className={isFullHeightSegment ? shellPageNestClass : shellPageScrollClass}>
          <ShellBootSurface
            booting={isBooting}
            label={bootLabel}
            fill={isFullHeightSegment || isBooting}
          >
            {showAgencyUpsell ? (
              <AgencyProUpsell />
            ) : teams.length === 0 ? (
              <AgencyPlaceholderSurface
                icon="i-lucide-users"
                title="No team yet"
                body="Create a team in your workspace to start using agency tools."
                hints={["Use the team control in the top bar to create or join a team."]}
              />
            ) : (
              <div className={cn(shellPageBodyClass, isFullHeightSegment && "min-h-0 flex-1 pt-0")}>
                <div
                  role="tabpanel"
                  id={panelIdFor(segment)}
                  aria-label={agencySegmentLabel(segment)}
                  className={cn(isFullHeightSegment && "flex min-h-0 flex-1 flex-col")}
                >
                  <Outlet />
                </div>
              </div>
            )}
          </ShellBootSurface>
        </main>
      </div>
    </AppShellPage>
  );
}
