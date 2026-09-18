import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { MemberProfileLeaveRangePicker } from "@/features/shared/date/member-profile-leave-range-picker";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  agencyErrorPanelClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyLabelClass,
  agencyPanelClass,
  agencySectionTitleClass,
  agencyWorkMetaClass,
  agencyWorkMetricClass,
  agencyWorkTimeRangeClass,
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
      <span className="text-warning ms-auto inline-flex items-center gap-1.5 text-xs font-semibold">
        <LegendSwatch tone="out" />
        Out
      </span>
    </div>
  );
}

function UpcomingOffDayRow({
  item,
}: {
  item: AgencyResourcingWorkloadViewModel["agenda"][number];
}) {
  const durationLabel = item.daySpan === 1 ? "day" : "days";

  return (
    <div className="flex items-start gap-3 py-3.5 sm:py-4">
      <AgencyMemberAvatar
        name={item.userName}
        userId={item.userId}
        size="md"
        className="size-9 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className={cn(agencyWorkTitleClass, "truncate leading-snug")}>{item.userName}</p>
        <p className={cn(agencyWorkMetaClass, "mt-1 truncate")}>
          {item.type}
          <span aria-hidden> · </span>
          <span className={agencyWorkTimeRangeClass}>
            {formatAgendaRange(item.startDate, item.endDate)}
          </span>
        </p>
      </div>
      <div className="shrink-0 ps-1 text-end sm:ps-2">
        <span className={cn(agencyWorkMetricClass, "block text-sm leading-none tabular-nums")}>
          {item.daySpan}
        </span>
        <span className={cn(agencyWorkMetaClass, "mt-1 block")}>{durationLabel}</span>
      </div>
    </div>
  );
}

function ResourcingPanelHeader({
  title,
  description,
  trailing,
}: {
  title: string;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-default px-4 py-3">
      <div className="min-w-0 space-y-1">
        <h2 className={agencyWorkTitleClass}>{title}</h2>
        {description ? <p className={agencyWorkMetaClass}>{description}</p> : null}
      </div>
      {trailing ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{trailing}</div>
      ) : null}
    </header>
  );
}

