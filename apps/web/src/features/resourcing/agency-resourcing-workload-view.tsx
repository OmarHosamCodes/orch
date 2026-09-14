import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { MemberProfileLeaveRangePicker } from "@/features/shared/date/member-profile-leave-range-picker";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyMetricClass,
  agencySectionTitleClass,
  agencyWorkMetaClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import type { AgencyResourcingWorkloadViewModel } from "@/features/resourcing/hooks/use-agency-resourcing-workload";
import { shortDisplayName } from "@/features/resourcing/resourcing-team-presence";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { SurfaceShimmer } from "@/ui/skeleton";
import { Textarea } from "@/ui/textarea";

const LEAVE_TYPES = [
  { id: "pto" as const, label: "Paid time off" },
  { id: "other" as const, label: "Personal" },
  { id: "sick" as const, label: "Sick" },
  { id: "team_holiday" as const, label: "Team holiday" },
];

type AgencyResourcingWorkloadViewProps = {
  viewModel: AgencyResourcingWorkloadViewModel;
};

/** Compact leave range for agenda rows — handles same-day, same-month, and cross-month. */
export function formatAgendaRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const startLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (startDate === endDate) return startLabel;
  if (startDate.slice(0, 7) === endDate.slice(0, 7)) {
    return `${startLabel}–${end.getUTCDate()}`;
  }
  const endLabel = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${startLabel} – ${endLabel}`;
}

function LegendSwatch({ tone }: { tone: "present" | "out" }) {
  return (
    <i
      className={cn("size-2 shrink-0 rounded-sm", tone === "present" ? "bg-success" : "bg-warning")}
      aria-hidden
    />
  );
}

function OutPersonRow({
  person,
}: {
  person: AgencyResourcingWorkloadViewModel["selectedOut"][number];
}) {
  return (
    <div className="border-default flex items-center gap-2.5 border-b py-2.5 last:border-b-0">
      <AgencyMemberAvatar name={person.userName} userId={person.userId} className="size-7" />
      <span className="min-w-0">
        <strong className="text-highlighted block truncate text-xs font-semibold">
          {person.userName}
        </strong>
        <small className="text-muted text-xs">{person.leaveReason ?? person.leaveType}</small>
      </span>
      <span className="bg-warning/15 text-warning ms-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold">
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
        Out
      </span>
    </div>
  );
}

export function AgencyResourcingWorkloadView({ viewModel }: AgencyResourcingWorkloadViewProps) {
  const {
    periodTitle,
    focusMonthKey,
    focusMonthLabel,
    activityRows,
    calendarDays,
    weekdayLabels,
    filmstripDays,
    filmstripRangeLabel,
    selectedDate,
    selectedOut,
    selectedOutPreview,
    selectedOutHiddenCount,
    selectedOutExpanded,
    selectedWorkingCount,
    coveragePct,
    briefingDayNumber,
    briefingWeekday,
    briefingHeadline,
    briefingStatus,
    selectedDayLabel,
    selectedDaySummary,
    agenda,
    selectedPersonId,
    selectedPerson,
    selectedPersonOutDays,
    selectedPersonMonthDays,
    memberCount,
    hasActivityData,
    isActivityPending,
    isLeavePending,
    isActivityError,
    isLeaveError,
    activityErrorMessage,
    leaveErrorMessage,
    canManageOffDays,
    canAddTeamHoliday,
    actorUserId,
    leaveRequestOpen,
    leaveRequestPending,
    leaveRequestError,
    leaveRequestDraft,
    goPrevPeriod,
    goNextPeriod,
    selectDate,
    isWeekendDate,
    selectPerson,
    setSelectedOutExpanded,
    openLeaveRequest,
    closeLeaveRequest,
    setLeaveRequestDraft,
    submitLeaveRequest,
    exportCsv,
    refetch,
  } = viewModel;

  const isTeamHoliday = leaveRequestDraft.type === "team_holiday";
  const availableLeaveTypes = LEAVE_TYPES.filter(
    (type) => type.id !== "team_holiday" || canAddTeamHoliday,
  );
  const memberOptions = canManageOffDays
    ? activityRows
    : activityRows.filter((row) => row.userId === actorUserId);

  return (
    <div className="flex w-full flex-col gap-4 pb-2">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className={cn(agencySectionTitleClass, "text-balance")}>Team presence</h1>
          <p className={cn(agencyWorkMetaClass, "mt-1 max-w-2xl text-pretty")}>
            Inspect who is marked out, compare nearby days, and add off days for coverage planning.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="border-default bg-card flex items-center gap-0.5 rounded-full border p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="Previous month"
              onClick={goPrevPeriod}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-highlighted min-w-[7.5rem] px-1 text-center text-sm font-semibold tabular-nums">
              {periodTitle}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="Next month"
              onClick={goNextPeriod}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!hasActivityData}
          >
            Export
          </Button>
          <Button type="button" size="sm" onClick={openLeaveRequest}>
            Add off days
          </Button>
        </div>
      </header>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {briefingStatus}
      </p>

      {isActivityError ? (
        <div
          className="border-destructive/40 bg-destructive/5 text-foreground flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3"
          role="alert"
        >
          <AlertTriangle className="text-destructive size-4 shrink-0" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Couldn&apos;t load team presence.</span>{" "}
            {activityErrorMessage}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : null}

      {!isActivityError && isLeaveError ? (
        <div
          className="border-warning/40 bg-warning/5 text-foreground flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3"
          role="status"
        >
          <AlertTriangle className="text-warning size-4 shrink-0" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Upcoming off days are unavailable.</span>{" "}
            {leaveErrorMessage}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : null}

      {isActivityPending ? (
        <SurfaceShimmer className="min-h-[36rem]" label="Loading team presence" />
      ) : isActivityError ? null : (
        <>
          <section className="border-default bg-card grid shrink-0 gap-4 rounded-surface border px-surface py-surface sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex items-start gap-4 sm:items-center">
              <div className="border-default bg-muted/50 grid size-14 shrink-0 place-items-center rounded-xl border">
                <strong className="text-highlighted font-mono text-xl font-medium leading-none tabular-nums">
                  {briefingDayNumber}
                </strong>
                <span className="text-muted mt-1 text-[11px] font-semibold tracking-wide">
                  {briefingWeekday}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="text-highlighted text-lg font-semibold tracking-tight text-balance sm:text-xl">
                  {briefingHeadline}
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                  selectedOut.length > 0
                    ? "bg-warning/15 text-warning"
                    : "bg-success/15 text-success",
                )}
              >
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {selectedOut.length} out
              </span>
              <span className="bg-muted text-muted-foreground rounded-full px-3 py-1.5 font-mono text-xs font-medium tabular-nums">
                {coveragePct}% present
              </span>
            </div>
          </section>

          <div className="grid shrink-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
            <div className="flex min-w-0 flex-col gap-4">
              <section className="border-default bg-card overflow-hidden rounded-surface border">
                <header className="border-default flex flex-wrap items-start gap-3 border-b px-4 py-3.5">
                  <div className="min-w-0">
                    <h2 className={agencyWorkTitleClass}>{focusMonthLabel} presence</h2>
                    <p className={agencyWorkMetaClass}>Select a day to inspect who is marked out</p>
                  </div>
                  <div className={cn(agencyWorkMetaClass, "ms-auto flex items-center gap-4")}>
                    <span className="inline-flex items-center gap-1.5">
                      <LegendSwatch tone="present" />
                      Not marked out
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <LegendSwatch tone="out" />
                      Out
                    </span>
                  </div>
                </header>
                <div className="overflow-x-auto">
                  <div className="min-w-[40rem]">
                    <div
                      className="bg-muted/40 text-muted grid grid-cols-7 border-b border-border text-[11px] font-semibold"
                      aria-hidden
                    >
                      {weekdayLabels.map((label) => (
                        <span key={label} className="px-2 py-2">
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {calendarDays.map((cell, index) => {
                        if (!cell.date || cell.dayOfMonth == null) {
                          return (
                            <div
                              key={`pad-${index}`}
                              className="bg-muted/30 min-h-[5.5rem] border-e border-b border-border p-2.5 [&:nth-child(7n)]:border-e-0"
                            />
                          );
                        }
                        const weekend = isWeekendDate(cell.date);
                        const selected = cell.date === selectedDate;
                        const outPreview = cell.out.slice(0, 3);
                        const outOverflow = Math.max(0, cell.out.length - outPreview.length);
                        const hasOut = cell.out.length > 0;
                        return (
                          <button
                            key={cell.date}
                            type="button"
                            disabled={weekend}
                            aria-pressed={selected}
                            aria-label={`${focusMonthLabel} ${cell.dayOfMonth}: ${cell.working.length} not marked out, ${cell.out.length} out`}
                            onClick={() => selectDate(cell.date!)}
                            className={cn(
                              "relative min-h-[5.5rem] border-e border-b border-border p-2.5 text-start transition-colors duration-150 ease-out",
                              shellFocusRingClass,
                              "[&:nth-child(7n)]:border-e-0",
                              weekend
                                ? "bg-muted/35 text-muted cursor-default"
                                : "bg-card hover:bg-muted/40",
                              hasOut && !weekend && "bg-warning/5",
                              selected && !weekend && "z-[1] ring-primary ring-2 ring-inset",
                            )}
                          >
                            <span className="flex items-center justify-between font-mono text-xs font-medium tabular-nums">
                              <span>{cell.dayOfMonth}</span>
                              {!weekend && hasOut ? (
                                <span className="text-warning font-semibold">
                                  {cell.out.length} out
                                </span>
                              ) : null}
                            </span>
                            {weekend ? (
                              <span className="text-muted mt-2 block text-xs">Weekend</span>
                            ) : hasOut ? (
                              <>
                                <span className="mt-2.5 flex ps-1">
                                  {outPreview.map((person) => (
                                    <AgencyMemberAvatar
                                      key={person.userId}
                                      name={person.userName}
                                      userId={person.userId}
                                      className="border-card -ms-1 size-6 border-2 first:ms-0"
                                    />
                                  ))}
                                  {outOverflow > 0 ? (
                                    <span className="border-card bg-muted text-muted -ms-1 grid size-6 place-items-center rounded-full border-2 text-[10px] font-semibold">
                                      +{outOverflow}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="text-warning mt-2 block truncate text-xs">
                                  {cell.out
                                    .slice(0, 2)
                                    .map((person) => shortDisplayName(person.userName))
                                    .join(", ")}
                                  {cell.out.length > 2 ? ` +${cell.out.length - 2}` : ""}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted mt-3 block text-xs">All clear</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="border-default bg-card overflow-hidden rounded-surface border">
                <header className="border-default flex flex-wrap items-start gap-3 border-b px-4 py-3.5">
                  <div className="min-w-0">
                    <h2 className={agencyWorkTitleClass}>Nearby days</h2>
                    <p className={agencyWorkMetaClass}>
                      Compare marked-out counts around the selected day
                    </p>
                  </div>
                  {filmstripRangeLabel ? (
                    <span className="text-muted ms-auto font-mono text-xs tabular-nums">
                      {filmstripRangeLabel}
                    </span>
                  ) : null}
                </header>
                {filmstripDays.length === 0 ? (
                  <p className={cn(agencyWorkMetaClass, "px-4 py-6")}>
                    Select a weekday to compare nearby presence.
                  </p>
                ) : (
                  <div className="bg-border grid auto-cols-[minmax(5.5rem,1fr)] grid-flow-col gap-px overflow-x-auto sm:grid-flow-row sm:grid-cols-10">
                    {filmstripDays.map((day) => {
                      const selected = day.date === selectedDate;
                      const heightPct =
                        day.memberCount > 0
                          ? Math.round((day.workingCount / day.memberCount) * 100)
                          : 0;
                      const zeroCoverage = day.workingCount === 0 && day.memberCount > 0;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          aria-pressed={selected}
                          aria-label={`${day.weekdayShort} ${day.dayOfMonth}: ${day.workingCount} not marked out`}
                          onClick={() => selectDate(day.date)}
                          className={cn(
                            "bg-card flex min-h-36 flex-col items-center px-2 py-3 transition-colors duration-150 ease-out",
                            shellFocusRingClass,
                            selected
                              ? "bg-muted/50 shadow-[inset_0_-2px_0_0_var(--color-primary)]"
                              : "hover:bg-muted/30",
                            zeroCoverage && "bg-warning/5",
                          )}
                        >
                          <span className="text-muted text-[11px] font-semibold tracking-wide">
                            {day.weekdayShort}
                          </span>
                          <strong className="text-highlighted mt-0.5 font-mono text-xs font-medium tabular-nums">
                            {day.dayOfMonth}
                          </strong>
                          <span
                            className="bg-muted mt-3 flex h-16 w-6 items-end overflow-hidden rounded-t-md rounded-b-sm"
                            aria-hidden
                          >
                            <span
                              className={cn(
                                "w-full rounded-t-[5px] rounded-b-sm transition-[height] duration-200 ease-out motion-reduce:transition-none",
                                zeroCoverage ? "bg-warning" : "bg-foreground",
                              )}
                              style={{ height: `${heightPct}%` }}
                            />
                          </span>
                          <small
                            className={cn(
                              "mt-2 text-xs",
                              zeroCoverage ? "text-warning font-semibold" : "text-muted",
                            )}
                          >
                            {day.workingCount} present
                          </small>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <aside
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"
              aria-label="Selected day and upcoming off days"
            >
              <section className="border-default bg-card rounded-surface border p-surface">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className={agencyWorkTitleClass}>{selectedDayLabel}</h2>
                    <p className={cn(agencyWorkMetaClass, "mt-1")}>{selectedDaySummary}</p>
                  </div>
                  <div className="bg-muted/50 shrink-0 rounded-xl px-3 py-2 text-center">
                    <strong className={cn(agencyMetricClass, "block text-xl font-semibold")}>
                      {selectedWorkingCount}
                    </strong>
                    <span className="text-muted text-[11px]">of {memberCount} present</span>
                  </div>
                </div>
                <div className="border-default mt-4 border-t">
                  {selectedOut.length === 0 ? (
                    <div className="bg-muted/50 mt-3.5 rounded-xl px-3.5 py-3 text-xs text-muted">
                      <strong className="text-foreground">No one is marked out.</strong>
                      <br />
                      No off-day exceptions for this day.
                    </div>
                  ) : (
                    <div className="mt-1">
                      {selectedOutPreview.map((person) => (
                        <OutPersonRow key={person.userId} person={person} />
                      ))}
                      {selectedOutHiddenCount > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-1 w-full justify-center"
                          aria-expanded={selectedOutExpanded}
                          onClick={() => setSelectedOutExpanded(!selectedOutExpanded)}
                        >
                          {selectedOutExpanded
                            ? "Show fewer"
                            : `Show ${selectedOutHiddenCount} more`}
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </section>

              <section className="border-default bg-card overflow-hidden rounded-surface border">
                <header className="border-default border-b px-4 py-3.5">
                  <h2 className={agencyWorkTitleClass}>Upcoming off days</h2>
                  <p className={agencyWorkMetaClass}>Next exceptions needing coverage</p>
                </header>
                <div className="px-4 py-1">
                  {isLeavePending ? (
                    <SurfaceShimmer className="min-h-24 my-3" label="Loading off days" />
                  ) : agenda.length === 0 ? (
                    <p className={cn(agencyWorkMetaClass, "py-4")}>
                      No upcoming off days in this window.
                    </p>
                  ) : (
                    agenda.map((item) => (
                      <div
                        key={item.id}
                        className="border-default grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b py-3 last:border-b-0"
                      >
                        <span className="min-w-0">
                          <strong className="text-highlighted block truncate text-xs font-semibold">
                            {item.userName}
                          </strong>
                          <small className="text-muted block text-xs">
                            {item.type}
                            <span className="text-muted/80">
                              {" "}
                              · {formatAgendaRange(item.startDate, item.endDate)}
                            </span>
                          </small>
                        </span>
                        <span className="text-muted shrink-0 font-mono text-xs font-medium tabular-nums">
                          {item.daySpan} {item.daySpan === 1 ? "day" : "days"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>

          <section className="border-default bg-card shrink-0 overflow-hidden rounded-surface border">
            <header className="border-default flex flex-wrap items-start gap-3 border-b px-4 py-3.5">
              <div className="min-w-0">
                <h2 className={agencyWorkTitleClass}>Person availability</h2>
                <p className={agencyWorkMetaClass}>
                  Select a teammate to inspect their {focusMonthLabel} off days
                </p>
              </div>
              <div className={cn(agencyWorkMetaClass, "ms-auto flex items-center gap-4")}>
                <span className="inline-flex items-center gap-1.5">
                  <LegendSwatch tone="present" />
                  Working
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LegendSwatch tone="out" />
                  Has off days
                </span>
              </div>
            </header>
            <div
              className="bg-muted/40 border-default flex gap-2 overflow-x-auto border-b px-4 py-3"
              role="group"
              aria-label="Select team member"
            >
              {activityRows.map((row) => {
                const active = row.userId === selectedPersonId;
                const hasLeave = row.heatMap.days.some(
                  (day) => day.date.startsWith(focusMonthKey) && day.off,
                );
                return (
                  <button
                    key={row.userId}
                    type="button"
                    aria-pressed={active}
                    aria-label={`View ${row.userName}${hasLeave ? ", has off days" : ""}`}
                    title={row.userName}
                    onClick={() => selectPerson(row.userId)}
                    className={cn(
                      "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-0.5 transition-shadow duration-150 ease-out",
                      shellFocusRingClass,
                      active && "ring-primary ring-2",
                    )}
                  >
                    <AgencyMemberAvatar
                      name={row.userName}
                      userId={row.userId}
                      size="md"
                      className={cn(hasLeave && "ring-warning/50 ring-1")}
                    />
                  </button>
                );
              })}
            </div>
            {selectedPerson ? (
              <div className="grid items-start gap-5 p-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-center">
                <div className="flex items-center gap-2.5">
                  <AgencyMemberAvatar
                    name={selectedPerson.userName}
                    userId={selectedPerson.userId}
                    size="md"
                  />
                  <div className="min-w-0">
                    <h3 className="text-highlighted truncate text-sm font-semibold">
                      {selectedPerson.userName}
                    </h3>
                    <p className={agencyWorkMetaClass}>
                      {selectedPersonOutDays === 0
                        ? `No off days in ${focusMonthLabel}`
                        : `${selectedPersonOutDays} ${selectedPersonOutDays === 1 ? "day" : "days"} out in ${focusMonthLabel}`}
                    </p>
                  </div>
                </div>
                <div
                  className="grid grid-cols-7 gap-1.5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))]"
                  role="list"
                  aria-label={`${selectedPerson.userName} ${focusMonthLabel} availability`}
                >
                  {selectedPersonMonthDays.map((day) => (
                    <span
                      key={day.date}
                      role="listitem"
                      className={cn(
                        "border-default text-muted grid aspect-square min-h-7 place-items-center rounded-md border font-mono text-[11px] font-medium tabular-nums",
                        day.off && "border-warning/50 bg-warning/15 text-foreground",
                      )}
                      aria-label={`${day.date}: ${day.off ? day.off.type : "not marked out"}`}
                      title={day.off ? (day.off.reason ?? day.off.type) : "Not marked out"}
                    >
                      {Number(day.date.slice(8, 10))}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className={cn(agencyWorkMetaClass, "p-4")}>
                {hasActivityData ? "No teammates in this month." : "No presence data yet."}
              </p>
            )}
          </section>
        </>
      )}

      <Dialog
        open={leaveRequestOpen}
        onOpenChange={(open) => {
          if (open) openLeaveRequest();
          else closeLeaveRequest();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogDescription className="text-muted text-xs font-semibold tracking-wide uppercase">
              Resourcing
            </DialogDescription>
            <DialogTitle>Add off days</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitLeaveRequest();
            }}
          >
            {!isTeamHoliday ? (
              <div className={agencyFormFieldClass}>
                <Label htmlFor="resourcing-leave-member" className={agencyFormLabelClass}>
                  Team member
                </Label>
                <Select
                  value={leaveRequestDraft.userId || undefined}
                  onValueChange={(value) => setLeaveRequestDraft({ userId: value })}
                  disabled={!canManageOffDays && memberOptions.length <= 1}
                >
                  <SelectTrigger id="resourcing-leave-member" className="w-full">
                    <SelectValue placeholder="Select a teammate" />
                  </SelectTrigger>
                  <SelectContent>
                    {memberOptions.map((row) => (
                      <SelectItem key={row.userId} value={row.userId}>
                        {row.userName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className={agencyFormFieldClass}>
              <Label htmlFor="resourcing-leave-range" className={agencyFormLabelClass}>
                Dates
              </Label>
              <MemberProfileLeaveRangePicker
                triggerId="resourcing-leave-range"
                startDate={leaveRequestDraft.startDate}
                endDate={leaveRequestDraft.endDate}
                emptyLabel="Select off day dates"
                ariaLabel="Off day date range"
                onRangeChange={(next) =>
                  setLeaveRequestDraft({ startDate: next.startDate, endDate: next.endDate })
                }
              />
            </div>
            <div className={agencyFormFieldClass}>
              <Label htmlFor="resourcing-leave-type" className={agencyFormLabelClass}>
                Off day type
              </Label>
              <Select
                value={leaveRequestDraft.type || undefined}
                onValueChange={(value) =>
                  setLeaveRequestDraft({
                    type: value as (typeof LEAVE_TYPES)[number]["id"],
                  })
                }
              >
                <SelectTrigger id="resourcing-leave-type" className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {availableLeaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isTeamHoliday ? (
                <p className={cn(agencyWorkMetaClass, "mt-1")}>
                  Applies to the whole team for the selected dates.
                </p>
              ) : null}
            </div>
            <div className={agencyFormFieldClass}>
              <Label htmlFor="resourcing-leave-note" className={agencyFormLabelClass}>
                Note <span className="font-normal text-muted-foreground">optional</span>
              </Label>
              <Textarea
                id="resourcing-leave-note"
                value={leaveRequestDraft.reason}
                onChange={(event) => setLeaveRequestDraft({ reason: event.target.value })}
                placeholder="Coverage or handoff details"
              />
            </div>
            {leaveRequestError ? (
              <p className="text-sm text-destructive" role="alert">
                {leaveRequestError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeLeaveRequest}>
                Cancel
              </Button>
              <Button type="submit" disabled={leaveRequestPending}>
                {leaveRequestPending ? "Saving…" : "Save off days"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
