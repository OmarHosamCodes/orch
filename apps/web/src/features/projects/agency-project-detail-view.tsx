import {
  AlertTriangle,
  ArchiveRestore,
  ArrowLeft,
  ChevronDown,
  Clock,
  Loader2,
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
import { SurfaceShimmer } from "@/ui/skeleton";
import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyLabelClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import {
  AGENCY_CURRENCY_OPTIONS,
  catalogRateAmount,
  formatRate,
} from "@/features/shared/format-rate";
import { projectHueStyle } from "@/features/shared/project-palette";
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

function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatEntryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function AgencyProjectDetailView({
  viewModel,
  onBack,
  onSelectClient,
  journeyStepper,
  projectTasks,
}: AgencyProjectDetailViewProps) {
  const {
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
    sortedRecentEntries,
    activitySort,
    setActivitySort,
    journeyExpandedMobile,
    setJourneyExpandedMobile,
    journeyState,
    retryLoad,
    isTrashed,
    isOwner,
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
  } = viewModel;

  return (
    <div className="agency-project-detail flex flex-col gap-4">
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
          description="This project may have been removed or moved to another team. Return to the canvas to continue working."
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
              <Button size="sm" disabled={isProjectMutationPending} onClick={restoreProject}>
                <ArchiveRestore className="size-3.5" />
                Restore
              </Button>
            </div>
          ) : null}
          <header className={cn(agencyPanelClass, "p-5")}>
            <div className="flex flex-wrap items-start justify-between gap-4">
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
                    <span className="ml-1.5 normal-case tracking-normal text-dimmed">
                      View client
                    </span>
                  </button>
                ) : (
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                    {project.clientName}
                  </p>
                )}
                <h2 className="mt-1 flex min-w-0 items-center gap-2.5">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    aria-hidden="true"
                    style={projectHueStyle(project.id)}
                  />
                  <span className="truncate text-lg font-bold text-highlighted">
                    {project.name}
                  </span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                      isTrashed
                        ? "border border-default bg-default text-muted"
                        : "bg-elevated text-highlighted",
                    )}
                  >
                    {isTrashed ? "In trash" : "Active"}
                  </span>
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className={agencyLabelClass}>This week</span>
                  <span
                    className={cn(
                      "ml-2 font-mono font-bold tabular-nums",
                      totalsThisWeek > 0 ? "text-highlighted" : "text-dimmed",
                    )}
                  >
                    {formatDuration(totalsThisWeek, "short")}
                  </span>
                </div>
                <div>
                  <span className={agencyLabelClass}>Last 30 days</span>
                  <span
                    className={cn(
                      "ml-2 font-mono font-bold tabular-nums",
                      totalsLast30 > 0 ? "text-highlighted" : "text-dimmed",
                    )}
                  >
                    {formatDuration(totalsLast30, "short")}
                  </span>
                </div>
                {isOwner && !isTrashed ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error hover:text-error"
                    disabled={isProjectMutationPending}
                    onClick={requestMoveToTrash}
                  >
                    <Trash2 className="size-3.5" />
                    Move to trash
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 border-t border-default pt-4">
              <div className="flex items-center justify-between">
                <p className={agencyLabelClass}>Budget burn</p>
                <p className={cn("text-[11px]", projectBudget ? "text-muted" : "text-dimmed")}>
                  {projectBudget ? `${budgetPct}% used` : "No budget configured"}
                </p>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-elevated">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none",
                    projectBudget ? budgetTone : "bg-muted",
                  )}
                  style={{ width: `${projectBudget ? budgetPct : 0}%` }}
                />
              </div>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex flex-col gap-4">
              {!journeyState.isLegacyProject && journeyState.hasJourney ? (
                <section className={cn(agencyPanelClass, "overflow-hidden")}>
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

              <section className={cn(agencyPanelClass, "flex flex-col")}>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
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

                {sortedRecentEntries.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
                    <Clock className="mx-auto size-5 text-muted" />
                    <p className="mt-3 text-xs text-muted">No activity in the last 30 days.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <ul className="min-w-[36rem] divide-y divide-default">
                      {sortedRecentEntries.map((entry) => (
                        <li
                          key={entry.id}
                          className="grid grid-cols-[5.5rem_8rem_1fr_4.5rem] items-baseline gap-3 px-4 py-2.5 text-xs"
                        >
                          <span className="font-mono tabular-nums text-muted">
                            {formatEntryDate(entry.startedAt)}
                            <span className="text-dimmed"> {formatEntryTime(entry.startedAt)}</span>
                          </span>
                          <span className="truncate font-bold text-highlighted">
                            {entry.userName}
                          </span>
                          <span className="truncate text-muted">{entry.description || "None"}</span>
                          <span className="text-right font-mono font-bold tabular-nums text-highlighted">
                            {formatDuration(entry.durationSeconds, "short")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>

            <aside className="flex flex-col gap-4">
              <article className={cn(agencyPanelClass, "p-4")}>
                <header className="mb-3">
                  <p className={agencyLabelClass}>Commercial</p>
                  <p className="mt-1 text-xs text-muted">
                    Override the client catalog rate for this project, or leave blank to inherit.
                  </p>
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
              </article>

              <article className={agencyPanelClass}>
                <header className="border-b border-default px-4 py-3">
                  <p className={agencyLabelClass}>Hours by member · this week</p>
                </header>
                {hoursByMemberThisWeek.length > 0 ? (
                  <ul className="divide-y divide-default">
                    {hoursByMemberThisWeek.map((row) => (
                      <li key={row.userId} className="px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-xs font-bold text-highlighted">
                            {row.name}
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
                  <div className="px-4 py-8 text-center">
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
