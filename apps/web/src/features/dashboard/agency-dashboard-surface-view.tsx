import { AlertTriangle, BarChart3 } from "lucide-react";
import { type CSSProperties } from "react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencyDashboardHoursInstrument } from "@/features/dashboard/agency-dashboard-hours-instrument";
import { DashboardTeamActivityCellView } from "@/features/dashboard/dashboard-team-activity-cell-view";
import { DashboardTeamMemberActivitySheetView } from "@/features/dashboard/dashboard-team-member-activity-sheet-view";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import { projectHueFor } from "@/features/shared/project-palette";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import { type AgencyDashboardSurfaceViewModel } from "./hooks/use-agency-dashboard-surface";

function relShare(seconds: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return Math.max(2, Math.min(100, (seconds / totalSeconds) * 100));
}

function ProjectHueFill({
  projectId,
  className,
  style,
  isDark,
}: {
  projectId: string;
  className?: string;
  style?: CSSProperties;
  isDark: boolean;
}) {
  const hue = projectHueFor(projectId);
  return (
    <span
      className={className}
      style={{ ...style, backgroundColor: isDark ? hue.dark : hue.light }}
    />
  );
}

function AllocationSegment({
  project,
  totalSeconds,
  isDark,
}: {
  project: {
    projectId: string;
    projectName: string;
    clientName: string;
    seconds: number;
  };
  totalSeconds: number;
  isDark: boolean;
}) {
  const share = totalSeconds > 0 ? (project.seconds / totalSeconds) * 100 : 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="block h-full min-w-1 p-0"
          style={{ width: `${relShare(project.seconds, totalSeconds)}%` }}
          aria-label={`${project.projectName}, ${formatDuration(project.seconds)}, ${share.toFixed(1)} percent`}
        >
          <ProjectHueFill
            projectId={project.projectId}
            className="block size-full"
            isDark={isDark}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="space-y-1 px-3 py-2">
        <p className="font-semibold text-highlighted">{project.projectName}</p>
        <p className="text-muted">{project.clientName || "General"}</p>
        <p className={cn(agencyMetricClass, "text-[11px] text-muted")}>
          {formatDuration(project.seconds)} · {share.toFixed(1)}%
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

type AgencyDashboardSurfaceViewProps = {
  viewModel: AgencyDashboardSurfaceViewModel;
};

export function AgencyDashboardSurfaceView({ viewModel }: AgencyDashboardSurfaceViewProps) {
  const {
    isLoading,
    isError,
    errorMessage,
    summary,
    totalProjectHours,
    activeTimerByUserId,
    sortedTeamMembers,
    sortedRankedProjects,
    selectedMemberSheet,
    openMemberActivity,
    closeMemberActivity,
    isDark,
    onSelectProject,
    onSelectClient,
    onSelectMember,
    refetch,
  } = viewModel;

  if (isLoading) {
    return <SurfaceShimmer className="min-h-72" label="Loading dashboard" />;
  }

  if (isError) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load dashboard.</p>
        <p className="mt-1 text-xs text-muted">{errorMessage}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {!summary || summary.totalEntries === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart3 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">No time tracked in this range.</p>
          <p className="mt-1 text-xs text-muted">
            Track time on Tracker, then adjust filters if needed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="[content-visibility:auto]">
            <AgencyDashboardHoursInstrument
              projects={sortedRankedProjects}
              totalProjectHours={totalProjectHours}
              totalSeconds={summary.totalSeconds}
              externalSeconds={summary.projectShareMetrics.externalSeconds}
              internalSeconds={summary.projectShareMetrics.internalSeconds}
              internalBillableSeconds={summary.projectShareMetrics.internalBillableSeconds}
              paidSeconds={summary.projectShareMetrics.paidSeconds}
              isDark={isDark}
              onSelectProject={onSelectProject}
              onSelectClient={onSelectClient}
            />
          </section>

          <section className={cn(agencyPanelClass, "overflow-hidden")}>
            <header className="flex items-center justify-between border-b border-default px-4 py-3">
              <p className={agencyLabelClass}>Team activity</p>
              <p className={cn(agencyMetricClass, "text-[11px] text-muted")}>
                {summary.teamMembers.length} members
              </p>
            </header>
            <div className="overflow-x-auto">
              <TooltipProvider delayDuration={120}>
                <table className="w-full table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-[14rem]" />
                    <col />
                    <col className="w-[7.5rem]" />
                    <col className="w-[10rem]" />
                  </colgroup>
                  <thead className="border-b border-default bg-elevated text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">
                        Team member
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        Activity
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-right">
                        Total tracked
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        Allocation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-default">
                    {sortedTeamMembers.map((member) => {
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

                      return (
                        <tr
                          key={member.userId}
                          className="transition-colors hover:bg-elevated/55 motion-reduce:transition-none"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <AgencyMemberAvatar
                                name={member.userName}
                                userId={member.userId}
                                avatarUrl={member.avatar}
                                size="md"
                                alt={member.userName}
                              />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  className={cn(
                                    "truncate font-bold text-highlighted hover:underline",
                                    agencyFocusRingClass,
                                  )}
                                  onClick={() => onSelectMember?.(member.userId)}
                                >
                                  {member.userName}
                                </button>
                                <p className="truncate text-[11px] text-muted">
                                  {member.userEmail}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-0 px-4 py-3">
                            <DashboardTeamActivityCellView
                              activity={activity}
                              isTracking={isTracking}
                              onOpen={() => openMemberActivity(member.userId)}
                            />
                          </td>
                          <td
                            className={cn(
                              "whitespace-nowrap px-4 py-3 text-right",
                              agencyMetricClass,
                            )}
                          >
                            {formatDuration(member.totalSeconds)}
                          </td>
                          <td className="px-4 py-3">
                            <div
                              className="flex h-4 overflow-hidden rounded-sm bg-elevated"
                              role="img"
                              aria-label={`Project allocation for ${member.userName}`}
                            >
                              {member.projectBreakdown.length === 0 ? (
                                <span className="h-full w-full bg-muted/30" />
                              ) : (
                                member.projectBreakdown.map((project) => (
                                  <AllocationSegment
                                    key={project.projectId}
                                    project={project}
                                    totalSeconds={member.totalSeconds}
                                    isDark={isDark}
                                  />
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TooltipProvider>
            </div>
          </section>

        </div>
      )}

      <DashboardTeamMemberActivitySheetView
        member={selectedMemberSheet}
        isDark={isDark}
        open={selectedMemberSheet !== null}
        onOpenChange={(open) => {
          if (!open) closeMemberActivity();
        }}
        onOpenProfile={onSelectMember}
      />
    </div>
  );
}
