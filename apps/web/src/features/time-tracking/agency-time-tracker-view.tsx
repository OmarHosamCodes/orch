import { CalendarClock, MoreVertical, Timer, Trash2 } from "lucide-react";

import { AgencyBillableToggleMenuItem } from "@/features/time-tracking/entries/agency-billable-toggle-menu-item";
import { AgencyDescriptionDatalistField } from "@/features/time-tracking/agency-description-datalist-field";
import { AgencyTimeEntryLinkHoverTrigger } from "@/features/time-tracking/agency-time-entry-link-hover-trigger";
import { AgencyTaskChooser } from "@/features/time-tracking/choosers/agency-task-chooser";
import { AgencyTimeEntryDatePicker } from "@/features/time-tracking/entries/agency-time-entry-date-picker";
import { formatAgencyDayLabel } from "@/features/time-tracking/format-agency-day-label";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Separator } from "@/ui/separator";
import { AgencyTimeTrackerLoadingView } from "@/features/time-tracking/agency-time-tracker-loading-view";
import type { AgencyTimeTrackerViewModel } from "@/features/time-tracking/hooks/use-agency-time-tracker";
import {
  agencyTimeTrackerCardClass,
  agencyTimeTrackerClockTimeInputClass,
  agencyTimeTrackerElapsedInputClass,
  agencyTimeTrackerIconActionClass,
  agencyTimeTrackerMetricClass,
  agencyTimeTrackerPrimaryActionClass,
  agencyTimeTrackerRailCellClass,
  agencyTimeTrackerRailClass,
  agencyTimeTrackerRailDividerClass,
  agencyTimeTrackerStopActionClass,
  agencyTimeTrackerTaskChooserTriggerClass,
  agencyWorkTimeRangeClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeTrackerViewProps = {
  view: AgencyTimeTrackerViewModel;
};

function isElapsedStartEditorTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest("[data-elapsed-start-editor]") != null;
}

function TrackerRailDivider() {
  return (
    <Separator orientation="vertical" decorative className={agencyTimeTrackerRailDividerClass} />
  );
}

