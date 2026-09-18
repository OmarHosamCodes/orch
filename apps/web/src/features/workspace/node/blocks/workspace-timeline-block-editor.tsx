import {
  WORKSPACE_TIMELINE_MILESTONE_STATUSES,
  type WorkspaceTimelineBlock,
  type WorkspaceTimelineMilestoneStatus,
} from "@orch/workspace";
import { ChevronDown, ChevronUp, Plus, Settings2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { AgencyDateField } from "@/features/shared/date/agency-date-field";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

const statusLabels: Record<WorkspaceTimelineMilestoneStatus, string> = {
  planned: "Planned",
  active: "Active",
  done: "Done",
  blocked: "Blocked",
};

function toTimelineStatus(value: string): WorkspaceTimelineMilestoneStatus {
  return value === "active" || value === "done" || value === "blocked" ? value : "planned";
}

function getStatusColor(status: WorkspaceTimelineMilestoneStatus) {
  switch (status) {
    case "done":
      return "text-success bg-success/10 border-success/20";
    case "active":
      return "text-primary bg-primary/10 border-primary/20";
    case "blocked":
      return "text-destructive bg-destructive/10 border-destructive/20";
    case "planned":
      return "text-muted-foreground bg-muted border-muted";
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export function WorkspaceTimelineBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceTimelineBlock>) {
  const {
    addTimelineMilestone,
    mutateTimelineMilestone,
    removeTimelineMilestone,
    moveTimelineMilestone,
  } = useWorkspaceNodeEditorContext();

  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);

  const timelineSummary = useMemo(() => {
    const total = block.milestones.length;
    const doneCount = block.milestones.filter((milestone) => milestone.status === "done").length;

    return {
      total,
      doneCount,
    };
  }, [block.milestones]);

  function toggleMilestone(id: string) {
    setExpandedMilestoneId((current) => (current === id ? null : id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-48 flex-1 space-y-2">
          <p className="text-sm text-toned">
            {timelineSummary.doneCount}/{timelineSummary.total} done
          </p>
          <BlockProgressBar
            value={timelineSummary.doneCount}
            max={Math.max(timelineSummary.total, 1)}
          />
        </div>
        {block.milestones.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full px-4"
            aria-label="Add timeline milestone"
            onClick={() => addTimelineMilestone(tabId, block.id)}
          >
            <Plus />
            Add milestone
          </Button>
        ) : null}
      </div>

      {block.milestones.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No milestones yet.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3 rounded-full"
            aria-label="Add timeline milestone"
            onClick={() => addTimelineMilestone(tabId, block.id)}
          >
            <Plus />
            Add milestone
          </Button>
        </div>
      ) : (
        <div className="relative space-y-6 pl-8">
          <div className="absolute top-4 bottom-4 left-[15px] w-px bg-border" />

          {block.milestones.map((milestone, index) => {
            const isExpanded = expandedMilestoneId === milestone.id;

            return (
              <article key={milestone.id} className="relative">
                <div
                  className={cn(
                    "absolute top-0 -left-[21px] z-10 size-5 rounded-full border-2 bg-background",
                    getStatusColor(milestone.status),
                  )}
                />

                <div
                  className={cn(
                    "rounded-xl border border-muted p-4",
                    isExpanded && "ring-1 ring-primary/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {milestone.date || "No date set"}
                        </span>
                        <BlockSelect
                          value={milestone.status}
                          options={WORKSPACE_TIMELINE_MILESTONE_STATUSES.map((status) => ({
                            label: statusLabels[status],
                            value: status,
                          }))}
                          className="h-8 w-[140px]"
                          aria-label={`Status for ${milestone.title || "milestone"}`}
                          onValueChange={(value) =>
                            mutateTimelineMilestone(tabId, block.id, milestone.id, (entry) => {
                              entry.status = toTimelineStatus(value);
                            })
                          }
                        />
                      </div>

                      <Input
                        value={milestone.title}
                        placeholder="Milestone name..."
                        className="w-full border-0 bg-transparent px-0 text-lg leading-tight font-semibold shadow-none focus-visible:ring-0"
                        onChange={(event) =>
                          mutateTimelineMilestone(tabId, block.id, milestone.id, (entry) => {
                            entry.title = event.target.value.slice(0, 160);
                          })
                        }
                      />

                      {milestone.note && !isExpanded ? (
                        <p className="line-clamp-2 text-sm text-toned">{milestone.note}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-toned hover:text-foreground"
                        aria-label={
                          isExpanded ? "Hide milestone details" : "Show milestone details"
                        }
                        aria-expanded={isExpanded}
                        onClick={() => toggleMilestone(milestone.id)}
                      >
                        {isExpanded ? <ChevronUp /> : <Settings2 />}
                      </Button>

                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 rounded-lg text-toned hover:text-foreground"
                          disabled={index === 0}
                          aria-label={`Move ${milestone.title || "milestone"} up`}
                          onClick={() => moveTimelineMilestone(tabId, block.id, milestone.id, "up")}
                        >
                          <ChevronUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 rounded-lg text-toned hover:text-foreground"
                          disabled={index === block.milestones.length - 1}
                          aria-label={`Move ${milestone.title || "milestone"} down`}
                          onClick={() =>
                            moveTimelineMilestone(tabId, block.id, milestone.id, "down")
                          }
                        >
                          <ChevronDown />
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-toned hover:text-destructive"
                        aria-label={`Remove ${milestone.title || "milestone"}`}
                        onClick={() => removeTimelineMilestone(tabId, block.id, milestone.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="mt-4 space-y-4 border-t border-muted pt-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Milestone date
                        </Label>
                        <AgencyDateField
                          value={milestone.date ?? ""}
                          displayStyle="short"
                          className="h-8 rounded-xl"
                          aria-label="Milestone date"
                          onChange={(next) =>
                            mutateTimelineMilestone(tabId, block.id, milestone.id, (entry) => {
                              entry.date = next || null;
                            })
                          }
                          onClear={() =>
                            mutateTimelineMilestone(tabId, block.id, milestone.id, (entry) => {
                              entry.date = null;
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Supporting note
                        </Label>
                        <Textarea
                          value={milestone.note}
                          placeholder="Add context, challenges, or success criteria..."
                          className="rounded-xl text-sm leading-relaxed"
                          onChange={(event) =>
                            mutateTimelineMilestone(tabId, block.id, milestone.id, (entry) => {
                              entry.note = event.target.value.slice(0, 2000);
                            })
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
