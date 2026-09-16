import {
  createWorkspaceCohortHealthCohort,
  getCohortFillPercent,
  getCohortHealth,
  getCohortHealthSummary,
  workspaceCohortStatusLabels,
  type WorkspaceCohortHealthDashboardBlock,
  type WorkspaceCohortStatus,
} from "@orch/workspace";
import { Plus, Trash2, Users } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { AgencyDateField } from "@/features/shared/date/agency-date-field";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { BlockFieldLabel } from "@/features/workspace/node/blocks/shared/block-field-label";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

const statusOptions: WorkspaceCohortStatus[] = ["planning", "selling", "running", "completed"];

function formatCurrency(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function toPositiveInt(value: string | number | null | undefined, fallback: number) {
  const numeric = Number(value ?? fallback);
  return Math.max(0, Math.round(Number.isFinite(numeric) ? numeric : fallback));
}

function getHealthLabel(health: ReturnType<typeof getCohortHealth>) {
  switch (health) {
    case "healthy":
      return "Healthy";
    case "watch":
      return "Watch";
    case "at-risk":
      return "At risk";
    default: {
      const _never: never = health;
      return _never;
    }
  }
}

function getHealthBadgeVariant(health: ReturnType<typeof getCohortHealth>) {
  switch (health) {
    case "healthy":
      return "success" as const;
    case "watch":
      return "warning" as const;
    case "at-risk":
      return "destructive" as const;
    default: {
      const _never: never = health;
      return _never;
    }
  }
}

export function WorkspaceCohortHealthDashboardBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceCohortHealthDashboardBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getCohortHealthSummary(block), [block]);

  function mutateCohort(
    cohortId: string,
    mutator: (cohort: WorkspaceCohortHealthDashboardBlock["cohorts"][number]) => void,
  ) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "cohort-health-dashboard") {
        return;
      }

      const cohort = entry.cohorts.find((candidate) => candidate.id === cohortId);
      if (cohort) {
        mutator(cohort);
      }
    });
  }

  function addCohort() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "cohort-health-dashboard") {
        return;
      }

      entry.cohorts.push(
        createWorkspaceCohortHealthCohort({
          name: "New cohort",
          capacity: 20,
          seatsSold: 0,
          status: "planning",
        }),
      );
    });
  }

  function removeCohort(cohortId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "cohort-health-dashboard") {
        return;
      }

      entry.cohorts = entry.cohorts.filter((cohort) => cohort.id !== cohortId);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {summary.totalSeatsSold} seats sold · {summary.fillPercent}% capacity ·{" "}
          {formatCurrency(summary.bookedRevenueEgp)} booked · {summary.atRiskCount} at risk
        </p>
        <BlockProgressBar
          className="min-w-24 max-w-48 flex-1"
          value={summary.fillPercent}
          max={100}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ml-auto rounded-full"
          onClick={addCohort}
        >
          <Plus />
          Add Cohort
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Cohort Health Dashboard
          </h2>
          <p className="text-xs text-toned">
            Track fill rate, revenue, and delivery risk per cohort.
          </p>
        </div>
      </div>

      {block.cohorts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted">
            <Users className="size-6" />
          </div>
          <p className="mt-3 text-sm text-toned">No cohorts yet.</p>
          <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={addCohort}>
            <Plus />
            Add
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {block.cohorts.map((cohort) => {
            const health = getCohortHealth(cohort);
            const fillPercent = getCohortFillPercent(cohort);

            return (
              <article
                key={cohort.id}
                className="rounded-surface border border-muted bg-background p-surface"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Input
                        value={cohort.name}
                        placeholder="Cohort name"
                        className="min-w-[12rem] flex-1 border-0 bg-transparent px-0 text-base font-semibold text-foreground shadow-none placeholder:text-muted focus-visible:ring-0"
                        onChange={(event) =>
                          mutateCohort(cohort.id, (entry) => {
                            entry.name = event.target.value.slice(0, 120);
                          })
                        }
                      />

                      <Badge variant={getHealthBadgeVariant(health)} className="rounded-lg px-3">
                        {getHealthLabel(health)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                      <span>
                        {cohort.seatsSold}/{cohort.capacity} seats
                      </span>
                      <span>{fillPercent}% full</span>
                      <span className="font-mono">{formatCurrency(cohort.revenueEgp)}</span>
                      {cohort.startDate ? <span>Starts {cohort.startDate}</span> : null}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                        <span>Fill Rate</span>
                        <span>{fillPercent}%</span>
                      </div>
                      <BlockProgressBar
                        value={cohort.seatsSold}
                        max={Math.max(cohort.capacity, 1)}
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove cohort"
                    onClick={() => removeCohort(cohort.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label
                        htmlFor={`sold-${cohort.id}`}
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
                      >
                        Seats Sold
                      </Label>
                      <Input
                        id={`sold-${cohort.id}`}
                        type="number"
                        value={String(cohort.seatsSold)}
                        className="rounded-xl font-mono"
                        onChange={(event) =>
                          mutateCohort(cohort.id, (entry) => {
                            entry.seatsSold = Math.min(
                              toPositiveInt(event.target.value, entry.seatsSold),
                              Math.max(entry.capacity, 0),
                            );
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor={`capacity-${cohort.id}`}
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
                      >
                        Capacity
                      </Label>
                      <Input
                        id={`capacity-${cohort.id}`}
                        type="number"
                        value={String(cohort.capacity)}
                        className="rounded-xl font-mono"
                        onChange={(event) =>
                          mutateCohort(cohort.id, (entry) => {
                            entry.capacity = Math.max(
                              1,
                              toPositiveInt(event.target.value, entry.capacity),
                            );
                            entry.seatsSold = Math.min(entry.seatsSold, entry.capacity);
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor={`revenue-${cohort.id}`}
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
                      >
                        Revenue
                      </Label>
                      <Input
                        id={`revenue-${cohort.id}`}
                        type="number"
                        value={String(cohort.revenueEgp)}
                        className="rounded-xl font-mono"
                        onChange={(event) =>
                          mutateCohort(cohort.id, (entry) => {
                            entry.revenueEgp = toPositiveInt(event.target.value, entry.revenueEgp);
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor={`start-${cohort.id}`}
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
                      >
                        Start Date
                      </Label>
                      <AgencyDateField
                        id={`start-${cohort.id}`}
                        value={cohort.startDate ?? ""}
                        displayStyle="short"
                        className="h-8 rounded-xl"
                        aria-label="Start date"
                        onChange={(next) =>
                          mutateCohort(cohort.id, (entry) => {
                            entry.startDate = next || null;
                          })
                        }
                        onClear={() =>
                          mutateCohort(cohort.id, (entry) => {
                            entry.startDate = null;
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-muted bg-background p-3">
                    <div>
                      <BlockFieldLabel className="mb-2 block">Status</BlockFieldLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {statusOptions.map((status) => (
                          <Button
                            key={`${cohort.id}-${status}`}
                            type="button"
                            size="sm"
                            variant={cohort.status === status ? "secondary" : "ghost"}
                            className="rounded-full px-3"
                            onClick={() =>
                              mutateCohort(cohort.id, (entry) => {
                                entry.status = status;
                              })
                            }
                          >
                            {workspaceCohortStatusLabels[status]}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <BlockFieldLabel>Risk Flags</BlockFieldLabel>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex items-center gap-2.5 rounded-lg border border-muted bg-muted px-3 py-2">
                          <BlockCheckbox
                            checked={cohort.refundRisk}
                            aria-label="Refund risk"
                            onCheckedChange={(checked) =>
                              mutateCohort(cohort.id, (entry) => {
                                entry.refundRisk = checked;
                              })
                            }
                          />
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-toned">
                            Refund
                          </span>
                        </label>

                        <label className="flex items-center gap-2.5 rounded-lg border border-muted bg-muted px-3 py-2">
                          <BlockCheckbox
                            checked={cohort.completionRisk}
                            aria-label="Completion risk"
                            onCheckedChange={(checked) =>
                              mutateCohort(cohort.id, (entry) => {
                                entry.completionRisk = checked;
                              })
                            }
                          />
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-toned">
                            Completion
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {cohort.refundRisk ? (
                        <Badge variant="destructive" className="rounded-lg px-2.5 py-0.5">
                          Refund exposure
                        </Badge>
                      ) : null}
                      {cohort.completionRisk ? (
                        <Badge variant="warning" className="rounded-lg px-2.5 py-0.5">
                          Completion risk
                        </Badge>
                      ) : null}
                      {!cohort.refundRisk && !cohort.completionRisk ? (
                        <Badge variant="success" className="rounded-lg px-2.5 py-0.5">
                          No risks
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
