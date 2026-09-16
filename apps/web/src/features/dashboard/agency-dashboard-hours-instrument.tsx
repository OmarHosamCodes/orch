import { type CSSProperties, useMemo } from "react";

import { DashboardHoursPlates } from "@/features/dashboard/dashboard-hours-plate-view";
import { buildDashboardHoursPlates } from "@/features/dashboard/dashboard-hours-plate-signal";
import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import {
  buildHourBreakdownSegments,
  type AgencyHourBreakdownMetrics,
} from "@/features/shared/agency-hour-breakdown-metrics";
import {
  agencyFocusRingClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import { projectHueFor } from "@/features/shared/project-palette";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

type RankedProject = {
  projectId: string;
  projectName: string;
  colorHueId?: number | null;
  iconKey?: string | null;
  clientId: string;
  clientName: string;
  hours: number;
};

function ProjectHueFill({
  projectId,
  colorHueId,
  className,
  style,
  isDark,
}: {
  projectId: string;
  colorHueId?: number | null;
  className?: string;
  style?: CSSProperties;
  isDark: boolean;
}) {
  const hue = projectHueFor(projectId, colorHueId);
  return (
    <span
      className={className}
      style={{ ...style, backgroundColor: isDark ? hue.dark : hue.light }}
    />
  );
}

function RankedProjectsList({
  projects,
  totalProjectHours,
  isDark,
  onSelectProject,
  onSelectClient,
}: {
  projects: RankedProject[];
  totalProjectHours: number;
  isDark: boolean;
  onSelectProject?: (projectId: string) => void;
  onSelectClient?: (clientId: string) => void;
}) {
  if (projects.length === 0) {
    return <p className="text-xs text-muted">No project breakdown in this range.</p>;
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => {
        const seconds = Math.round(project.hours * 3_600);
        const share = totalProjectHours > 0 ? (project.hours / totalProjectHours) * 100 : 0;
        return (
          <div
            key={project.projectId}
            className="grid gap-2 text-xs md:grid-cols-[minmax(12rem,1fr)_6rem_minmax(12rem,1.5fr)_3.5rem] md:items-center"
          >
            <div className="flex min-w-0 items-center gap-2">
              <AgencyEntityMark
                name={project.projectName}
                projectId={project.projectId}
                iconKey={project.iconKey}
                colorHueId={project.colorHueId}
              />
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
                      "block max-w-full truncate text-left text-[10px] font-medium text-muted hover:text-highlighted",
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
                colorHueId={project.colorHueId}
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
  );
}

export type AgencyDashboardHoursInstrumentProps = AgencyHourBreakdownMetrics & {
  projects: RankedProject[];
  totalProjectHours: number;
  isDark: boolean;
  onSelectProject?: (projectId: string) => void;
  onSelectClient?: (clientId: string) => void;
};

export function AgencyDashboardHoursInstrument({
  projects,
  totalProjectHours,
  totalSeconds,
  externalSeconds,
  internalSeconds,
  internalBillableSeconds,
  paidSeconds,
  isDark,
  onSelectProject,
  onSelectClient,
}: AgencyDashboardHoursInstrumentProps) {
  const metrics = {
    totalSeconds,
    externalSeconds,
    internalSeconds,
    internalBillableSeconds,
    paidSeconds,
  };
  const hourPlates = useMemo(
    () => buildDashboardHoursPlates(metrics),
    [totalSeconds, externalSeconds, internalSeconds, internalBillableSeconds, paidSeconds],
  );
  const segments = buildHourBreakdownSegments(metrics);
  const qualitySummary = segments
    .map((segment) => `${segment.label} ${formatDuration(segment.seconds)}`)
    .join(". ");

  return (
    <section className={cn(agencyPanelClass, "relative overflow-x-hidden p-4")} aria-label="Hours">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className={agencyLabelClass}>Hours</p>
          <p className="sr-only">{qualitySummary}</p>
        </div>
        <div className="text-right">
          <span className={cn(agencyLabelClass, "block")}>Tracked</span>
          <p className={cn(agencyMetricClass, "text-lg leading-none tabular-nums")}>
            {formatDuration(totalSeconds)}
          </p>
        </div>
      </header>

      <div className="mt-4">
        <DashboardHoursPlates plates={hourPlates} />
      </div>

      <div className="mt-5 border-t border-default pt-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className={agencyLabelClass}>Projects by tracked time</p>
          <p className={cn(agencyMetricClass, "text-[11px] text-muted")}>
            Top {projects.length} · Share of {formatDuration(totalSeconds)}
          </p>
        </div>
        <RankedProjectsList
          projects={projects}
          totalProjectHours={totalProjectHours}
          isDark={isDark}
          onSelectProject={onSelectProject}
          onSelectClient={onSelectClient}
        />
      </div>
    </section>
  );
}
