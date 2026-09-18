import {
  collectWorkspaceNodeTasks,
  getWorkspaceTaskDomainLabel,
  type WorkspaceCollectedTask,
  type WorkspaceNode,
  type WorkspaceTaskDomain,
} from "@orch/workspace";
import {
  ArrowDown,
  ArrowUp,
  Box,
  Check,
  Inbox,
  Layers,
  List,
  Minus,
  Plug2,
  Plus,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/dialog";
import { getEligibleConnectionTargetIds } from "@/features/workspace/utils/workspace-node-connections";
import { cn } from "@/lib/utils";

type GroupMode = "source" | "domain" | "flat";

type TaskGroup = {
  key: string;
  label: string;
  sourceNodeId: string | null;
  items: WorkspaceCollectedTask[];
};

type WorkspaceOrchestratorSourcesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orchestratorNode: WorkspaceNode;
  allNodes: WorkspaceNode[];
  onConnect: (standardNodeId: string) => void;
  onDisconnect: (standardNodeId: string) => void;
  onMutateTask: (
    item: WorkspaceCollectedTask,
    mutator: (task: WorkspaceCollectedTask["task"]) => void,
  ) => void;
  onRemoveTask: (item: WorkspaceCollectedTask) => void;
  onAddTask: (sourceNodeId: string) => void;
  onNavigateToSource: (sourceNodeId: string) => void;
};

