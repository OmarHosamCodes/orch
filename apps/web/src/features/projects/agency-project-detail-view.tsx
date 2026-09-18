import {
  AlertTriangle,
  ArchiveRestore,
  ArrowLeft,
  ChevronDown,
  Clock,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

import { Link } from "@/lib/navigation";
import { NotFoundState } from "@/features/app-shell/route-status";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { SurfaceShimmer } from "@/ui/skeleton";
import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyLabelClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import {
  AgencyDetailBudgetGlyph,
  AgencyDetailInstrumentPlate,
  AgencyDetailMonthGlyph,
  AgencyDetailTasksGlyph,
  AgencyDetailWeekGlyph,
} from "@/features/shared/agency-detail-instrument-plate";
import { formatDuration } from "@/lib/utils/format-duration";
import {
  AGENCY_CURRENCY_OPTIONS,
  catalogRateAmount,
  formatRate,
} from "@/features/shared/format-rate";
import { AgencyEntityIconMarkPickerView } from "@/features/shared/agency-entity-icon-picker-view";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { projectHueStyle } from "@/features/shared/project-palette";
import {
  projectBookNeedChipClass,
  projectBookNeedLabel,
} from "@/features/projects/projects-book-corridors";
import { projectActivityTimeLabel } from "@/features/projects/project-activity-timeline";
import { cn } from "@/lib/utils";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { type AgencyProjectDetailViewModel } from "./hooks/use-agency-project-detail";

type AgencyProjectDetailViewProps = {
  viewModel: AgencyProjectDetailViewModel;
  onBack: () => void;
  onSelectClient?: (clientId: string) => void;
  journeyStepper: ReactNode;
  projectTasks: ReactNode;
};

const ACTIVITY_SORTS = [
  { id: "newest" as const, label: "Newest first" },
  { id: "oldest" as const, label: "Oldest first" },
  { id: "longest" as const, label: "Most time" },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function AgencyProjectDetailView({
  viewModel,
  onBack,
  onSelectClient,
  journeyStepper,
  projectTasks,
}: AgencyProjectDetailViewProps) {
  const {
    projectId,
    isLoading,
    isError,
    errorMessage,
    project,
    projectBudget,
    budgetPct,
    budgetTone,
    totalsThisWeek,
    totalsLast30,
    hoursByMemberThisWeek,
    memberSecondsMax,
    activityDays,
    activitySort,
    setActivitySort,
    journeyExpandedMobile,
    setJourneyExpandedMobile,
    journeyState,
    retryLoad,
    isTrashed,
    isOwner,
    canEditRecords,
    isProjectMutationPending,
    restoreProject,
    requestMoveToTrash,
    pendingTrashConfirm,
    cancelTrashConfirm,
    confirmMoveToTrash,
    canvasNodeHref,
    editBillableRateDraft,
    onEditBillableRateDraftChange,
    editCurrencyDraft,
    onEditCurrencyDraftChange,
    agencyCurrency,
    ratePreviewAmount,
    saveProjectRate,
    canSaveProjectRate,
    onChangeProjectIcon,
    openTaskCount,
    needs,
    clientArchivedAt,
    budgetAtRisk,
    budgetMissing,
  } = viewModel;

  return (
    <div className="agency-project-detail flex flex-col gap-5 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft />
          Back to projects
        </Button>
        {canvasNodeHref ? (
          <Button variant="outline" size="sm" className="h-8 rounded-full" asChild>
            <Link to={canvasNodeHref}>Open on Canvas</Link>
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <SurfaceShimmer className="min-h-96" label="Loading project" />
      ) : isError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">
            Couldn&apos;t load this project.
          </p>
          <p className="mt-1 text-xs text-muted">{errorMessage}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={retryLoad}>
            Retry
          </Button>
        </div>
      ) : !project ? (
        <NotFoundState
          title="Project not found."
          description="This project may have been removed or moved to another team. Return to Projects to continue working."
        />
      ) : (
        <>
          {isTrashed ? (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-surface border border-default bg-card px-surface py-3"
              role="status"
            >
              <p className="text-sm text-highlighted">
                This project is in trash. Restore it to use it in Agency again.
              </p>
              {canEditRecords ? (
                <Button size="sm" disabled={isProjectMutationPending} onClick={restoreProject}>
                  <ArchiveRestore className="size-3.5" />
                  Restore
                </Button>
              ) : null}
            </div>
          ) : null}

          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {onSelectClient ? (
                <button
                  type="button"
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-[0.16em] text-muted transition-colors hover:text-highlighted",
                    agencyFocusRingClass,
                    "rounded-sm",
                  )}
                  onClick={() => onSelectClient(project.clientId)}
                  aria-label={`Open client ${project.clientName}`}
                >
                  {project.clientName}
                  <span className="ml-1.5 normal-case tracking-normal text-dimmed">View client</span>
                </button>
              ) : (
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  {project.clientName}
                </p>
              )}
              <h2 className="mt-2 flex min-w-0 flex-wrap items-center gap-2.5">
                <AgencyEntityIconMarkPickerView
                  name={project.name}
                  projectId={project.id}
                  iconKey={project.iconKey}
                  colorHueId={project.colorHueId}
                  size="header"
                  disabled={!canEditRecords || isTrashed}
                  ariaLabel="Change project icon"
                  onChange={onChangeProjectIcon}
                />
                <span className="truncate text-lg font-bold text-highlighted">{project.name}</span>
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                    isTrashed
                      ? "border border-default bg-default text-muted"
                      : "border border-success/20 bg-success/10 text-success",
                  )}
                >
                  {isTrashed ? "In trash" : "Active"}
                </span>
                {clientArchivedAt ? (
                  <span className="inline-flex shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    Client archived
                  </span>
                ) : null}
              </h2>
              {needs.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {needs.map((need) => (
                    <span
                      key={need}
                      className={cn(
                        "inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em]",
                        projectBookNeedChipClass(need),
                      )}
                    >
                      {projectBookNeedLabel(need)}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {budgetMissing && !isTrashed ? (
                  <button
                    type="button"
                    className={cn(
                      "font-bold text-info underline-offset-2 hover:underline",
                      agencyFocusRingClass,
                      "rounded-sm",
                    )}
                    onClick={() => scrollToSection(`project-commercial-${projectId}`)}
                  >
                    Set budget
                  </button>
                ) : null}
                {needs.includes("journey_stalled") && !isTrashed ? (
                  <>
                    {budgetMissing ? <span aria-hidden>·</span> : null}
                    <button
                      type="button"
                      className={cn(
                        "font-bold text-info underline-offset-2 hover:underline",
                        agencyFocusRingClass,
                        "rounded-sm",
                      )}
                      onClick={() => scrollToSection(`project-journey-${projectId}`)}
                    >
                      Review journey
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEditRecords && !isTrashed ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="More project actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={isProjectMutationPending}
                      onSelect={requestMoveToTrash}
                    >
                      <Trash2 className="size-3.5" />
                      Move to trash
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Project metrics">
            <AgencyDetailInstrumentPlate
              label="This week"
              value={formatDuration(totalsThisWeek, "short")}
              hint="Tracked hours"
              tone={totalsThisWeek > 0 ? "neutral" : "info"}
              glyph={<AgencyDetailWeekGlyph className="h-full w-full" />}
            />
            <AgencyDetailInstrumentPlate
              label="Last 30 days"
              value={formatDuration(totalsLast30, "short")}
              hint="Recent activity"
              tone={totalsLast30 > 0 ? "neutral" : "info"}
              glyph={<AgencyDetailMonthGlyph className="h-full w-full" />}
            />
            <AgencyDetailInstrumentPlate
              label="Open tasks"
              value={String(openTaskCount)}
              hint={openTaskCount === 0 ? "None open yet" : "Active in this project"}
              tone={openTaskCount > 0 ? "neutral" : "info"}
              glyph={<AgencyDetailTasksGlyph className="h-full w-full" />}
            />
            <AgencyDetailInstrumentPlate
              label="Budget burn"
              value={projectBudget ? `${budgetPct}%` : "None"}
              hint={
                budgetAtRisk
                  ? "Budget threshold reached"
                  : projectBudget
                    ? "Hours or cost used"
                    : "No budget configured"
              }
              tone={budgetAtRisk ? "warning" : projectBudget ? "neutral" : "info"}
              glyph={<AgencyDetailBudgetGlyph className="h-full w-full" />}
              onClick={
                budgetAtRisk || budgetMissing
                  ? () => scrollToSection(`project-commercial-${projectId}`)
                  : undefined
              }
              actionLabel={
                budgetAtRisk ? "Review commercial" : budgetMissing ? "Set budget" : undefined
              }
            />
          </section>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="flex min-w-0 flex-col gap-6">
              {!journeyState.isLegacyProject && journeyState.hasJourney ? (
                <section
                  id={`project-journey-${projectId}`}
                  className={cn(agencyPanelClass, "scroll-mt-4 overflow-hidden")}
                >
                  <header className="border-b border-default px-4 py-3">
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-3 text-left md:cursor-default",
                        agencyFocusRingClass,
                        "rounded-md md:pointer-events-none",
                      )}
                      aria-expanded={journeyExpandedMobile}
                      onClick={() => setJourneyExpandedMobile((value) => !value)}
                    >
                      <div className="min-w-0">
                        <p className={agencyLabelClass}>Journey</p>
                        <p className="mt-1 font-mono text-[11px] tabular-nums text-muted">
                          {journeyState.journey?.completedSteps ?? 0}/
                          {journeyState.journey?.totalSteps ?? 0} steps
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted md:hidden",
                          journeyExpandedMobile ? "" : "-rotate-90",
                        )}
                        aria-hidden
                      />
                    </button>
                  </header>
                  <div className={cn("px-2 py-3", !journeyExpandedMobile && "hidden md:block")}>
                    {journeyStepper}
                  </div>
                </section>
              ) : null}

              {projectTasks}

              <section className="flex flex-col">
                <header className="mb-2 flex flex-wrap items-center justify-between gap-3 px-1">
                  <p className={agencyLabelClass}>Activity</p>
                  <div className="inline-flex items-center rounded-full border border-default bg-elevated p-0.5">
                    {ACTIVITY_SORTS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={cn(
                          "h-7 rounded-full px-2.5 text-[11px] font-bold transition-colors motion-reduce:transition-none",
                          activitySort === option.id
                            ? "bg-default text-highlighted"
                            : "text-muted hover:text-highlighted",
                        )}
                        aria-pressed={activitySort === option.id}
                        onClick={() => setActivitySort(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </header>

                {activityDays.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-surface border border-dashed border-default px-4 py-10 text-center">
                    <Clock className="mx-auto size-5 text-muted" />
                    <p className="mt-3 text-xs text-muted">No activity in the last 30 days.</p>
                  </div>
                ) : (
                  <ol className="flex flex-col gap-5">
                    {activityDays.map((day) => (
                      <li key={day.dayKey}>
                        <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                          <h3 className={cn(agencyLabelClass, "text-muted")}>{day.label}</h3>
                          <span className="font-mono text-[11px] tabular-nums text-dimmed">
                            {formatDuration(day.totalSeconds, "short")}
                          </span>
                        </div>
                        <ul className="overflow-hidden rounded-surface border border-default bg-default">
                          {day.items.map((item) => (
                            <li
                              key={item.id}
                              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-default px-3 py-2 last:border-b-0"
                            >
                              <AgencyMemberAvatar
                                name={item.userName}
                                userId={item.userId}
                                size="sm"
                                className="size-6 rounded-full"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-highlighted">
                                  {item.userName}
                                  {item.count > 1 ? (
                                    <span className="ml-1.5 rounded-sm bg-muted px-1 py-0.5 text-[10px] font-bold text-muted">
                                      ×{item.count}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="truncate text-[11px] text-muted">
                                  {item.description.trim() || "No description"}
                                  <span className="text-dimmed">
                                    {" "}
                                    · {projectActivityTimeLabel(item.startedAt)}
                                  </span>
                                </p>
                              </div>
                              <span className="font-mono text-xs font-bold tabular-nums text-highlighted">
                                {formatDuration(item.durationSeconds, "short")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <aside className="flex min-w-0 flex-col gap-4">
              <section
                id={`project-commercial-${projectId}`}
                className={cn(
                  agencyPanelClass,
                  "scroll-mt-4 p-3.5 sm:p-4",
                  (budgetAtRisk || budgetMissing) && !isTrashed && "border-warning/25",
                )}
              >
                <header className="mb-3">
                  <p className={agencyLabelClass}>Commercial</p>
                  <p className="mt-1 text-xs text-muted">
                    Override the client catalog rate for this project, or leave blank to inherit.
                  </p>
                  {budgetAtRisk ? (
                    <p className="mt-2 text-[11px] font-bold text-warning">
                      Budget at {budgetPct}% — review burn
                    </p>
                  ) : null}
                  {budgetMissing && !budgetAtRisk ? (
                    <p className="mt-2 text-[11px] font-bold text-info">No budget configured</p>
                  ) : null}
                </header>
                {isOwner && !isTrashed ? (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveProjectRate();
                    }}
                  >
                    <div>
                      <Label
                        htmlFor={`project-rate-${project.id}`}
                        className="text-[11px] font-bold"
                      >
                        Project rate / hour
                      </Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          id={`project-rate-${project.id}`}
                          value={editBillableRateDraft}
                          onChange={(event) => onEditBillableRateDraftChange(event.target.value)}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Inherit client rate"
                          className="min-w-0 flex-1"
                        />
                        <Select value={editCurrencyDraft} onValueChange={onEditCurrencyDraftChange}>
                          <SelectTrigger aria-label="Rate currency" className="w-[5.5rem] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AGENCY_CURRENCY_OPTIONS.map((code) => (
                              <SelectItem key={code} value={code}>
                                {code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {ratePreviewAmount != null ? (
                        <p className="mt-1 text-[11px] text-muted">
                          ≈ {formatRate(ratePreviewAmount, agencyCurrency, { perHour: true })}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-muted">
                        Client default:{" "}
                        {formatRate(project.clientBillableRateAmount, project.clientCurrency, {
                          perHour: true,
                        })}
                      </p>
                      <p className="mt-1 text-[11px] text-muted">
                        Effective now:{" "}
                        {formatRate(
                          project.effectiveBillableRateAmount,
                          project.effectiveBillableRateCurrency,
                          { perHour: true },
                        )}
                      </p>
                    </div>
                    <Button type="submit" size="sm" disabled={!canSaveProjectRate}>
                      Save rate
                    </Button>
                  </form>
                ) : (
                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Project override</dt>
                      <dd className="font-mono font-bold tabular-nums text-highlighted">
                        {formatRate(
                          catalogRateAmount(
                            project.sourceBillableRateAmount,
                            project.billableRateAmount,
                          ),
                          project.billableRateAmount != null
                            ? project.currency
                            : project.clientCurrency,
                          { perHour: true },
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Effective rate</dt>
                      <dd className="font-mono font-bold tabular-nums text-highlighted">
                        {formatRate(
                          project.effectiveBillableRateAmount,
                          project.effectiveBillableRateCurrency,
                          { perHour: true },
                        )}
                      </dd>
                    </div>
                  </dl>
                )}
                {projectBudget ? (
                  <div className="mt-4 border-t border-default pt-4">
                    <div className="flex items-center justify-between">
                      <p className={agencyLabelClass}>Budget burn</p>
                      <p className="text-[11px] text-muted">{budgetPct}% used</p>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-elevated">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none",
                          budgetTone,
                        )}
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </section>

              <article className={agencyPanelClass}>
                <header className="border-b border-default px-4 py-3">
                  <p className={agencyLabelClass}>Hours by member · this week</p>
                </header>
                {hoursByMemberThisWeek.length > 0 ? (
                  <ul className="divide-y divide-default">
                    {hoursByMemberThisWeek.map((row) => (
                      <li key={row.userId} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2">
                            <AgencyMemberAvatar name={row.name} userId={row.userId} size="sm" />
                            <span className="truncate text-xs font-bold text-highlighted">
                              {row.name}
                            </span>
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-muted">
                            {formatDuration(row.seconds, "short")}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-elevated">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width:
                                memberSecondsMax > 0
                                  ? `${Math.round((row.seconds / memberSecondsMax) * 100)}%`
                                  : "0%",
                              ...projectHueStyle(project.id),
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-muted">No time logged this week.</p>
                  </div>
                )}
              </article>
            </aside>
          </div>

          <Dialog
            open={pendingTrashConfirm}
            onOpenChange={(open) => {
              if (!open) cancelTrashConfirm();
            }}
          >
            <DialogContent className="max-w-md" showCloseButton={!isProjectMutationPending}>
              <DialogHeader>
                <DialogTitle>Delete &quot;{project.name}&quot;?</DialogTitle>
                <DialogDescription>
                  Moves the project to trash for 30 days. It disappears from Agency listings and
                  choosers. Time entries stay; you can restore anytime until permanent delete.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  disabled={isProjectMutationPending}
                  onClick={cancelTrashConfirm}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={isProjectMutationPending}
                  onClick={confirmMoveToTrash}
                >
                  {isProjectMutationPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                      Moving…
                    </>
                  ) : (
                    "Move to trash"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
