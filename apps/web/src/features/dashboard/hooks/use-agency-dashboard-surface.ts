import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { AgencyTimeRangeFilters } from "@/features/shared/use-agency-time-range-filters";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { orpc } from "@/lib/orpc";
import { useAgencyPresenceMembers } from "@/features/shared/agency-queries";

export type UseAgencyDashboardSurfaceProps = {
  teamId: string;
  filters: AgencyTimeRangeFilters;
  policyReady: boolean;
  onSelectProject?: (projectId: string) => void;
  onSelectClient?: (clientId: string) => void;
  onSelectMember?: (userId: string) => void;
};

export type AgencyDashboardSurfaceViewModel = ReturnType<typeof useAgencyDashboardSurface>;

export function useAgencyDashboardSurface({
  teamId,
  filters,
  policyReady,
  onSelectProject,
  onSelectClient,
  onSelectMember,
}: UseAgencyDashboardSurfaceProps) {
  const { range, projectId, memberUserId, clientId, clientIds, projectIds, memberUserIds } =
    filters;
  const { members: presenceMembers } = useAgencyPresenceMembers(teamId);
  const dashboardQuery = useQuery({
    ...orpc.agencyOps.reports.dashboard.queryOptions({
      input: {
        teamId,
        from: range.from,
        to: range.to,
        clientId,
        projectId,
        memberUserId,
        clientIds,
        projectIds,
        memberUserIds,
      },
    }),
    enabled: Boolean(teamId) && policyReady,
    placeholderData: keepPreviousData,
  });

  const summary = dashboardQuery.data?.summary ?? null;
  const rankedProjects = summary?.timeDistributionByProject.slice(0, 10) ?? [];
  const totalProjectHours =
    summary?.timeDistributionByProject.reduce((sum, row) => sum + row.hours, 0) ?? 0;

  const activeTimerByUserId = useMemo(
    () => new Map(presenceMembers.map((member) => [member.userId, member])),
    [presenceMembers],
  );

  const sortedTeamMembers = useMemo(() => {
    const members = summary?.teamMembers ?? [];
    return [...members].sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [summary?.teamMembers]);

  const sortedRankedProjects = useMemo(() => {
    const list = [...rankedProjects];
    return list.sort((a, b) => b.hours - a.hours);
  }, [rankedProjects]);

  const errorMessage = getErrorMessage(dashboardQuery.error, "Try refreshing.");

  return {
    isLoading: dashboardQuery.isLoading || !policyReady,
    isError: dashboardQuery.isError,
    errorMessage,
    summary,
    rankedProjects,
    totalProjectHours,
    activeTimerByUserId,
    sortedTeamMembers,
    sortedRankedProjects,
    isDark: true,
    onSelectProject,
    onSelectClient,
    onSelectMember,
    refetch: () => {
      void dashboardQuery.refetch();
    },
  };
}
