import {
  getTaskListProgress,
  type WorkspaceTask,
  type WorkspaceTaskDomain,
  type WorkspaceTaskListBlock,
  type WorkspaceTaskPriority,
} from "@orch/workspace";
import { Calendar, ChevronUp, Clock, Plus, Settings2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { BlockFieldLabel } from "@/features/workspace/node/blocks/shared/block-field-label";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { BlockSlider } from "@/features/workspace/node/blocks/shared/block-slider";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

function toTaskPriority(value: string): WorkspaceTaskPriority | null {
  return value === "low" || value === "medium" || value === "high" ? value : null;
}

function toTaskDomain(value: string): WorkspaceTaskDomain | null {
  const validDomains = [
    "strategy",
    "people",
    "sales",
    "content",
    "brand",
    "finance",
    "education",
    "orchestrator",
  ];
  return validDomains.includes(value) ? (value as WorkspaceTaskDomain) : null;
}

function clampTenPointScale(value: string) {
  const numeric = Number(value || 5);
  return Math.min(10, Math.max(1, Math.round(numeric)));
}

function clampEstimate(value: string) {
  const numeric = Number(value || 0);
  return Math.min(1440, Math.max(0, Math.round(numeric)));
}

export function WorkspaceTaskListBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceTaskListBlock>) {
  const { priorityOptions, domainOptions, addTask, mutateTask, removeTask, getPriorityBadgeClass } =
    useWorkspaceNodeEditorContext();

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const progress = useMemo(() => getTaskListProgress(block), [block]);

  function toggleTask(taskId: string) {
    setExpandedTaskId((current) => (current === taskId ? null : taskId));
  }

  function updateTask(taskId: string, mutator: (task: WorkspaceTask) => void) {
    mutateTask(tabId, block.id, taskId, mutator);
  }

  function handleAddTask() {
    addTask(tabId, block.id);
  }

  if (block.tasks.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">Add a task to start tracking work.</p>
        <Button type="button" className="rounded-full" onClick={handleAddTask}>
          <Plus />
          Add task
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {progress.completed} of {progress.total} complete
        </p>
        <BlockProgressBar
          className="min-w-24 max-w-48 flex-1"
          value={progress.completed}
          max={progress.total}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ml-auto rounded-full"
          onClick={handleAddTask}
        >
          <Plus />
          Add task
        </Button>
      </div>

      <div className="space-y-2">
        {block.tasks.map((task) => (
          <div
            key={task.id}
            className="flex flex-col overflow-hidden rounded-xl border border-muted"
          >
            <div className="flex items-center gap-3 p-3">
              <BlockCheckbox
                checked={task.completed}
                className="size-5"
                aria-label={task.completed ? "Mark task as open" : "Mark task as complete"}
                onCheckedChange={(checked) =>
                  updateTask(task.id, (entry) => {
                    entry.completed = checked;
                  })
                }
              />

              <Input
                value={task.text}
                placeholder="What needs to be done?"
                className={cn(
                  "flex-1 border-0 bg-transparent px-0 font-medium shadow-none focus-visible:ring-0",
                  task.completed ? "text-muted-foreground line-through" : "text-foreground",
                )}
                onChange={(event) =>
                  updateTask(task.id, (entry) => {
                    entry.text = event.target.value.slice(0, 240);
                  })
                }
              />

              <div className="flex items-center gap-1">
                {task.priority ? (
                  <Badge
                    variant="secondary"
                    className={cn("rounded-full", getPriorityBadgeClass(task.priority))}
                  >
                    {task.priority}
                  </Badge>
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  aria-label={
                    expandedTaskId === task.id ? "Hide task details" : "Show task details"
                  }
                  onClick={() => toggleTask(task.id)}
                >
                  {expandedTaskId === task.id ? <ChevronUp /> : <Settings2 />}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full hover:text-destructive"
                  aria-label="Delete task"
                  onClick={() => removeTask(tabId, block.id, task.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>

            {expandedTaskId === task.id ? (
              <div className="grid gap-6 border-t border-muted p-5 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <BlockFieldLabel>Due Date</BlockFieldLabel>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        value={task.dueDate ?? ""}
                        className="rounded-xl pl-10"
                        onChange={(event) =>
                          updateTask(task.id, (entry) => {
                            entry.dueDate = event.target.value || null;
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <BlockFieldLabel>Priority</BlockFieldLabel>
                      <BlockSelect
                        value={task.priority ?? ""}
                        options={priorityOptions}
                        onValueChange={(value) =>
                          updateTask(task.id, (entry) => {
                            entry.priority = toTaskPriority(value);
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <BlockFieldLabel>Domain</BlockFieldLabel>
                      <BlockSelect
                        value={task.domain ?? ""}
                        options={domainOptions}
                        onValueChange={(value) =>
                          updateTask(task.id, (entry) => {
                            entry.domain = toTaskDomain(value);
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <BlockFieldLabel>Urgency</BlockFieldLabel>
                        <span className="text-xs font-semibold">{task.urgency}</span>
                      </div>
                      <BlockSlider
                        value={task.urgency}
                        min={1}
                        max={10}
                        onChange={(event) =>
                          updateTask(task.id, (entry) => {
                            entry.urgency = clampTenPointScale(event.target.value);
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <BlockFieldLabel>Importance</BlockFieldLabel>
                        <span className="text-xs font-semibold">{task.importance}</span>
                      </div>
                      <BlockSlider
                        value={task.importance}
                        min={1}
                        max={10}
                        onChange={(event) =>
                          updateTask(task.id, (entry) => {
                            entry.importance = clampTenPointScale(event.target.value);
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <BlockFieldLabel>Estimate (min)</BlockFieldLabel>
                    <div className="relative">
                      <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        step={5}
                        value={String(task.estimateMinutes)}
                        className="rounded-xl pl-10 font-mono font-semibold"
                        onChange={(event) =>
                          updateTask(task.id, (entry) => {
                            entry.estimateMinutes = clampEstimate(event.target.value);
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
