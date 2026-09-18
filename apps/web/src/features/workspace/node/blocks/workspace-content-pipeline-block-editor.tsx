import {
  WORKSPACE_CONTENT_PIPELINE_STATUSES,
  WORKSPACE_CONTENT_PLATFORMS,
  createWorkspaceContentPipelineItem,
  getContentPipelineSummary,
  workspaceContentPipelineStatusLabels,
  workspaceContentPlatformLabels,
  type WorkspaceContentPipelineBlock,
  type WorkspaceContentPipelineStatus,
  type WorkspaceContentPlatform,
} from "@orch/workspace";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  Camera,
  Lightbulb,
  Link,
  Music2,
  PencilLine,
  Play,
  Plus,
  Rocket,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

const columnConfigs: Array<{
  status: WorkspaceContentPipelineStatus;
  className: string;
  dotClass: string;
  icon: LucideIcon;
}> = [
  {
    status: "ideas",
    className: "border-muted bg-background",
    dotClass: "bg-muted-foreground/60",
    icon: Lightbulb,
  },
  {
    status: "draft",
    className: "border-warning/10 bg-warning/5",
    dotClass: "bg-warning",
    icon: PencilLine,
  },
  {
    status: "review",
    className: "border-primary/10 bg-primary/5",
    dotClass: "bg-primary",
    icon: Eye,
  },
  {
    status: "approved",
    className: "border-success/10 bg-success/5",
    dotClass: "bg-success",
    icon: CheckCircle2,
  },
  {
    status: "published",
    className: "border-secondary/10 bg-secondary/5",
    dotClass: "bg-secondary",
    icon: Rocket,
  },
];

const platformOptions = WORKSPACE_CONTENT_PLATFORMS.map((platform) => ({
  label: workspaceContentPlatformLabels[platform],
  value: platform,
}));

function getPlatformIcon(platform: WorkspaceContentPlatform): LucideIcon {
  switch (platform) {
    case "instagram":
      return Camera;
    case "linkedin":
      return Link;
    case "youtube":
      return Play;
    case "tiktok":
      return Music2;
    default: {
      const exhaustiveCheck: never = platform;
      return exhaustiveCheck;
    }
  }
}

export function WorkspaceContentPipelineBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceContentPipelineBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<WorkspaceContentPipelineStatus | null>(null);

  const summary = useMemo(() => getContentPipelineSummary(block), [block]);

  const itemsByStatus = useMemo(
    () =>
      Object.fromEntries(
        WORKSPACE_CONTENT_PIPELINE_STATUSES.map((status) => [
          status,
          block.items.filter((item) => item.status === status),
        ]),
      ) as Record<WorkspaceContentPipelineStatus, WorkspaceContentPipelineBlock["items"]>,
    [block.items],
  );

  function mutatePipelineBlock(mutator: (entry: WorkspaceContentPipelineBlock) => void) {
    mutateTypedBlock(tabId, block.id, "content-pipeline", mutator);
  }

  function mutateItem(
    itemId: string,
    mutator: (item: WorkspaceContentPipelineBlock["items"][number]) => void,
  ) {
    mutatePipelineBlock((entry) => {
      const target = entry.items.find((candidate) => candidate.id === itemId);
      if (target) {
        mutator(target);
      }
    });
  }

  function addItem(status: WorkspaceContentPipelineStatus = "ideas") {
    mutatePipelineBlock((entry) => {
      entry.items.unshift(
        createWorkspaceContentPipelineItem({
          title: "",
          status,
        }),
      );
    });
  }

  function moveItem(itemId: string, status: WorkspaceContentPipelineStatus) {
    mutateItem(itemId, (item) => {
      item.status = status;
    });
  }

  function removeItem(itemId: string) {
    mutatePipelineBlock((entry) => {
      entry.items = entry.items.filter((item) => item.id !== itemId);
    });
  }

  function moveItemByOffset(itemId: string, offset: -1 | 1) {
    const currentStatus = block.items.find((item) => item.id === itemId)?.status;
    if (!currentStatus) {
      return;
    }

    const currentIndex = WORKSPACE_CONTENT_PIPELINE_STATUSES.indexOf(currentStatus);
    if (currentIndex === -1) {
      return;
    }

    const nextStatus = WORKSPACE_CONTENT_PIPELINE_STATUSES[currentIndex + offset];
    if (!nextStatus) {
      return;
    }

    moveItem(itemId, nextStatus);
  }

  function canMoveItem(itemStatus: WorkspaceContentPipelineStatus, offset: -1 | 1) {
    const currentIndex = WORKSPACE_CONTENT_PIPELINE_STATUSES.indexOf(itemStatus);
    return (
      currentIndex + offset >= 0 &&
      currentIndex + offset < WORKSPACE_CONTENT_PIPELINE_STATUSES.length
    );
  }

  function clearDragState() {
    setDraggingItemId(null);
    setDragOverStatus(null);
  }

  function onItemDragStart(itemId: string, event: React.DragEvent<HTMLElement>) {
    setDraggingItemId(itemId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-workspace-content-item", itemId);
    event.dataTransfer.setData("text/plain", itemId);
  }

  function onColumnDragOver(
    status: WorkspaceContentPipelineStatus,
    event: React.DragEvent<HTMLElement>,
  ) {
    if (!draggingItemId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }

  function onColumnDragLeave(
    status: WorkspaceContentPipelineStatus,
    event: React.DragEvent<HTMLElement>,
  ) {
    const currentTarget = event.currentTarget;
    const nextTarget = event.relatedTarget;

    if (
      currentTarget instanceof HTMLElement &&
      nextTarget instanceof Node &&
      currentTarget.contains(nextTarget)
    ) {
      return;
    }

    if (dragOverStatus === status) {
      setDragOverStatus(null);
    }
  }

  function onColumnDrop(
    status: WorkspaceContentPipelineStatus,
    event: React.DragEvent<HTMLElement>,
  ) {
    event.preventDefault();
    const itemId =
      draggingItemId || event.dataTransfer.getData("application/x-workspace-content-item") || "";

    if (!itemId) {
      clearDragState();
      return;
    }

    moveItem(itemId, status);
    clearDragState();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {summary.totalItems} pieces · {summary.reviewCount} in review · {summary.publishedCount}{" "}
          published
          {summary.topPlatform ? ` · ${workspaceContentPlatformLabels[summary.topPlatform]}` : ""}
        </p>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full px-4"
          onClick={() => addItem()}
        >
          <Plus />
          Add
        </Button>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-6 sm:mx-0 sm:px-0">
        <div className="flex gap-6">
          {columnConfigs.map((column) => {
            const ColumnIcon = column.icon;
            const columnItems = itemsByStatus[column.status] ?? [];

            return (
              <section
                key={column.status}
                className={cn(
                  "flex w-[300px] shrink-0 snap-start flex-col rounded-surface border p-surface",
                  column.className,
                  dragOverStatus === column.status ? "ring-2 ring-primary/30" : "",
                )}
                onDragOver={(event) => onColumnDragOver(column.status, event)}
                onDragLeave={(event) => onColumnDragLeave(column.status, event)}
                onDrop={(event) => onColumnDrop(column.status, event)}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-xl border border-muted bg-background">
                      <ColumnIcon
                        className={cn("size-4", column.dotClass.replace("bg-", "text-"))}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.2em] text-toned">
                        {workspaceContentPipelineStatusLabels[column.status]}
                      </p>
                      <p className="mt-1 text-xs font-bold leading-none text-foreground/60">
                        {columnItems.length} items
                      </p>
                    </div>
                  </div>
                </div>

                <div className="min-h-[400px] flex-1 space-y-3 p-2">
                  {columnItems.map((item) => {
                    const PlatformIcon = getPlatformIcon(item.platform);

                    return (
                      <article
                        key={item.id}
                        draggable
                        className={cn(
                          "group relative rounded-surface border border-muted bg-background p-surface",
                          draggingItemId === item.id
                            ? "pointer-events-none opacity-40"
                            : "cursor-grab active:cursor-grabbing",
                        )}
                        onDragStart={(event) => onItemDragStart(item.id, event)}
                        onDragEnd={clearDragState}
                      >
                        <div className="flex items-start gap-2">
                          <Textarea
                            value={item.title}
                            placeholder="Untitled content piece"
                            rows={1}
                            className="min-h-0 flex-1 resize-none border-0 bg-transparent p-0 text-sm font-bold text-foreground shadow-none placeholder:text-muted focus-visible:ring-0"
                            onChange={(event) =>
                              mutateItem(item.id, (entry) => {
                                entry.title = event.target.value.slice(0, 240);
                              })
                            }
                          />

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-lg"
                              disabled={!canMoveItem(item.status, -1)}
                              aria-label={`Move ${item.title || "content item"} to the previous stage`}
                              onClick={() => moveItemByOffset(item.id, -1)}
                            >
                              <ArrowLeft />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-lg"
                              disabled={!canMoveItem(item.status, 1)}
                              aria-label={`Move ${item.title || "content item"} to the next stage`}
                              onClick={() => moveItemByOffset(item.id, 1)}
                            >
                              <ArrowRight />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-lg hover:text-destructive"
                              aria-label={`Remove ${item.title || "content item"}`}
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <div className="flex w-[110px] items-center gap-1.5">
                            <PlatformIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            <BlockSelect
                              value={item.platform}
                              options={platformOptions}
                              className="h-8 rounded-full border-muted bg-background text-xs"
                              aria-label={`Platform for ${item.title || "content item"}`}
                              onValueChange={(value) =>
                                mutateItem(item.id, (entry) => {
                                  entry.platform = value as WorkspaceContentPlatform;
                                })
                              }
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="relative">
                              <User className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={item.assignee}
                                placeholder="Assignee"
                                className="h-8 rounded-full border-muted bg-background pl-9 text-xs"
                                onChange={(event) =>
                                  mutateItem(item.id, (entry) => {
                                    entry.assignee = event.target.value.slice(0, 120);
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {columnItems.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-surface border border-dashed border-muted bg-background p-surface text-center">
                      <p className="text-sm font-semibold text-muted-foreground">
                        No {workspaceContentPipelineStatusLabels[column.status]} yet.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-3 rounded-full"
                        onClick={() => addItem(column.status)}
                      >
                        <Plus />
                        Add
                      </Button>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