export function AgencyResourcingWorkloadView({ viewModel }: AgencyResourcingWorkloadViewProps) {
  const {
    periodTitle,
    focusMonthLabel,
    activityRows,
    calendarDays,
    weekdayLabels,
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
    <div className="flex w-full flex-col gap-6 pb-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className={cn(agencySectionTitleClass, "text-balance")}>Team presence</h1>
          <p className={cn(agencyWorkMetaClass, "mt-1 max-w-2xl text-pretty")}>
            Inspect who is marked out and add off days for coverage planning.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn(agencyPanelClass, "flex items-center gap-0.5 rounded-full p-0.5")}>
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
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn&apos;t load team presence.</p>
          <p className="mt-1 text-xs text-muted">{activityErrorMessage}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : null}

      {!isActivityError && isLeaveError ? (
        <div
          className="rounded-surface border border-warning/30 bg-warning/5 p-surface text-center"
          role="status"
        >
          <AlertTriangle className="mx-auto size-5 text-warning" />
          <p className="mt-3 text-sm font-bold text-highlighted">Upcoming off days are unavailable.</p>
          <p className="mt-1 text-xs text-muted">{leaveErrorMessage}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : null}

      {isActivityPending ? (
        <SurfaceShimmer className="min-h-[36rem]" label="Loading team presence" />
      ) : isActivityError ? null : (
        <>
          <section className={cn(agencyPanelClass, "overflow-hidden")}>
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
              <div className="flex min-w-0 items-start gap-4 sm:items-center">
                <div className="border-default bg-muted/35 grid size-14 shrink-0 place-items-center rounded-2xl border">
                  <strong className="text-highlighted font-mono text-xl font-medium leading-none tabular-nums">
                    {briefingDayNumber}
                  </strong>
                  <span className="text-muted mt-1 text-[11px] font-semibold tracking-wide">
                    {briefingWeekday}
                  </span>
                </div>
                <div className="min-w-0">
                  <h2 className={cn(agencyWorkTitleClass, "text-base tracking-tight text-balance")}>
                    {briefingHeadline}
                  </h2>
                </div>
              </div>
              <dl className="flex flex-wrap items-stretch gap-2 sm:justify-end">
                <div className="bg-muted/35 min-w-[5.5rem] rounded-2xl px-3 py-2">
                  <dt className={agencyWorkMetaClass}>Out</dt>
                  <dd
                    className={cn(
                      agencyWorkMetricClass,
                      "text-base leading-none",
                      selectedOut.length > 0 ? "text-warning" : "text-success",
                    )}
                  >
                    {selectedOut.length}
                  </dd>
                </div>
                <div className="bg-muted/35 min-w-[5.5rem] rounded-2xl px-3 py-2">
                  <dt className={agencyWorkMetaClass}>Present</dt>
                  <dd className={cn(agencyWorkMetricClass, "text-base leading-none")}>
                    {coveragePct}%
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <div className="grid shrink-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
            <div className="flex min-w-0 flex-col gap-4">
              <section className={cn(agencyPanelClass, "overflow-hidden")}>
                <ResourcingPanelHeader
                  title={`${focusMonthLabel} presence`}
                  description="Select a day to inspect who is marked out"
                  trailing={
                    <>
                      <span className={cn(agencyWorkMetaClass, "inline-flex items-center gap-1.5")}>
                        <LegendSwatch tone="present" />
                        Not marked out
                      </span>
                      <span className={cn(agencyWorkMetaClass, "inline-flex items-center gap-1.5")}>
                        <LegendSwatch tone="out" />
                        Out
                      </span>
                    </>
                  }
                />
                <div className="overflow-x-auto">
                  <div className="min-w-[40rem]">
                    <div
                      className="bg-muted/35 text-muted grid grid-cols-7 border-b border-default text-[11px] font-semibold"
                      aria-hidden
                    >
                      {weekdayLabels.map((label) => (
                        <span key={label} className="px-3 py-2.5">
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
                              className="bg-muted/20 min-h-[5.5rem] border-e border-b border-default p-2.5 [&:nth-child(7n)]:border-e-0"
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
                              "relative min-h-[5.5rem] border-e border-b border-default p-2.5 text-start transition-colors duration-150 ease-out",
                              shellFocusRingClass,
                              "[&:nth-child(7n)]:border-e-0",
                              weekend
                                ? "bg-muted/25 text-muted cursor-default"
                                : "bg-default hover:bg-muted/35",
                              selected && !weekend && "z-[1] bg-muted/40 ring-primary ring-2 ring-inset",
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
                                      className="border-default -ms-1 size-6 border-2 first:ms-0"
                                    />
                                  ))}
                                  {outOverflow > 0 ? (
                                    <span className="border-default bg-muted text-muted -ms-1 grid size-6 place-items-center rounded-full border-2 text-[10px] font-semibold">
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
            </div>

            <aside
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"
              aria-label="Selected day and upcoming off days"
            >
              <section className={cn(agencyPanelClass, "overflow-hidden")}>
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h2 className={agencyWorkTitleClass}>{selectedDayLabel}</h2>
                      <p className={agencyWorkMetaClass}>{selectedDaySummary}</p>
                    </div>
                    <div className="bg-muted/35 shrink-0 rounded-2xl px-3 py-2 text-center">
                      <strong className={cn(agencyWorkMetricClass, "block text-xl leading-none")}>
                        {selectedWorkingCount}
                      </strong>
                      <span className={cn(agencyWorkMetaClass, "mt-1 block")}>
                        of {memberCount} present
                      </span>
                    </div>
                  </div>
                  <div className="bg-muted/35 mt-4 rounded-2xl px-3 py-1 sm:px-4">
                    {selectedOut.length === 0 ? (
                      <div className="px-1 py-3 text-xs text-muted">
                        <strong className="text-foreground">No one is marked out.</strong>
                        <br />
                        No off-day exceptions for this day.
                      </div>
                    ) : (
                      <div>
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
                </div>
              </section>

              <section className={cn(agencyPanelClass, "overflow-hidden")}>
                <div className="p-4 sm:p-5">
                  <div className="space-y-1">
                    <h2 className={agencyWorkTitleClass}>Upcoming off days</h2>
                    <p className={agencyWorkMetaClass}>Next exceptions needing coverage</p>
                  </div>
                  <div className="mt-4">
                    {isLeavePending ? (
                      <SurfaceShimmer className="min-h-28 rounded-2xl" label="Loading off days" />
                    ) : agenda.length === 0 ? (
                      <div className="bg-muted/35 rounded-2xl px-4 py-5 sm:px-5">
                        <p className={agencyWorkMetaClass}>No upcoming off days in this window.</p>
                      </div>
                    ) : (
                      <div className="bg-muted/35 divide-y divide-default rounded-2xl px-4 py-1 sm:px-5 sm:py-2">
                        {agenda.map((item) => (
                          <UpcomingOffDayRow key={item.id} item={item} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </aside>
          </div>
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
            <DialogDescription className={agencyLabelClass}>Resourcing</DialogDescription>
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