export function AgencyTimeTrackerView({ view }: AgencyTimeTrackerViewProps) {
  const elapsedLabel = view.elapsedLabel ?? "00:00:00";
  const taskChooserTriggerClass = cn(
    agencyTimeTrackerTaskChooserTriggerClass,
    "max-w-[14rem]",
    view.taskChooserWarning &&
      "text-warning hover:text-warning [&_svg]:text-warning [&_span]:text-warning",
  );
  const idleManual = !view.activeTimer && view.mode === "manual";
  const controlsDisabled =
    !view.teamId || view.isTimerMutationPending || view.isManualCreatePending;

  const showStatusRow = Boolean(view.stopButtonHint);

  if (view.isTrackerLoading) {
    return <AgencyTimeTrackerLoadingView />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        className={agencyTimeTrackerCardClass}
        data-agency-time-tracker
        data-timer-state={view.activeTimer ? "running" : idleManual ? "manual" : "idle"}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 pr-2">
          <div className="min-w-0 flex-1">
            <AgencyDescriptionDatalistField
              value={view.timerDescription}
              options={view.descriptionDatalistOptions}
              affinityProjectId={view.selectedProjectId || undefined}
              onValueChange={view.onDescriptionChange}
              onSelectOption={view.onDescriptionSuggestionSelect}
              onFocus={view.onDescriptionFocus}
              onBlur={view.onDescriptionBlur}
              onKeyDown={view.onDescriptionKeyDown}
              disabled={view.isTimerMutationPending || view.isManualCreatePending || !view.teamId}
            />
          </div>
        </div>

        <div className={agencyTimeTrackerRailClass}>
          <TrackerRailDivider />

          <div className={agencyTimeTrackerRailCellClass}>
            <AgencyTaskChooser
              teamId={view.teamId}
              value={view.selectedTaskId}
              onValueChange={view.onTaskChange}
              projects={view.projects}
              tasks={view.tasks}
              placeholder="Choose task"
              required={!view.activeTimer}
              triggerFormat="task-client"
              highlightSearch
              bestMatchTaskId={view.suggestionBestTaskId}
              fallbackTaskTitle={view.activeTimer?.taskTitle ?? undefined}
              fallbackProjectId={view.activeTimer?.projectId ?? undefined}
              fallbackProjectName={view.activeTimer?.projectName ?? undefined}
              fallbackClientName={
                view.activeTimer
                  ? view.projects.find((project) => project.id === view.activeTimer?.projectId)
                      ?.clientName
                  : undefined
              }
              className={taskChooserTriggerClass}
              disabled={controlsDisabled}
              open={view.taskChooserOpen}
              contentAlign="end"
              onOpenChange={view.onTaskChooserOpenChange}
            />
          </div>

          <TrackerRailDivider />

          <div className={agencyTimeTrackerRailCellClass}>
            <AgencyTimeEntryLinkHoverTrigger
              links={view.activeTimer ? view.timerLinks : []}
              disabled={!view.activeTimer || view.isTimerMutationPending || !view.teamId}
              saving={view.isTimerMutationPending}
              hoverRevealClassName="opacity-100"
              buttonClassName={agencyTimeTrackerIconActionClass}
              onSave={view.onSaveLinks}
            />
          </div>

          <TrackerRailDivider />

          <div className={agencyTimeTrackerRailCellClass}>
            {view.activeTimer ? (
              <Popover
                open={view.startTimeEditorOpen}
                onOpenChange={view.onStartTimeEditorOpenChange}
              >
                <PopoverAnchor asChild>
                  <div className="relative" data-elapsed-start-editor="">
                    <Input
                      value={view.elapsedEditing ? view.elapsedDraft : elapsedLabel}
                      onFocus={(event) => {
                        view.onElapsedFocus();
                        const input = event.currentTarget;
                        requestAnimationFrame(() => input.select());
                      }}
                      onChange={(e) => view.onElapsedChange(e.target.value)}
                      onBlur={view.onElapsedBlur}
                      onKeyDown={view.onElapsedKeyDown}
                      className={cn(agencyTimeTrackerElapsedInputClass, "font-semibold")}
                      aria-label="Elapsed time"
                      aria-invalid={Boolean(view.elapsedError)}
                      aria-expanded={view.startTimeEditorOpen}
                      aria-haspopup="dialog"
                      disabled={view.isStartTimeSaving}
                    />
                    {view.elapsedError ? (
                      <p
                        className="absolute top-full left-0 z-10 whitespace-nowrap text-xs text-error"
                        role="alert"
                      >
                        {view.elapsedError}
                      </p>
                    ) : null}
                  </div>
                </PopoverAnchor>
                <PopoverContent
                  align="center"
                  side="bottom"
                  sideOffset={8}
                  collisionPadding={12}
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  onCloseAutoFocus={(event) => event.preventDefault()}
                  onPointerDownOutside={(event) => {
                    if (isElapsedStartEditorTarget(event.target)) event.preventDefault();
                  }}
                  onFocusOutside={(event) => {
                    if (isElapsedStartEditorTarget(event.target)) event.preventDefault();
                  }}
                  onInteractOutside={(event) => {
                    if (isElapsedStartEditorTarget(event.target)) event.preventDefault();
                  }}
                  className={cn(
                    "w-auto min-w-0 gap-1.5 rounded-surface border border-default p-2.5 shadow-lg ring-0",
                    "data-[state=closed]:animate-none",
                  )}
                  data-elapsed-start-editor=""
                >
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                      Start time
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={view.startTimeDraft}
                      onChange={(e) => view.onStartTimeDraftChange(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      onBlur={view.onStartTimeBlur}
                      onKeyDown={view.onStartTimeKeyDown}
                      disabled={view.isStartTimeSaving}
                      className={cn(
                        agencyTimeTrackerClockTimeInputClass,
                        "h-9 w-[5rem] text-base font-semibold text-highlighted",
                      )}
                      aria-label="Timer start time"
                      aria-invalid={Boolean(view.startTimeError)}
                    />
                    <span className="shrink-0 text-xs text-muted">{view.startTimeDayLabel}</span>
                  </div>
                  {view.startTimeError ? (
                    <p className="text-xs text-error" role="alert">
                      {view.startTimeError}
                    </p>
                  ) : null}
                </PopoverContent>
              </Popover>
            ) : idleManual ? (
              <div className="relative flex min-w-0 shrink-0 items-center gap-2.5">
                <div className="flex min-w-0 shrink-0 items-center gap-1.5">
                  <Input
                    type="text"
                    inputMode="decimal"
                    data-time-field="start"
                    value={view.manualStartTimeInput}
                    onChange={(e) => view.onManualStartTimeInputChange(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={view.onManualStartTimeBlur}
                    onKeyDown={view.onManualTimeKeyDown}
                    className={agencyTimeTrackerClockTimeInputClass}
                    aria-label="Start time"
                    disabled={view.isManualCreatePending}
                  />
                  <span className={cn("shrink-0", agencyWorkTimeRangeClass)} aria-hidden>
                    -
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    data-time-field="end"
                    value={view.manualEndTimeInput}
                    onChange={(e) => view.onManualEndTimeInputChange(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={view.onManualEndTimeBlur}
                    onKeyDown={view.onManualTimeKeyDown}
                    className={agencyTimeTrackerClockTimeInputClass}
                    aria-label="End time"
                    disabled={view.isManualCreatePending}
                  />
                  {view.manualSpansNextDay ? (
                    <span
                      className={cn("shrink-0", agencyWorkTimeRangeClass)}
                      aria-label="Next day"
                    >
                      +1
                    </span>
                  ) : null}
                </div>
                <Separator
                  orientation="vertical"
                  decorative
                  className="h-5 self-center data-vertical:h-5 data-vertical:self-center"
                />
                <AgencyTimeEntryDatePicker
                  date={view.manualDraft.date}
                  disabled={view.isManualCreatePending}
                  onDateChange={view.onManualDateChange}
                  label={
                    view.manualDraft.date ? formatAgencyDayLabel(view.manualDraft.date) : "Date"
                  }
                />
                {view.manualError ? (
                  <p className="absolute top-full left-0 z-10 whitespace-nowrap text-xs text-error">
                    {view.manualError}
                  </p>
                ) : null}
              </div>
            ) : (
              <span
                className={cn(agencyTimeTrackerMetricClass, "text-muted")}
                aria-live="polite"
                aria-atomic="true"
              >
                {elapsedLabel}
              </span>
            )}
          </div>

          <TrackerRailDivider />

          <div className={agencyTimeTrackerRailCellClass}>
            {view.activeTimer ? (
              <Button
                size="lg"
                className={agencyTimeTrackerStopActionClass}
                disabled={view.stopButtonDisabled}
                aria-label={view.stopButtonLabel}
                aria-busy={view.isTimerMutationPending || undefined}
                aria-describedby={view.stopButtonHint ? "agency-timer-stop-blocker" : undefined}
                title={view.stopButtonHint ?? undefined}
                onClick={view.onStopTimer}
              >
                {view.stopButtonLabel}
              </Button>
            ) : idleManual ? (
              <Button
                size="lg"
                className={agencyTimeTrackerPrimaryActionClass}
                disabled={!view.canAddManual}
                aria-busy={view.isManualCreatePending || undefined}
                onClick={view.onAddManual}
              >
                Add
              </Button>
            ) : (
              <Button
                size="lg"
                className={agencyTimeTrackerPrimaryActionClass}
                disabled={view.startButtonDisabled}
                aria-busy={view.isTimerMutationPending || undefined}
                onClick={view.onStartTimer}
              >
                Start
              </Button>
            )}
          </div>

          {view.showModeToggle ? (
            <>
              <TrackerRailDivider />
              <div className={agencyTimeTrackerRailCellClass}>
                <Button
                  variant="ghost"
                  className={agencyTimeTrackerIconActionClass}
                  aria-label={idleManual ? "Switch to timer" : "Switch to manual entry"}
                  aria-pressed={idleManual}
                  onClick={() => view.onModeChange(idleManual ? "timer" : "manual")}
                >
                  {idleManual ? <Timer className="size-5" /> : <CalendarClock className="size-5" />}
                </Button>
              </div>
            </>
          ) : null}

          <TrackerRailDivider />
          <div className={cn(agencyTimeTrackerRailCellClass, "pr-0")}>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={agencyTimeTrackerIconActionClass}
                  aria-label="Timer options"
                  disabled={controlsDisabled}
                >
                  <MoreVertical className="size-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1">
                <AgencyBillableToggleMenuItem
                  isBillable={view.isBillable}
                  disabled={controlsDisabled}
                  onToggle={() => view.onIsBillableChange(!view.isBillable)}
                />
                {view.activeTimer ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-error"
                    disabled={view.isTimerMutationPending}
                    onClick={view.onDiscardTimer}
                  >
                    <Trash2 />
                    Discard timer
                  </Button>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {showStatusRow ? (
        <div className="px-1">
          <p id="agency-timer-stop-blocker" className="min-w-0 text-xs text-warning" role="alert">
            {view.stopButtonHint}
          </p>
        </div>
      ) : null}
    </div>
  );
}
