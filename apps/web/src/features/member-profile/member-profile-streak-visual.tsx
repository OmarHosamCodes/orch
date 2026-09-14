import type { StreakSegmentState } from "@/features/member-profile/member-profile-attendance-streak";
import type { GaugeStreakVisual } from "@/features/member-profile/member-profile-gauge-detail";
import { StreakChainGlyph } from "@/features/member-profile/member-profile-instrument-plate";
import { agencyWorkMetaClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type Props = {
  streak: GaugeStreakVisual;
  className?: string;
};

function segmentLegend(state: StreakSegmentState, label: string) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-2.5 w-4 rounded-sm",
          state === "present" && "bg-success",
          state === "missed" && "border border-border bg-muted/40",
          state === "off" && "border border-dashed border-border bg-transparent",
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function MemberProfileStreakVisual({ streak, className }: Props) {
  const coveragePct = Math.round(streak.monthCoverageRatio * 100);
  const atBest = streak.currentStreak >= streak.bestInMonth && streak.bestInMonth > 0;

  const ariaLabel = `${streak.calendarLabel}. Current streak ${streak.currentStreak} days. Best this month ${streak.bestInMonth}. ${streak.monthPresentDays} of ${streak.monthWorkingDays} working days logged.`;

  return (
    <div className={cn("space-y-5", className)} role="group" aria-label={ariaLabel}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{streak.calendarLabel}</p>
          <p className={cn(agencyWorkMetaClass, "mt-0.5 font-mono tabular-nums")}>
            {streak.monthPresentDays} / {streak.monthWorkingDays} working days
          </p>
        </div>
        <div className="text-end">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Best
          </p>
          <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
            {streak.bestInMonth}
          </p>
        </div>
      </div>

      <div className="flex items-end gap-2.5">
        <span
          className={cn(
            "font-mono text-4xl font-semibold leading-none tracking-tight tabular-nums",
            streak.currentStreak > 0 ? "text-success" : "text-foreground",
          )}
        >
          {streak.currentStreak}
        </span>
        <span className="pb-1 text-sm text-muted-foreground">
          day streak{streak.currentStreak === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
        <p className="mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Recent working days
        </p>
        <div
          className={cn(
            "h-9 w-full",
            streak.currentStreak > 0 ? "text-success" : "text-foreground",
          )}
        >
          <StreakChainGlyph segments={streak.segments} className="h-full w-full" />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.625rem] text-muted-foreground">
          {segmentLegend("present", "Logged")}
          {segmentLegend("missed", "Missed")}
          {segmentLegend("off", "Off")}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-foreground">Month attendance</p>
          <p className="font-mono text-xs font-semibold tabular-nums text-foreground">
            {coveragePct}%
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.min(100, coveragePct)}%` }}
          />
        </div>
        <p className={cn(agencyWorkMetaClass, "mt-2 text-foreground/70")}>
          {streak.monthPresentDays} logged
          {streak.monthWorkingDays > streak.monthPresentDays
            ? ` · ${streak.monthWorkingDays - streak.monthPresentDays} open`
            : " · full month"}
        </p>
      </div>

      {atBest ? (
        <p className={cn(agencyWorkMetaClass, "text-success")}>
          At your best run this month. Keep logging to extend it.
        </p>
      ) : streak.daysToBest > 0 ? (
        <p className={agencyWorkMetaClass}>
          <span className="font-mono tabular-nums text-foreground">{streak.daysToBest}</span> more
          consecutive day{streak.daysToBest === 1 ? "" : "s"} to match your{" "}
          <span className="font-mono tabular-nums text-foreground">{streak.bestInMonth}</span>-day
          best.
        </p>
      ) : streak.monthPresentDays === 0 ? (
        <p className={agencyWorkMetaClass}>Log time on a working day to start a streak.</p>
      ) : null}
    </div>
  );
}
