import {
  createWorkspaceDelegationItem,
  getDelegationMatrixSummary,
  workspaceDelegationStatusLabels,
  type WorkspaceDelegationMatrixBlock,
  type WorkspaceDelegationStatus,
} from "@orch/workspace";
import { ArrowRight, BadgeDollarSign, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { BlockFieldLabel } from "@/features/workspace/node/blocks/shared/block-field-label";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { cn } from "@/lib/utils";

const statusOptions: WorkspaceDelegationStatus[] = ["stuck", "transitioning", "delegated"];

const sortOptions = [
  { label: "Priority", value: "priority" },
  { label: "Hours / week", value: "hours" },
  { label: "Task name", value: "task" },
] as const;

function formatAmount(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function toHours(value: string | number | undefined) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Number(numeric.toFixed(1))));
}

function toHourlyRate(value: string | number | undefined) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 500;
  }

  return Math.max(0, Math.min(100000, Math.round(numeric)));
}

function getStatusCardClasses(status: WorkspaceDelegationStatus) {
  switch (status) {
    case "delegated":
      return "border-success/20 bg-success/5";
    case "transitioning":
      return "border-warning/20 bg-warning/5";
    default:
      return "border-destructive/20 bg-destructive/5";
  }
}

function getStatusButtonClasses(
  status: WorkspaceDelegationStatus,
  activeStatus: WorkspaceDelegationStatus,
) {
  if (status === activeStatus) {
    if (status === "delegated") {
      return "border-success/20 bg-success/10 text-success";
    }

    if (status === "transitioning") {
      return "border-warning/20 bg-warning/10 text-warning";
    }

    return "border-destructive/20 bg-destructive/10 text-destructive";
  }

  return "border-muted bg-background text-toned hover:border-muted hover:text-foreground";
}

export function WorkspaceDelegationMatrixBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceDelegationMatrixBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();
  const [filterStatus, setFilterStatus] = useState<"all" | WorkspaceDelegationStatus>("all");
  const [sortMode, setSortMode] = useState<"priority" | "hours" | "task">("priority");

  const summary = useMemo(() => getDelegationMatrixSummary(block), [block]);

  const delegatedCoverage = useMemo(() => {
    if (summary.totalHoursPerWeek <= 0) {
      return 0;
    }

    return Math.round((summary.delegatedHoursPerWeek / summary.totalHoursPerWeek) * 100);
  }, [summary.delegatedHoursPerWeek, summary.totalHoursPerWeek]);

  const unassignedHandoffCount = useMemo(
    () => block.items.filter((item) => item.status !== "delegated" && !item.to.trim()).length,
    [block.items],
  );

  const statusCounts = useMemo(
    () => ({
      all: block.items.length,
      stuck: block.items.filter((item) => item.status === "stuck").length,
      transitioning: block.items.filter((item) => item.status === "transitioning").length,
      delegated: block.items.filter((item) => item.status === "delegated").length,
    }),
    [block.items],
  );

  const filteredItems = useMemo(() => {
    const baseItems =
      filterStatus === "all"
        ? [...block.items]
        : block.items.filter((item) => item.status === filterStatus);

    if (sortMode === "hours") {
      return baseItems.sort(
        (left, right) =>
          right.hoursPerWeek - left.hoursPerWeek || left.task.localeCompare(right.task),
      );
    }

    if (sortMode === "task") {
      return baseItems.sort((left, right) => left.task.localeCompare(right.task));
    }

    const statusRank: Record<WorkspaceDelegationStatus, number> = {
      stuck: 0,
      transitioning: 1,
      delegated: 2,
    };

    return baseItems.sort(
      (left, right) =>
        statusRank[left.status] - statusRank[right.status] ||
        right.hoursPerWeek - left.hoursPerWeek ||
        left.task.localeCompare(right.task),
    );
  }, [block.items, filterStatus, sortMode]);

  function mutateDelegationBlock(mutator: (entry: WorkspaceDelegationMatrixBlock) => void) {
    mutateTypedBlock(tabId, block.id, "delegation-matrix", mutator);
  }

  function mutateItem(
    itemId: string,
    mutator: (item: WorkspaceDelegationMatrixBlock["items"][number]) => void,
  ) {
    mutateDelegationBlock((entry) => {
      const target = entry.items.find((item) => item.id === itemId);

      if (!target) {
        return;
      }

      mutator(target);
    });
  }

  function addItem() {
    mutateDelegationBlock((entry) => {
      entry.items.unshift(createWorkspaceDelegationItem());
    });
  }

  function removeItem(itemId: string) {
    mutateDelegationBlock((entry) => {
      entry.items = entry.items.filter((item) => item.id !== itemId);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {summary.totalHoursPerWeek}h recoverable ·{" "}
          <span className="text-warning">{summary.pendingHoursPerWeek}h</span> trapped ·{" "}
          {formatAmount(summary.pendingRecoverableValue)} weekly cost ·{" "}
          <span className="text-success">{delegatedCoverage}%</span> delegated
        </p>
        <BlockProgressBar
          className="min-w-24 max-w-48 flex-1"
          value={delegatedCoverage}
          max={100}
        />
      </div>

      <div className="rounded-surface border border-muted bg-card p-surface">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Delegation tracker</p>
            <p className="text-sm text-toned">
              Prioritize trapped founder tasks first, then assign explicit ownership and move each
              handoff toward delegated.
            </p>
            {unassignedHandoffCount > 0 ? (
              <p className="mt-2 text-xs text-warning">
                {unassignedHandoffCount} item{unassignedHandoffCount === 1 ? "" : "s"} still missing
                a clear owner.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", ...statusOptions] as Array<"all" | WorkspaceDelegationStatus>).map(
              (status) => (
                <Button
                  key={status}
                  type="button"
                  variant={filterStatus === status ? "default" : "secondary"}
                  className="rounded-full px-4"
                  aria-label={`Filter by ${status === "all" ? "all statuses" : workspaceDelegationStatusLabels[status]}`}
                  onClick={() => setFilterStatus(status)}
                >
                  {status === "all" ? "All" : workspaceDelegationStatusLabels[status]}
                  <span className="ml-1 text-xs opacity-80">{statusCounts[status]}</span>
                </Button>
              ),
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[14rem_14rem_1fr_auto]">
          <div className="space-y-1.5">
            <Label>
              <BlockFieldLabel>Hourly rate</BlockFieldLabel>
            </Label>
            <div className="relative">
              <BadgeDollarSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={String(block.hourlyRate)}
                type="number"
                className="w-full rounded-2xl pl-9"
                aria-label="Delegation hourly rate"
                onChange={(event) =>
                  mutateDelegationBlock((entry) => {
                    entry.hourlyRate = toHourlyRate(event.target.value);
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              <BlockFieldLabel>Sort</BlockFieldLabel>
            </Label>
            <BlockSelect
              value={sortMode}
              options={sortOptions.map((option) => ({ label: option.label, value: option.value }))}
              className="rounded-2xl"
              aria-label="Sort delegation items"
              onValueChange={(value) =>
                setSortMode((value as "priority" | "hours" | "task" | undefined) ?? "priority")
              }
            />
          </div>

          <div className="rounded-2xl border border-muted bg-background px-3 py-2 text-xs text-toned">
            Currency values use the hourly rate context shown above. Update it before reviewing
            weekly cost impact.
          </div>

          <Button
            type="button"
            variant="secondary"
            className="self-end rounded-full px-4"
            aria-label="Add delegation task"
            onClick={addItem}
          >
            <Plus />
            Add task
          </Button>
        </div>
      </div>

      {block.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">No delegation items yet.</p>
          <p className="mt-1 text-sm text-toned">
            Add a recurring task to begin mapping handoff opportunities.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 rounded-full px-4"
            aria-label="Add first delegation task"
            onClick={addItem}
          >
            <Plus />
            Add task
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">No items match this filter.</p>
          <p className="mt-1 text-sm text-toned">
            Switch to another status filter to continue planning handoffs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className={cn("rounded-surface border p-surface", getStatusCardClasses(item.status))}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Input
                    value={item.task}
                    placeholder="Task name"
                    className="w-full border-0 bg-transparent px-0 text-lg font-bold text-foreground placeholder:text-muted shadow-none focus-visible:ring-0"
                    aria-label={`Task name for ${item.task || "new delegation item"}`}
                    onChange={(event) =>
                      mutateItem(item.id, (target) => {
                        target.task = event.target.value.slice(0, 160);
                      })
                    }
                  />
                  <p className="mt-2 text-sm text-toned">
                    {item.hoursPerWeek}h/week · {formatAmount(item.hoursPerWeek * block.hourlyRate)}{" "}
                    of founder time
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3">
                    {workspaceDelegationStatusLabels[item.status]}
                  </Badge>
                  {!item.to.trim() ? (
                    <Badge variant="warning" className="rounded-full">
                      Needs owner
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-2xl hover:text-destructive"
                    aria-label={`Remove ${item.task || "delegation item"}`}
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_14rem]">
                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>From</BlockFieldLabel>
                  </Label>
                  <Input
                    value={item.from}
                    className="w-full rounded-2xl"
                    placeholder="Current owner"
                    aria-label={`Current owner for ${item.task || "delegation task"}`}
                    onChange={(event) =>
                      mutateItem(item.id, (target) => {
                        target.from = event.target.value.slice(0, 120);
                      })
                    }
                  />
                </div>

                <div className="hidden items-center justify-center pt-7 text-muted-foreground lg:flex">
                  <ArrowRight className="size-5" />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>To</BlockFieldLabel>
                  </Label>
                  <Input
                    value={item.to}
                    className="w-full rounded-2xl"
                    placeholder="Delegate owner"
                    aria-label={`Delegate owner for ${item.task || "delegation task"}`}
                    onChange={(event) =>
                      mutateItem(item.id, (target) => {
                        target.to = event.target.value.slice(0, 120);
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>Hours / week</BlockFieldLabel>
                  </Label>
                  <Input
                    value={String(item.hoursPerWeek)}
                    type="number"
                    step="0.5"
                    className="w-full rounded-2xl"
                    aria-label={`Weekly hours for ${item.task || "delegation task"}`}
                    onChange={(event) =>
                      mutateItem(item.id, (target) => {
                        target.hoursPerWeek = toHours(event.target.value);
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={cn(
                      "rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition",
                      getStatusButtonClasses(status, item.status),
                    )}
                    aria-label={`Set ${item.task || "delegation task"} to ${workspaceDelegationStatusLabels[status]}`}
                    onClick={() =>
                      mutateItem(item.id, (target) => {
                        target.status = status;
                      })
                    }
                  >
                    {workspaceDelegationStatusLabels[status]}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
