import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import type { AgencyTimeRangeFilters } from "@/features/shared/use-agency-time-range-filters";
import { agencyTeamCapabilities } from "@/features/shared/agency-team-capabilities";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { orpc } from "@/lib/orpc";
import { useAgencyPresenceMembers } from "@/features/shared/agency-queries";
import { type DashboardTeamMemberSheetMember } from "@/features/dashboard/dashboard-team-member-types";
import { teamDetailQueryOptions } from "@/features/team/team-queries";

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
  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });
  const canViewTeamSummary = agencyTeamCapabilities(teamQuery.data?.role).isOwner;
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
    enabled: Boolean(teamId) && policyReady && canViewTeamSummary,
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

  const [selectedMemberUserId, setSelectedMemberUserId] = useState<string | null>(null);

  const selectedMemberSheet = useMemo((): DashboardTeamMemberSheetMember | null => {
    if (!selectedMemberUserId) return null;
    const member = sortedTeamMembers.find((row) => row.userId === selectedMemberUserId);
    if (!member) return null;

    const liveTimer = activeTimerByUserId.get(member.userId);
    const isTracking = Boolean(liveTimer) || member.isActive;
    const activity = liveTimer
      ? {
          description: liveTimer.description,
          projectName: liveTimer.projectName,
          clientName: liveTimer.clientName ?? null,
          startedAt: liveTimer.startedAt,
        }
      : member.latestEntry
        ? {
            description: member.latestEntry.description,
            projectName: member.latestEntry.projectName,
            clientName: member.latestEntry.clientName,
            startedAt: member.latestEntry.startedAt,
          }
        : null;

    return {
      userId: member.userId,
      userName: member.userName,
      userEmail: member.userEmail,
      avatar: member.avatar,
      totalSeconds: member.totalSeconds,
      isTracking,
      activity,
      projectBreakdown: member.projectBreakdown,
    };
  }, [activeTimerByUserId, selectedMemberUserId, sortedTeamMembers]);

  const openMemberActivity = useCallback((userId: string) => {
    setSelectedMemberUserId(userId);
  }, []);

  const closeMemberActivity = useCallback(() => {
    setSelectedMemberUserId(null);
  }, []);

  const sortedRankedProjects = useMemo(() => {
    const list = [...rankedProjects];
    return list.sort((a, b) => b.hours - a.hours);
  }, [rankedProjects]);

  const errorMessage = getErrorMessage(dashboardQuery.error, "Try refreshing.");

  return {
    isLoading:
      teamQuery.isPending || (canViewTeamSummary && (dashboardQuery.isLoading || !policyReady)),
    canViewTeamSummary,
    isError: dashboardQuery.isError,
    errorMessage,
    summary,
    rankedProjects,
    totalProjectHours,
    activeTimerByUserId,
    sortedTeamMembers,
    sortedRankedProjects,
    selectedMemberUserId,
    selectedMemberSheet,
    openMemberActivity,
    closeMemberActivity,
    isDark: true,
    onSelectProject,
    onSelectClient,
    onSelectMember,
    refetch: () => {
      void dashboardQuery.refetch();
    },
  };
}
