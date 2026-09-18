import {
  WORKSPACE_TASK_DOMAINS,
  WORKSPACE_TASK_QUADRANTS,
  buildEisenhowerBattlePlanPromptFromTasks,
  collectWorkspaceNodeTasks,
  createWorkspaceTask,
  createWorkspaceTimeOrchestratorSettings,
  filterCollectedTasksByTimeOrchestratorSettings,
  getEisenhowerMatrixSummaryFromTasks,
  getWorkspaceTaskDomainLabel,
  type WorkspaceCollectedTask,
  type WorkspaceEisenhowerMatrixBlock,
  type WorkspaceTask,
  type WorkspaceTaskDomain,
  type WorkspaceTaskQuadrant,
} from "@orch/workspace";
import {
  ArrowUpRight,
  LayoutGrid,
  Loader2,
  Plug2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { AgencyDateField } from "@/features/shared/date/agency-date-field";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { BlockSlider } from "@/features/workspace/node/blocks/shared/block-slider";
import { WorkspaceOrchestratorSourcesModal } from "@/features/workspace/node/blocks/workspace-orchestrator-sources-modal";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { formatDateTime } from "@/lib/utils/format-date-time";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { renderSimpleMarkdown } from "@/lib/utils/render-simple-markdown";
import { cn } from "@/lib/utils";

type MatrixStatusTone = "success" | "warning" | "error" | "primary";

const quadrantMeta = {
  do: {
    description: "Urgent + important",
    className: "border-destructive/25 bg-destructive/5",
  },
  schedule: {
    description: "Important, not urgent",
    className: "border-primary/25 bg-primary/5",
  },
  delegate: {
    description: "Urgent, lower leverage",
    className: "border-warning/25 bg-warning/5",
  },
  eliminate: {
    description: "Low urgency + importance",
    className: "border-muted/35 bg-muted/20",
  },
} satisfies Record<WorkspaceTaskQuadrant, { description: string; className: string }>;

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function clampTenPointScale(value: string | number | null | undefined, fallback = 5) {
  const numeric = Number(value ?? fallback);
  return Math.min(10, Math.max(1, Math.round(Number.isFinite(numeric) ? numeric : fallback)));
}

function clampEstimate(value: string | number | null | undefined, fallback = 30) {
  const numeric = Number(value ?? fallback);
  return Math.min(1440, Math.max(0, Math.round(Number.isFinite(numeric) ? numeric : fallback)));
}

function toTaskDomain(value: string | null | undefined) {
  return WORKSPACE_TASK_DOMAINS.includes(value as WorkspaceTaskDomain)
    ? (value as WorkspaceTaskDomain)
    : null;
}

function isOverdue(task: WorkspaceTask) {
  return Boolean(task.dueDate) && new Date(`${task.dueDate}T12:00:00`).getTime() < Date.now();
}

function getDomainPillClass(domain: WorkspaceTaskDomain | null | undefined) {
  switch (domain) {
    case "sales":
      return "border-warning/30 bg-warning/10 text-warning";
    case "content":
      return "border-secondary/30 bg-secondary/10 text-secondary-foreground";
    case "education":
      return "border-info/30 bg-info/10 text-info";
    case "people":
      return "border-success/30 bg-success/10 text-success";
    case "finance":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "strategy":
      return "border-primary/30 bg-primary/10 text-primary";
    case "brand":
      return "border-secondary/30 bg-secondary/10 text-secondary-foreground";
    case "orchestrator":
      return "border-primary/30 bg-primary/10 text-primary";
    default:
      return "border-muted bg-muted/30 text-muted-foreground";
  }
}

function getStatusBadgeClass(tone: MatrixStatusTone) {
  switch (tone) {
    case "success":
      return "border-success/30 bg-success/10 text-success";
    case "warning":
      return "border-warning/30 bg-warning/10 text-warning";
    case "error":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "primary":
      return "border-primary/30 bg-primary/10 text-primary";
    default: {
      const _never: never = tone;
      return _never;
    }
  }
}

function getQuadrantClassName(quadrant: WorkspaceTaskQuadrant) {
  return quadrantMeta[quadrant].className;
}

function getQuadrantDescription(quadrant: WorkspaceTaskQuadrant) {
  return quadrantMeta[quadrant].description;
}

function getCollectedTaskKey(item: WorkspaceCollectedTask) {
  return `${item.sourceNodeId}:${item.blockId}:${item.task.id}`;
}

function isDerivedTask(item: WorkspaceCollectedTask) {
  return item.blockType === "content-pipeline";
}

function getScopedQuadrant(item: WorkspaceCollectedTask): WorkspaceTaskQuadrant {
  if (item.task.urgency >= 7 && item.task.importance >= 7) {
    return "do";
  }

  if (item.task.importance >= 7) {
    return "schedule";
  }

  if (item.task.urgency >= 7) {
    return "delegate";
  }

  return "eliminate";
}

export function WorkspaceEisenhowerMatrixBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceEisenhowerMatrixBlock>) {
  const {
    currentNode,
    allNodes,
    domainOptions,
    mutateTypedBlock,
    mutateCollectedTask,
    connectSource,
    disconnectSource,
    removeCollectedTask,
    addTaskToSource,
    navigateToSource,
    runBlockAgentPrompt,
    getBlockOperationState,
    formatRelativeTaskMeta,
  } = useWorkspaceNodeEditorContext();

  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);

  const operationState = getBlockOperationState(tabId, block.id);
  const isOrchestratorNode = currentNode?.nodeType === "orchestrator";
  const currentNodeTitle =
    currentNode?.title.trim() || currentNode?.label?.trim() || "Current node";
  const currentTabTitle = useMemo(() => {
    const tab = currentNode?.tabs.find((entry) => entry.id === tabId);
    return tab?.title.trim() || "Current tab";
  }, [currentNode, tabId]);

  const scopedCollectedTasks = useMemo<WorkspaceCollectedTask[]>(() => {
    if (!currentNode) {
      return [];
    }

    if (isOrchestratorNode) {
      return collectWorkspaceNodeTasks(currentNode, allNodes);
    }

    return block.tasks.map((task) => ({
      sourceNodeId: currentNode.id,
      sourceNodeTitle: currentNodeTitle,
      blockId: block.id,
      blockTitle: block.title.trim() || "Eisenhower matrix",
      blockType: "eisenhower-matrix" as const,
      tabId,
      tabTitle: currentTabTitle,
      task,
    }));
  }, [
    currentNode,
    isOrchestratorNode,
    allNodes,
    block.tasks,
    block.id,
    block.title,
    currentNodeTitle,
    tabId,
    currentTabTitle,
  ]);

  const filteredCollectedTasks = useMemo(
    () => filterCollectedTasksByTimeOrchestratorSettings(scopedCollectedTasks, block.settings),
    [scopedCollectedTasks, block.settings],
  );

  const summary = useMemo(
    () => getEisenhowerMatrixSummaryFromTasks(filteredCollectedTasks),
    [filteredCollectedTasks],
  );

  const openScopedTasks = useMemo(
    () => scopedCollectedTasks.filter(({ task }) => !task.completed),
    [scopedCollectedTasks],
  );

  const visibleQuadrants = useMemo(
    () => block.settings.quadrants.map((quadrant) => summary.quadrants[quadrant]),
    [block.settings.quadrants, summary.quadrants],
  );

  const taskEditorDescription = isOrchestratorNode
    ? "Edit tasks across connected sources. Derived content pipeline signals stay partially read-only."
    : "Edit the task list directly and the matrix will re-sort itself instantly.";

  const matrixStatus = useMemo(() => {
    if (operationState.pending) {
      return {
        label: operationState.label || "Running analysis",
        tone: "primary" as const,
        description:
          "The Orchestrator is generating a battle plan from the current filtered matrix scope.",
      };
    }

    if (filteredCollectedTasks.length === 0) {
      return {
        label: scopedCollectedTasks.length === 0 ? "No tasks yet" : "No tasks match filters",
        tone: "warning" as const,
        description:
          scopedCollectedTasks.length === 0
            ? "Add tasks so urgency and importance can map your priorities."
            : "Adjust the domain or quadrant filters to widen the matrix scope.",
      };
    }

    if (summary.overdueCount > 0) {
      return {
        label: "Overdue focus needed",
        tone: "warning" as const,
        description: `${summary.overdueCount} overdue task${summary.overdueCount === 1 ? "" : "s"} need immediate attention.`,
      };
    }

    if (block.settings.quadrants.includes("do") && summary.quadrants.do.taskCount === 0) {
      return {
        label: "No do-now tasks",
        tone: "primary" as const,
        description: "Nothing is currently in the urgent + important quadrant.",
      };
    }

    return {
      label: "Matrix ready",
      tone: "success" as const,
      description:
        "Priorities are distributed across the current filtered scope and ready for execution.",
    };
  }, [
    operationState.pending,
    operationState.label,
    filteredCollectedTasks.length,
    scopedCollectedTasks.length,
    summary.overdueCount,
    summary.quadrants.do.taskCount,
    block.settings.quadrants,
  ]);

  const domainFilters = useMemo(() => {
    const counts = new Map<WorkspaceTaskDomain, number>();

    for (const domain of WORKSPACE_TASK_DOMAINS) {
      counts.set(domain, 0);
    }

    let unassigned = 0;

    for (const item of openScopedTasks) {
      if (item.task.domain) {
        counts.set(item.task.domain, (counts.get(item.task.domain) ?? 0) + 1);
        continue;
      }

      unassigned += 1;
    }

    return [
      ...WORKSPACE_TASK_DOMAINS.map((domain) => ({
        key: domain as WorkspaceTaskDomain | "unassigned",
        label: getWorkspaceTaskDomainLabel(domain),
        count: counts.get(domain) ?? 0,
        active: block.settings.domains.includes(domain),
      })),
      {
        key: "unassigned" as const,
        label: "Unassigned",
        count: unassigned,
        active: block.settings.includeUnassigned,
      },
    ];
  }, [openScopedTasks, block.settings.domains, block.settings.includeUnassigned]);

  const quadrantFilters = useMemo(() => {
    const counts = new Map<WorkspaceTaskQuadrant, number>();

    for (const quadrant of WORKSPACE_TASK_QUADRANTS) {
      counts.set(quadrant, 0);
    }

    for (const item of openScopedTasks) {
      const key = getScopedQuadrant(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return WORKSPACE_TASK_QUADRANTS.map((quadrant) => ({
      key: quadrant,
      label: summary.quadrants[quadrant].label,
      count: counts.get(quadrant) ?? 0,
      active: block.settings.quadrants.includes(quadrant),
    }));
  }, [openScopedTasks, block.settings.quadrants, summary.quadrants]);

  function updateSettings(mutator: (settings: WorkspaceEisenhowerMatrixBlock["settings"]) => void) {
    mutateTypedBlock(tabId, block.id, "eisenhower-matrix", (entry) => {
      const nextSettings = createWorkspaceTimeOrchestratorSettings(entry.settings);
      mutator(nextSettings);
      entry.settings = createWorkspaceTimeOrchestratorSettings(nextSettings);
    });
  }

  function toggleDomain(domain: WorkspaceTaskDomain) {
    updateSettings((settings) => {
      settings.domains = settings.domains.includes(domain)
        ? settings.domains.filter((entry) => entry !== domain)
        : [...settings.domains, domain];
    });
  }

  function toggleUnassigned() {
    updateSettings((settings) => {
      settings.includeUnassigned = !settings.includeUnassigned;
    });
  }

  function toggleQuadrant(quadrant: WorkspaceTaskQuadrant) {
    updateSettings((settings) => {
      settings.quadrants = settings.quadrants.includes(quadrant)
        ? settings.quadrants.filter((entry) => entry !== quadrant)
        : [...settings.quadrants, quadrant];
    });
  }

  function resetFilters() {
    updateSettings((settings) => {
      settings.domains = [...WORKSPACE_TASK_DOMAINS];
      settings.includeUnassigned = true;
      settings.quadrants = [...WORKSPACE_TASK_QUADRANTS];
    });
  }

  function mutateEisenhowerBlock(
    mutator: (entry: WorkspaceEisenhowerMatrixBlock, timestamp: string) => void,
  ) {
    mutateTypedBlock(tabId, block.id, "eisenhower-matrix", (entry, _tab, _node, timestamp) => {
      mutator(entry, timestamp);
    });
  }

  function mutateTaskItem(item: WorkspaceCollectedTask, mutator: (task: WorkspaceTask) => void) {
    mutateCollectedTask(item, mutator);
  }

  function addTask() {
    mutateEisenhowerBlock((entry) => {
      entry.tasks.unshift(
        createWorkspaceTask({
          text: "New task",
          domain: "orchestrator",
          urgency: 5,
          importance: 5,
          estimateMinutes: 30,
        }),
      );
    });
  }

  function removeTaskItem(item: WorkspaceCollectedTask) {
    removeCollectedTask(item);
  }

  function toggleTaskCompleted(item: WorkspaceCollectedTask, value: boolean) {
    mutateTaskItem(item, (entry) => {
      entry.completed = value;
    });
  }

  function updateTaskText(item: WorkspaceCollectedTask, value: string) {
    mutateTaskItem(item, (entry) => {
      entry.text = value.slice(0, 240);
    });
  }

  function updateTaskDomain(item: WorkspaceCollectedTask, value: string) {
    mutateTaskItem(item, (entry) => {
      entry.domain = toTaskDomain(value);
    });
  }

  function updateTaskUrgency(
    item: WorkspaceCollectedTask,
    value: string | number | null | undefined,
  ) {
    if (isDerivedTask(item)) {
      return;
    }

    mutateTaskItem(item, (entry) => {
      entry.urgency = clampTenPointScale(value, entry.urgency);
    });
  }

  function updateTaskImportance(
    item: WorkspaceCollectedTask,
    value: string | number | null | undefined,
  ) {
    if (isDerivedTask(item)) {
      return;
    }

    mutateTaskItem(item, (entry) => {
      entry.importance = clampTenPointScale(value, entry.importance);
    });
  }

  function updateTaskEstimate(
    item: WorkspaceCollectedTask,
    value: string | number | null | undefined,
  ) {
    if (isDerivedTask(item)) {
      return;
    }

    mutateTaskItem(item, (entry) => {
      entry.estimateMinutes = clampEstimate(value, entry.estimateMinutes);
    });
  }

  function updateTaskDueDate(item: WorkspaceCollectedTask, value: string) {
    if (isDerivedTask(item)) {
      return;
    }

    mutateTaskItem(item, (entry) => {
      entry.dueDate = value || null;
    });
  }

  function navigateToTaskSource(item: WorkspaceCollectedTask) {
    navigateToSource(item.sourceNodeId);
  }

  function handleMutateTask(
    item: WorkspaceCollectedTask,
    mutator: (task: WorkspaceCollectedTask["task"]) => void,
  ) {
    mutateTaskItem(item, mutator);
  }

  async function prioritizeWithAi() {
    if (filteredCollectedTasks.length === 0 || operationState.pending) {
      return;
    }

    try {
      const response = await runBlockAgentPrompt(
        tabId,
        block.id,
        buildEisenhowerBattlePlanPromptFromTasks(filteredCollectedTasks),
      );

      mutateEisenhowerBlock((entry, timestamp) => {
        entry.latestBattlePlan = response;
        entry.battlePlanUpdatedAt = timestamp;
      });

      toast.success("Battle plan saved", {
        description: "The orchestrator analysis was added to this matrix.",
      });
    } catch (error) {
      toast.error("Prioritization failed", {
        description: getErrorMessage(
          error,
          "The Orchestrator agent could not build a battle plan.",
        ),
      });
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-surface border border-muted bg-muted p-surface">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <LayoutGrid className="size-5" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Eisenhower Matrix</p>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Prioritize across the current task scope
            </h3>
            <p className="max-w-2xl text-sm text-toned">{matrixStatus.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className={cn("rounded-full", getStatusBadgeClass(matrixStatus.tone))}
            >
              {matrixStatus.label}
            </Badge>
            {operationState.pending ? (
              <Badge variant="secondary" className="rounded-full">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  Syncing
                </span>
              </Badge>
            ) : null}
            {isOrchestratorNode ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full px-4"
                aria-label="Manage connected sources"
                onClick={() => setSourcesModalOpen(true)}
              >
                <Plug2 />
                Manage Sources
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full px-4"
              aria-label="Reset matrix filters"
              onClick={resetFilters}
            >
              <RotateCcw />
              Reset Filters
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
              Domain filters
            </legend>
            <div className="flex flex-wrap gap-2">
              {domainFilters.map((domain) => (
                <Button
                  key={domain.key}
                  type="button"
                  size="sm"
                  variant={domain.active ? "secondary" : "outline"}
                  className={cn(
                    "rounded-xl",
                    domain.active && "border-primary/20 bg-primary/10 text-primary",
                  )}
                  aria-pressed={domain.active}
                  aria-label={`${domain.active ? "Disable" : "Enable"} ${domain.label} domain filter`}
                  onClick={() =>
                    domain.key === "unassigned" ? toggleUnassigned() : toggleDomain(domain.key)
                  }
                >
                  {domain.label}
                  <span className="ml-2 text-[10px] font-semibold opacity-60">{domain.count}</span>
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
              Quadrant filters
            </legend>
            <div className="flex flex-wrap gap-2">
              {quadrantFilters.map((quadrant) => (
                <Button
                  key={quadrant.key}
                  type="button"
                  size="sm"
                  variant={quadrant.active ? "secondary" : "outline"}
                  className={cn(
                    "rounded-xl",
                    quadrant.active && "border-primary/20 bg-primary/10 text-primary",
                  )}
                  aria-pressed={quadrant.active}
                  aria-label={`${quadrant.active ? "Disable" : "Enable"} ${quadrant.label} quadrant filter`}
                  onClick={() => toggleQuadrant(quadrant.key)}
                >
                  {quadrant.label}
                  <span className="ml-2 text-[10px] font-semibold opacity-60">
                    {quadrant.count}
                  </span>
                </Button>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {formatDuration(summary.totalEstimateMinutes)} total ·{" "}
          {summary.overdueCount > 0 ? (
            <span className="text-destructive">{summary.overdueCount} overdue</span>
          ) : (
            `${summary.overdueCount} overdue`
          )}{" "}
          · {summary.completedCount} completed · {summary.activeDomainCount} active domains
        </p>
        <BlockProgressBar
          className="min-w-24 max-w-48 flex-1"
          value={summary.completedCount}
          max={Math.max(summary.totalTaskCount, 1)}
        />
      </div>

      <div className={cn("grid gap-4", visibleQuadrants.length > 1 ? "xl:grid-cols-2" : "")}>
        {visibleQuadrants.map((quadrant) => (
          <article
            key={quadrant.key}
            className={cn(
              "rounded-surface border border-muted p-surface",
              getQuadrantClassName(quadrant.key),
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  {quadrant.label}
                </p>
                <p className="mt-1 text-xs font-medium text-toned">
                  {getQuadrantDescription(quadrant.key)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {quadrant.taskCount}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-toned">
                  {formatDuration(quadrant.estimateMinutes)}
                </p>
              </div>
            </div>

            {quadrant.tasks.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-muted bg-background py-8 text-center text-sm font-medium text-toned">
                No tasks in this quadrant.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {quadrant.tasks.map((item) => (
                  <article
                    key={getCollectedTaskKey(item)}
                    className="rounded-surface border border-muted bg-background p-surface"
                  >
                    <div className="flex items-start gap-3">
                      <BlockCheckbox
                        checked={item.task.completed}
                        className="mt-1"
                        onCheckedChange={(checked) => toggleTaskCompleted(item, checked)}
                      />

                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm font-semibold text-foreground">{item.task.text}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="secondary"
                            className={cn("rounded-lg", getDomainPillClass(item.task.domain))}
                          >
                            {getWorkspaceTaskDomainLabel(item.task.domain)}
                          </Badge>
                          <Badge variant="secondary" className="rounded-lg">
                            {formatDuration(item.task.estimateMinutes)}
                          </Badge>
                          <Badge variant="secondary" className="rounded-lg">
                            {item.sourceNodeTitle}
                          </Badge>
                          {isDerivedTask(item) ? (
                            <Badge variant="secondary" className="rounded-lg">
                              Derived
                            </Badge>
                          ) : null}
                          {isOverdue(item.task) ? (
                            <Badge
                              variant="secondary"
                              className="rounded-lg border-destructive/30 bg-destructive/10 text-destructive"
                            >
                              Overdue
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                          {formatRelativeTaskMeta(item)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      <section className="rounded-surface border border-muted bg-background p-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Domain time allocation
            </h3>
            <p className="mt-1 text-xs text-toned">
              Open task load is grouped by domain so time concentration is visible at a glance.
            </p>
          </div>
        </div>

        {summary.domainAllocation.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-muted bg-background py-12 text-center text-sm font-medium text-toned">
            No open task load yet.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {summary.domainAllocation.map((allocation) => (
              <div key={allocation.domain ?? "unassigned"}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{allocation.label}</span>
                    <Badge
                      variant="secondary"
                      className={cn("rounded-lg", getDomainPillClass(allocation.domain))}
                    >
                      {allocation.taskCount} tasks
                    </Badge>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                    {formatDuration(allocation.estimateMinutes)}
                  </span>
                </div>
                <BlockProgressBar
                  value={allocation.estimateMinutes}
                  max={Math.max(summary.totalEstimateMinutes, 1)}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-surface border border-muted bg-background p-surface">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Task editor
            </h3>
            <p className="mt-1 text-xs text-toned">{taskEditorDescription}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full px-4"
              onClick={addTask}
            >
              <Plus />
              Add Task
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full px-4"
              disabled={filteredCollectedTasks.length === 0 || operationState.pending}
              onClick={prioritizeWithAi}
            >
              {operationState.pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {operationState.pending
                ? operationState.label || "Running analysis"
                : "AI Prioritize"}
            </Button>
          </div>
        </div>

        {summary.prioritizedTasks.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-muted bg-background py-12 text-center">
            <p className="text-sm font-medium text-toned">
              {scopedCollectedTasks.length === 0
                ? "No tasks to prioritize yet."
                : "No tasks match the current filters."}
            </p>
            {scopedCollectedTasks.length === 0 ? (
              <Button
                type="button"
                size="sm"
                className="mt-4 rounded-full px-4"
                onClick={addTask}
              >
                <Plus />
                Add task
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {summary.prioritizedTasks.map((item) => (
              <article
                key={getCollectedTaskKey(item)}
                className="rounded-surface border border-muted bg-background p-surface"
              >
                <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,0.7fr)]">
                  <div className="flex items-start pt-2">
                    <BlockCheckbox
                      checked={item.task.completed}
                      onCheckedChange={(checked) => toggleTaskCompleted(item, checked)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-lg">
                        {item.sourceNodeTitle}
                      </Badge>
                      <Badge variant="secondary" className="rounded-lg">
                        {item.blockTitle}
                      </Badge>
                      {isDerivedTask(item) ? (
                        <Badge variant="secondary" className="rounded-lg">
                          Content pipeline
                        </Badge>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => navigateToTaskSource(item)}
                      >
                        <ArrowUpRight />
                        Open source
                      </Button>
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                      {formatRelativeTaskMeta(item)}
                    </p>

                    {isDerivedTask(item) ? (
                      <p className="text-xs text-toned">
                        Urgency, importance, estimate, and due date are derived from the source
                        content pipeline and are read-only here.
                      </p>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
                      <Input
                        value={item.task.text}
                        placeholder="Task name"
                        className="rounded-xl"
                        onChange={(event) => updateTaskText(item, event.target.value)}
                      />

                      {!isDerivedTask(item) ? (
                        <BlockSelect
                          value={item.task.domain ?? ""}
                          options={domainOptions}
                          className="rounded-xl"
                          aria-label="Task domain"
                          onValueChange={(value) => updateTaskDomain(item, value)}
                        />
                      ) : (
                        <Input
                          value={getWorkspaceTaskDomainLabel(item.task.domain)}
                          className="rounded-xl"
                          disabled
                        />
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 rounded-xl border border-muted bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                            Urgency
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {item.task.urgency}/10
                          </span>
                        </div>
                        <BlockSlider
                          value={item.task.urgency}
                          min={1}
                          max={10}
                          disabled={isDerivedTask(item)}
                          className="bg-destructive/20 accent-destructive disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Urgency for ${item.task.text || "task"}`}
                          onChange={(event) => updateTaskUrgency(item, event.target.value)}
                        />
                      </div>

                      <div className="space-y-2 rounded-xl border border-muted bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                            Importance
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {item.task.importance}/10
                          </span>
                        </div>
                        <BlockSlider
                          value={item.task.importance}
                          min={1}
                          max={10}
                          disabled={isDerivedTask(item)}
                          className="bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Importance for ${item.task.text || "task"}`}
                          onChange={(event) => updateTaskImportance(item, event.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)_auto] xl:grid-cols-1">
                    <div className="space-y-1">
                      <label className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                        Time Estimate
                      </label>
                      <Input
                        value={String(item.task.estimateMinutes)}
                        type="number"
                        className="rounded-xl"
                        disabled={isDerivedTask(item)}
                        aria-label={`Time estimate for ${item.task.text || "task"}`}
                        onChange={(event) => updateTaskEstimate(item, event.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                        Due Date
                      </label>
                      <AgencyDateField
                        value={item.task.dueDate ?? ""}
                        displayStyle="short"
                        className="h-8 rounded-xl"
                        disabled={isDerivedTask(item)}
                        aria-label={`Due date for ${item.task.text || "task"}`}
                        onChange={(next) => updateTaskDueDate(item, next)}
                        onClear={() => updateTaskDueDate(item, "")}
                      />
                    </div>

                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${item.task.text || "task"}`}
                        onClick={() => removeTaskItem(item)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-surface border border-muted bg-background p-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              AI battle plan
            </h3>
            <p className="mt-1 text-xs text-toned">
              The Orchestrator agent turns the current filtered matrix scope into a concrete
              sequencing recommendation.
            </p>
          </div>

          {block.battlePlanUpdatedAt ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-toned">
              Last updated {formatDateTime(block.battlePlanUpdatedAt)}
            </p>
          ) : null}
        </div>

        <div
          className="prose prose-sm dark:prose-invert mt-6 max-w-none rounded-surface border border-muted bg-background p-surface text-sm leading-relaxed text-toned shadow-sm"
          dangerouslySetInnerHTML={{
            __html: renderSimpleMarkdown(
              block.latestBattlePlan ||
                "Run AI Prioritize to generate a battle plan from the current filtered matrix scope.",
            ),
          }}
        />
      </section>

      {currentNode && isOrchestratorNode ? (
        <WorkspaceOrchestratorSourcesModal
          open={sourcesModalOpen}
          onOpenChange={setSourcesModalOpen}
          orchestratorNode={currentNode}
          allNodes={allNodes}
          onConnect={connectSource}
          onDisconnect={disconnectSource}
          onMutateTask={handleMutateTask}
          onRemoveTask={removeCollectedTask}
          onAddTask={addTaskToSource}
          onNavigateToSource={navigateToSource}
        />
      ) : null}
    </div>
  );
}
