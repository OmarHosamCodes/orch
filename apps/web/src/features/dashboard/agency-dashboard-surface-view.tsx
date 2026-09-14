import { AlertTriangle, BarChart3 } from "lucide-react";
import { type CSSProperties } from "react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencyProjectHueDot } from "@/features/shared/agency-project-hue-dot";
import { AgencyProjectShareMorph } from "@/features/dashboard/agency-project-share-morph";
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
    rankedProjects,
    totalProjectHours,
    activeTimerByUserId,
    sortedTeamMembers,
    sortedRankedProjects,
    isDark,
    hourBreakdownOpen,
    setHourBreakdownOpen,
    totalButtonId,
    breakdownPanelId,
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
      {summary && summary.totalEntries > 0 ? (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-default pb-3 text-xs">
          <div>
            <span className={agencyLabelClass}>Total time</span>
            <span className={cn("ml-2", agencyMetricClass)}>
              {formatDuration(summary.totalSeconds)}
            </span>
          </div>
          <div className="min-w-0 max-w-xs">
            <span className={agencyLabelClass}>Top project</span>
            <span className="ml-2 truncate font-semibold text-highlighted">
              {summary.topProject?.projectName ?? "None"}
            </span>
          </div>
          <div className="min-w-0 max-w-xs">
            <span className={agencyLabelClass}>Top client</span>
            <span className="ml-2 truncate font-semibold text-highlighted">
              {summary.topClient?.clientName ?? "None"}
            </span>
          </div>
          <div>
            <span className={agencyLabelClass}>Active timers</span>
            <span className={cn("ml-2", agencyMetricClass, "text-primary")}>
              {summary.activeTimerCount}
            </span>
          </div>
        </div>
      ) : null}

      {!summary || summary.totalEntries === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart3 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">No time tracked in this range.</p>
          <p className="mt-1 text-xs text-muted">
            Track time on Work, then adjust filters if needed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 [content-visibility:auto] lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div className={cn(agencyPanelClass, "relative overflow-hidden p-4")}>
              <p className={agencyLabelClass}>Project share</p>
              <AgencyProjectShareMorph
                projects={rankedProjects}
                totalSeconds={summary.totalSeconds}
                externalSeconds={summary.projectShareMetrics.externalSeconds}
                internalSeconds={summary.projectShareMetrics.internalSeconds}
                internalBillableSeconds={summary.projectShareMetrics.internalBillableSeconds}
                paidSeconds={summary.projectShareMetrics.paidSeconds}
                isDark={isDark}
                open={hourBreakdownOpen}
                onOpen={() => setHourBreakdownOpen(true)}
                onClose={() => setHourBreakdownOpen(false)}
                totalButtonId={totalButtonId}
                breakdownPanelId={breakdownPanelId}
              />
            </div>
            <div className={cn(agencyPanelClass, "p-4")}>
              <p className={agencyLabelClass}>Ranked projects</p>
              {rankedProjects.length === 0 ? (
                <p className="mt-4 text-xs text-muted">No project breakdown in this range.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {sortedRankedProjects.map((project) => {
                    const seconds = Math.round(project.hours * 3_600);
                    const share =
                      totalProjectHours > 0 ? (project.hours / totalProjectHours) * 100 : 0;
                    return (
                      <div
                        key={project.projectId}
                        className="grid gap-2 text-xs md:grid-cols-[minmax(12rem,1fr)_6rem_minmax(12rem,1.5fr)_3.5rem] md:items-center"
                      >
                        <div className="group/project flex min-w-0 items-center gap-2">
                          <AgencyProjectHueDot projectId={project.projectId} className="size-2" />
                          <div className="min-w-0">
                            <button
                              type="button"
                              className={cn(
                                "block max-w-full truncate text-left font-semibold text-highlighted transition-colors hover:text-primary",
                                agencyFocusRingClass,
                              )}
                              onClick={() => onSelectProject?.(project.projectId)}
                            >
                              {project.projectName}
                            </button>
                            {project.clientName ? (
                              <button
                                type="button"
                                className={cn(
                                  "block max-w-full truncate text-left text-[10px] font-medium text-muted",
                                  "max-h-0 opacity-0 transition-[max-height,opacity,color] duration-200 ease-out",
                                  "group-hover/project:max-h-4 group-hover/project:opacity-100",
                                  "group-focus-within/project:max-h-4 group-focus-within/project:opacity-100",
                                  "hover:text-highlighted",
                                  agencyFocusRingClass,
                                )}
                                onClick={() => onSelectClient?.(project.clientId)}
                              >
                                {project.clientName}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <span className={cn(agencyMetricClass, "text-muted md:text-right")}>
                          {formatDuration(seconds)}
                        </span>
                        <div className="h-3 overflow-hidden rounded-sm bg-elevated">
                          <ProjectHueFill
                            projectId={project.projectId}
                            className="block h-full"
                            style={{ width: `${Math.max(2, share)}%` }}
                            isDark={isDark}
                          />
                        </div>
                        <span className={cn(agencyMetricClass, "text-muted md:text-right")}>
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
                <table className="w-full min-w-[62rem] text-left text-xs">
                  <thead className="border-b border-default bg-elevated text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">
                        Team member
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        Latest activity
                      </th>
                      <th scope="col" className="px-4 py-2.5">
                        Current
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
                          }
                        : member.latestEntry;

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
                          <td className="max-w-sm px-4 py-3">
                            {activity ? (
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  {isTracking ? (
                                    <span
                                      className="size-1.5 shrink-0 rounded-full bg-primary"
                                      aria-hidden
                                    />
                                  ) : null}
                                  <p className="truncate font-semibold text-highlighted">
                                    {activity.description || "(no description)"}
                                  </p>
                                </div>
                                <p className="truncate text-[11px] text-muted">
                                  {activity.clientName
                                    ? `${activity.projectName} · ${activity.clientName}`
                                    : activity.projectName}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted">No activity</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full bg-elevated px-2 py-1 text-[11px] font-bold text-muted",
                                isTracking && "gap-1.5",
                              )}
                              aria-label={isTracking ? "Timer running" : "Idle"}
                            >
                              {isTracking ? (
                                <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                              ) : null}
                              {isTracking ? "In progress" : "Idle"}
                            </span>
                          </td>
                          <td className={cn("px-4 py-3 text-right", agencyMetricClass)}>
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
    </div>
  );
}