export function WorkspaceOrchestratorSourcesModal({
  open,
  onOpenChange,
  orchestratorNode,
  allNodes,
  onConnect,
  onDisconnect,
  onMutateTask,
  onRemoveTask,
  onAddTask,
  onNavigateToSource,
}: WorkspaceOrchestratorSourcesModalProps) {
  const [groupMode, setGroupMode] = useState<GroupMode>("source");
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");

  const connectedNodes = useMemo(() => {
    const nodeById = new Map(allNodes.map((node) => [node.id, node]));

    return orchestratorNode.connections.flatMap((connection) => {
      const target = nodeById.get(connection.targetNodeId);
      if (!target || target.nodeType === "orchestrator") {
        return [];
      }
      return [target];
    });
  }, [allNodes, orchestratorNode.connections]);

  const collectedTasks = useMemo(
    () =>
      collectWorkspaceNodeTasks(orchestratorNode, allNodes).filter(({ task }) => !task.completed),
    [allNodes, orchestratorNode],
  );

  const eligibleNodeOptions = useMemo(() => {
    const eligibleNodeIds = getEligibleConnectionTargetIds(allNodes, orchestratorNode.id);

    return eligibleNodeIds.flatMap((id) => {
      const node = allNodes.find((entry) => entry.id === id);
      if (!node) {
        return [];
      }
      return [{ label: node.title || "Untitled node", value: node.id }];
    });
  }, [allNodes, orchestratorNode.id]);

  const groupedTasks = useMemo<TaskGroup[]>(() => {
    const tasks = collectedTasks;

    if (groupMode === "flat") {
      return [{ key: "all", label: "All Tasks", sourceNodeId: null, items: tasks }];
    }

    if (groupMode === "domain") {
      const byDomain = new Map<string, WorkspaceCollectedTask[]>();

      for (const item of tasks) {
        const domain = item.task.domain ?? "unassigned";
        const group = byDomain.get(domain);
        if (group) {
          group.push(item);
        } else {
          byDomain.set(domain, [item]);
        }
      }

      return Array.from(byDomain.entries()).map(([domain, items]) => ({
        key: domain,
        label:
          domain === "unassigned"
            ? "Unassigned"
            : getWorkspaceTaskDomainLabel(domain as WorkspaceTaskDomain),
        sourceNodeId: null,
        items,
      }));
    }

    const bySource = new Map<string, WorkspaceCollectedTask[]>();

    for (const item of tasks) {
      const group = bySource.get(item.sourceNodeId);
      if (group) {
        group.push(item);
      } else {
        bySource.set(item.sourceNodeId, [item]);
      }
    }

    return Array.from(bySource.entries()).map(([nodeId, items]) => ({
      key: nodeId,
      label: items[0]?.sourceNodeTitle ?? "Unknown",
      sourceNodeId: nodeId,
      items,
    }));
  }, [collectedTasks, groupMode]);

  function sourceHasTaskBlocks(sourceNode: WorkspaceNode) {
    return sourceNode.tabs.some((tab) =>
      tab.blocks.some((entry) => entry.type === "task-list" || entry.type === "eisenhower-matrix"),
    );
  }

  function getSourceTaskCount(sourceNodeId: string) {
    return collectedTasks.filter((item) => item.sourceNodeId === sourceNodeId).length;
  }

  function getSourceBlockCount(sourceNode: WorkspaceNode) {
    return sourceNode.tabs.reduce(
      (count, tab) =>
        count +
        tab.blocks.filter(
          (entry) =>
            entry.type === "task-list" ||
            entry.type === "eisenhower-matrix" ||
            entry.type === "content-pipeline",
        ).length,
      0,
    );
  }

  function handleAddSource() {
    if (!selectedSourceId) {
      return;
    }
    onConnect(selectedSourceId);
    setSelectedSourceId("");
    setAddSourceOpen(false);
  }

  function handleNavigate(sourceNodeId: string) {
    onOpenChange(false);
    onNavigateToSource(sourceNodeId);
  }

  function canEditPriority(item: WorkspaceCollectedTask) {
    return item.blockType !== "content-pipeline";
  }

  function setPriority(item: WorkspaceCollectedTask, priority: "low" | "medium" | "high") {
    onMutateTask(item, (task) => {
      task.priority = priority;
    });
  }

  function getPriorityButtonClass(priority: WorkspaceCollectedTask["task"]["priority"]) {
    switch (priority) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      default:
        return "text-muted-foreground";
    }
  }

  const groupModeButtons: Array<{ key: GroupMode; label: string; icon: typeof Box }> = [
    { key: "source", label: "By Source", icon: Box },
    { key: "domain", label: "By Domain", icon: Layers },
    { key: "flat", label: "All", icon: List },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Sources</DialogTitle>
          <DialogDescription>
            Connect source nodes, browse and manage tasks across all connected sources.
          </DialogDescription>
        </DialogHeader>

        <section>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
              Connected Sources
            </p>
            <Badge variant="secondary" className="rounded-2xl">
              {connectedNodes.length} source{connectedNodes.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {connectedNodes.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-muted bg-background py-8 text-center">
              <Plug2 className="mx-auto size-8 text-muted" />
              <p className="mt-2 text-sm text-toned">
                No sources connected. Add a node to start aggregating tasks.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {connectedNodes.map((source) => {
                const taskCount = getSourceTaskCount(source.id);
                const blockCount = getSourceBlockCount(source);

                return (
                  <li
                    key={source.id}
                    className="flex items-center justify-between gap-3 rounded-surface border border-muted bg-card px-surface py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Box className="size-4 shrink-0 text-toned" />
                      <button
                        type="button"
                        className="min-w-0 truncate text-sm font-bold text-foreground transition-colors hover:text-primary"
                        title={`Open ${source.title || "Untitled node"}`}
                        onClick={() => handleNavigate(source.id)}
                      >
                        {source.title || "Untitled node"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-lg">
                        {taskCount} task{taskCount === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="secondary" className="rounded-lg">
                        {blockCount} block{blockCount === 1 ? "" : "s"}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-destructive"
                        aria-label="Disconnect source"
                        onClick={() => onDisconnect(source.id)}
                      >
                        <Unlink />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3">
            {addSourceOpen ? (
              <div className="flex items-center gap-2">
                <BlockSelect
                  value={selectedSourceId}
                  options={[{ label: "Select a node…", value: "" }, ...eligibleNodeOptions]}
                  className="flex-1"
                  aria-label="Select source node"
                  onValueChange={setSelectedSourceId}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-xl"
                  disabled={!selectedSourceId}
                  aria-label="Confirm add source"
                  onClick={handleAddSource}
                >
                  <Plus />
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  aria-label="Cancel add source"
                  onClick={() => setAddSourceOpen(false)}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-xl"
                disabled={eligibleNodeOptions.length === 0}
                onClick={() => setAddSourceOpen(true)}
              >
                <Plus />
                Add Source
              </Button>
            )}
          </div>
        </section>

        <div className="border-t border-muted" />

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
              Task Browser
            </p>
            <div className="flex items-center gap-1">
              {groupModeButtons.map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={groupMode === key ? "secondary" : "ghost"}
                  className="rounded-lg"
                  aria-pressed={groupMode === key}
                  onClick={() => setGroupMode(key)}
                >
                  <Icon />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {collectedTasks.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-muted bg-background py-8 text-center">
              <Inbox className="mx-auto size-8 text-muted" />
              <p className="mt-2 text-sm text-toned">
                No tasks found. Connected sources don&apos;t contain any open tasks yet.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {groupedTasks.map((group) => (
                <div key={group.key} className="rounded-2xl border border-muted bg-background">
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{group.label}</p>
                      <Badge variant="secondary" className="rounded-lg">
                        {group.items.length}
                      </Badge>
                    </div>
                    {group.sourceNodeId &&
                    sourceHasTaskBlocks(
                      allNodes.find((node) => node.id === group.sourceNodeId) ?? orchestratorNode,
                    ) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-lg"
                        aria-label="Add task to this source"
                        onClick={() => onAddTask(group.sourceNodeId!)}
                      >
                        <Plus />
                      </Button>
                    ) : null}
                  </div>

                  <ul className="border-t border-muted">
                    {group.items.map((item) => (
                      <li
                        key={item.task.id}
                        className="flex items-center gap-3 border-b border-muted px-4 py-2.5 last:border-b-0"
                      >
                        <button
                          type="button"
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                            item.task.completed
                              ? "border-primary bg-primary/20 text-primary"
                              : "border-muted hover:border-primary/50",
                          )}
                          aria-label={item.task.completed ? "Reopen task" : "Complete task"}
                          onClick={() =>
                            onMutateTask(item, (task) => {
                              task.completed = !task.completed;
                            })
                          }
                        >
                          {item.task.completed ? <Check className="size-3" /> : null}
                        </button>

                        <p
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm",
                            item.task.completed
                              ? "text-muted-foreground line-through"
                              : "text-foreground",
                          )}
                        >
                          {item.task.text || "Untitled task"}
                        </p>

                        {canEditPriority(item) ? (
                          <div className="flex items-center gap-1">
                            {(
                              [
                                ["High", "high", ArrowUp],
                                ["Medium", "medium", Minus],
                                ["Low", "low", ArrowDown],
                              ] as const
                            ).map(([label, priority, Icon]) => (
                              <Button
                                key={priority}
                                type="button"
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  "rounded-lg px-2",
                                  item.task.priority === priority &&
                                    getPriorityButtonClass(priority),
                                )}
                                aria-label={`Set priority to ${label}`}
                                onClick={() => setPriority(item, priority)}
                              >
                                <Icon className="size-3" />
                              </Button>
                            ))}
                            <span
                              className={cn(
                                "min-w-12 text-center text-xs font-semibold",
                                getPriorityButtonClass(item.task.priority),
                              )}
                            >
                              {item.task.priority
                                ? item.task.priority.charAt(0).toUpperCase() +
                                  item.task.priority.slice(1)
                                : "—"}
                            </span>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="rounded-lg"
                            disabled
                            title="Priority is derived from content pipeline status and cannot be changed here."
                          >
                            {item.task.priority
                              ? item.task.priority.charAt(0).toUpperCase() +
                                item.task.priority.slice(1)
                              : "Derived"}
                          </Button>
                        )}

                        {groupMode !== "source" ? (
                          <button
                            type="button"
                            className="max-w-28 truncate rounded-lg bg-muted/20 px-2 py-0.5 text-[10px] font-bold text-toned transition-colors hover:text-primary"
                            title={`Go to ${item.sourceNodeTitle}`}
                            onClick={() => handleNavigate(item.sourceNodeId)}
                          >
                            {item.sourceNodeTitle}
                          </button>
                        ) : null}

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-lg text-destructive"
                          aria-label="Delete task"
                          onClick={() => onRemoveTask(item)}
                        >
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
