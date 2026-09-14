import {
  createWorkspaceOkrKeyResult,
  createWorkspaceOkrObjective,
  getOkrHealth,
  getOkrObjectiveProgress,
  type WorkspaceOkrHealth,
  type WorkspaceOkrTrackerBlock,
} from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

function clampProgress(value: string) {
  const numeric = Number(value || 0);
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function getHealthClasses(health: WorkspaceOkrHealth) {
  switch (health) {
    case "healthy":
      return "border-success/40 bg-success/5";
    case "watch":
      return "border-warning/40 bg-warning/5";
    default:
      return "border-destructive/40 bg-destructive/5";
  }
}

function getHealthTextClasses(health: WorkspaceOkrHealth) {
  switch (health) {
    case "healthy":
      return "text-success";
    case "watch":
      return "text-warning";
    default:
      return "text-destructive";
  }
}

export function WorkspaceOkrTrackerBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceOkrTrackerBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();

  function addObjective() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "okr-tracker") {
        return;
      }
      entry.objectives.push(
        createWorkspaceOkrObjective({
          keyResults: [createWorkspaceOkrKeyResult()],
        }),
      );
    });
  }

  function addKeyResult(objectiveId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "okr-tracker") {
        return;
      }
      const objective = entry.objectives.find((item) => item.id === objectiveId);
      if (!objective) {
        return;
      }
      objective.keyResults.push(createWorkspaceOkrKeyResult());
    });
  }

  function removeObjective(objectiveId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "okr-tracker") {
        return;
      }
      entry.objectives = entry.objectives.filter((objective) => objective.id !== objectiveId);
    });
  }

  function removeKeyResult(objectiveId: string, keyResultId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "okr-tracker") {
        return;
      }
      const objective = entry.objectives.find((item) => item.id === objectiveId);
      if (!objective) {
        return;
      }
      objective.keyResults = objective.keyResults.filter(
        (keyResult) => keyResult.id !== keyResultId,
      );
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Objectives</h2>
          <p className="text-xs text-toned">
            Track objective health from the average of key results.
          </p>
        </div>

        {block.objectives.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={addObjective}
          >
            <Plus />
            New Objective
          </Button>
        ) : null}
      </div>

      {block.objectives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-10 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            Add an objective to track key results.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4 rounded-full"
            onClick={addObjective}
          >
            <Plus />
            Add
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {block.objectives.map((objective) => {
            const progress = getOkrObjectiveProgress(objective);
            const health = getOkrHealth(progress);

            return (
              <article
                key={objective.id}
                className={cn(
                  "overflow-hidden rounded-surface border border-l-4 border-muted bg-background p-surface transition-colors",
                  getHealthClasses(health),
                )}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={objective.title}
                      placeholder="Objective title"
                      className="border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0"
                      onChange={(event) =>
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== "okr-tracker") {
                            return;
                          }
                          const target = entry.objectives.find(
                            (candidate) => candidate.id === objective.id,
                          );
                          if (!target) {
                            return;
                          }
                          target.title = event.target.value.slice(0, 160);
                        })
                      }
                    />
                    <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
                      {objective.keyResults.length} key result
                      {objective.keyResults.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-start gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
                        Progress
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xl font-semibold tracking-tight sm:text-2xl",
                          getHealthTextClasses(health),
                        )}
                      >
                        {progress}%
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove objective"
                      onClick={() => removeObjective(objective.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {objective.keyResults.map((keyResult) => (
                    <div
                      key={keyResult.id}
                      className="rounded-xl border border-muted bg-background p-3"
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <Input
                          value={keyResult.title}
                          placeholder="Key result"
                          className="flex-1 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                          onChange={(event) =>
                            mutateBlock(tabId, block.id, (entry) => {
                              if (entry.type !== "okr-tracker") {
                                return;
                              }
                              const targetObjective = entry.objectives.find(
                                (candidate) => candidate.id === objective.id,
                              );
                              const targetKeyResult = targetObjective?.keyResults.find(
                                (candidate) => candidate.id === keyResult.id,
                              );
                              if (!targetKeyResult) {
                                return;
                              }
                              targetKeyResult.title = event.target.value.slice(0, 160);
                            })
                          }
                        />

                        <span className="min-w-12 text-right font-mono text-sm font-semibold text-primary">
                          {keyResult.progress}%
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove key result"
                          onClick={() => removeKeyResult(objective.id, keyResult.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <BlockProgressBar value={keyResult.progress} max={100} />
                        <input
                          id={`kr-progress-${keyResult.id}`}
                          value={keyResult.progress}
                          type="range"
                          min={0}
                          max={100}
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                          aria-label="Key result progress"
                          onChange={(event) =>
                            mutateBlock(tabId, block.id, (entry) => {
                              if (entry.type !== "okr-tracker") {
                                return;
                              }
                              const targetObjective = entry.objectives.find(
                                (candidate) => candidate.id === objective.id,
                              );
                              const targetKeyResult = targetObjective?.keyResults.find(
                                (candidate) => candidate.id === keyResult.id,
                              );
                              if (!targetKeyResult) {
                                return;
                              }
                              targetKeyResult.progress = clampProgress(event.target.value);
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => addKeyResult(objective.id)}
                  >
                    <Plus />
                    Add Key Result
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
