import {
  createWorkspaceLeadershipRhythmFilter,
  createWorkspaceLeadershipRhythmMeeting,
  getLeadershipRhythmPlannerSummary,
  isLeadershipMeetingMissed,
  isLeadershipMeetingUpcoming,
  matchesLeadershipRhythmFilter,
  sortLeadershipRhythmMeetings,
  workspaceLeadershipMeetingStatusLabels,
  workspaceLeadershipRhythmFilterLabels,
  workspaceLeadershipRhythmLabels,
  type WorkspaceLeadershipMeetingStatus,
  type WorkspaceLeadershipRhythm,
  type WorkspaceLeadershipRhythmFilter,
  type WorkspaceLeadershipRhythmPlannerBlock,
} from "@orch/workspace";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { AgencyDateField } from "@/features/shared/date/agency-date-field";
import { BlockFieldLabel } from "@/features/workspace/node/blocks/shared/block-field-label";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

const rhythmOptions: Array<{ label: string; value: WorkspaceLeadershipRhythm }> = [
  { label: workspaceLeadershipRhythmLabels.weekly, value: "weekly" },
  { label: workspaceLeadershipRhythmLabels.monthly, value: "monthly" },
  { label: workspaceLeadershipRhythmLabels.quarterly, value: "quarterly" },
];

const filterOptions: WorkspaceLeadershipRhythmFilter[] = ["all", "missed", "upcoming"];
const statusOptions: WorkspaceLeadershipMeetingStatus[] = [
  "scheduled",
  "missed",
  "done",
  "needs-reschedule",
];

function toRhythm(value: string): WorkspaceLeadershipRhythm {
  return value === "weekly" || value === "monthly" || value === "quarterly" ? value : "weekly";
}

function getMeetingClasses(meeting: WorkspaceLeadershipRhythmPlannerBlock["meetings"][number]) {
  if (meeting.status === "done") {
    return "border-success/30 bg-success/5";
  }

  if (isLeadershipMeetingMissed(meeting) || meeting.status === "needs-reschedule") {
    return "border-destructive/30 bg-destructive/5";
  }

  if (isLeadershipMeetingUpcoming(meeting)) {
    return "border-primary/30 bg-primary/5";
  }

  return "border-muted bg-background";
}

function getStatusBadgeVariant(
  meeting: WorkspaceLeadershipRhythmPlannerBlock["meetings"][number],
): "destructive" | "success" | "default" {
  if (isLeadershipMeetingMissed(meeting)) {
    return "destructive";
  }
  if (meeting.status === "done") {
    return "success";
  }
  return "default";
}

export function WorkspaceLeadershipRhythmPlannerBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceLeadershipRhythmPlannerBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getLeadershipRhythmPlannerSummary(block), [block]);

  const visibleMeetings = useMemo(
    () =>
      sortLeadershipRhythmMeetings(block.meetings).filter((meeting) =>
        matchesLeadershipRhythmFilter(meeting, block.filter),
      ),
    [block.meetings, block.filter],
  );

  function getFilterCount(filter: WorkspaceLeadershipRhythmFilter) {
    return block.meetings.filter((meeting) => matchesLeadershipRhythmFilter(meeting, filter))
      .length;
  }

  function addMeeting() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "leadership-rhythm-planner") {
        return;
      }

      entry.meetings.push(
        createWorkspaceLeadershipRhythmMeeting({
          name: "New recurring meeting",
          rhythm: "weekly",
          status: "scheduled",
        }),
      );
    });
  }

  function mutateMeeting(
    meetingId: string,
    mutator: (meeting: WorkspaceLeadershipRhythmPlannerBlock["meetings"][number]) => void,
  ) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "leadership-rhythm-planner") {
        return;
      }

      const meeting = entry.meetings.find((candidate) => candidate.id === meetingId);
      if (!meeting) {
        return;
      }

      mutator(meeting);
    });
  }

  function removeMeeting(meetingId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "leadership-rhythm-planner") {
        return;
      }

      entry.meetings = entry.meetings.filter((meeting) => meeting.id !== meetingId);
    });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Leadership Rhythm Planner
            </h2>
            <p className="text-xs text-toned">Track recurring meetings to prevent cadence gaps.</p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={addMeeting}
          >
            <Plus />
            Add Meeting
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {summary.cadenceHealthPercent}% cadence health · {summary.upcomingCount} upcoming ·{" "}
            {summary.missedCount} missed · {summary.totalMeetings} total
          </p>
          <BlockProgressBar
            className="min-w-24 max-w-48 flex-1"
            value={summary.cadenceHealthPercent}
            max={100}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-2 px-1">
        {filterOptions.map((filter) => (
          <Button
            key={filter}
            type="button"
            variant={block.filter === filter ? "secondary" : "ghost"}
            size="sm"
            className="rounded-full px-3"
            onClick={() =>
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== "leadership-rhythm-planner") {
                  return;
                }
                entry.filter = createWorkspaceLeadershipRhythmFilter(filter);
              })
            }
          >
            {workspaceLeadershipRhythmFilterLabels[filter]} · {getFilterCount(filter)}
          </Button>
        ))}
      </div>

      {visibleMeetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted bg-background py-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted">
            <Calendar className="size-6" />
          </div>
          {block.meetings.length === 0 ? (
            <>
              <p className="mt-3 text-sm text-toned">No meetings yet.</p>
              <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={addMeeting}>
                <Plus />
                Add
              </Button>
            </>
          ) : (
            <p className="mt-3 text-sm text-toned">No meetings match this filter.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleMeetings.map((meeting) => (
            <article
              key={meeting.id}
              className={cn(
                "rounded-surface border border-muted p-surface transition-all",
                getMeetingClasses(meeting),
              )}
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Input
                    value={meeting.name}
                    placeholder="Meeting name"
                    className="border-0 bg-transparent px-0 text-base font-semibold tracking-tight shadow-none focus-visible:ring-0"
                    onChange={(event) =>
                      mutateMeeting(meeting.id, (entry) => {
                        entry.name = event.target.value.slice(0, 120);
                      })
                    }
                  />
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(meeting)} className="rounded-lg px-3">
                    {workspaceLeadershipMeetingStatusLabels[meeting.status]}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove meeting"
                    onClick={() => removeMeeting(meeting.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-1.5">
                {statusOptions.map((status) => (
                  <Button
                    key={`${meeting.id}-${status}`}
                    type="button"
                    size="sm"
                    variant={meeting.status === status ? "secondary" : "ghost"}
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={() =>
                      mutateMeeting(meeting.id, (entry) => {
                        entry.status = status;
                      })
                    }
                  >
                    {workspaceLeadershipMeetingStatusLabels[status]}
                  </Button>
                ))}
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <BlockFieldLabel className="mb-1.5 block">Owner</BlockFieldLabel>
                    <Input
                      value={meeting.owner}
                      className="rounded-xl"
                      onChange={(event) =>
                        mutateMeeting(meeting.id, (entry) => {
                          entry.owner = event.target.value.slice(0, 120);
                        })
                      }
                    />
                  </div>

                  <div>
                    <BlockFieldLabel className="mb-1.5 block">Participants</BlockFieldLabel>
                    <Input
                      value={meeting.participants}
                      className="rounded-xl"
                      onChange={(event) =>
                        mutateMeeting(meeting.id, (entry) => {
                          entry.participants = event.target.value.slice(0, 240);
                        })
                      }
                    />
                  </div>

                  <div>
                    <BlockFieldLabel className="mb-1.5 block">Frequency</BlockFieldLabel>
                    <BlockSelect
                      value={meeting.rhythm}
                      options={rhythmOptions}
                      className="rounded-xl"
                      onValueChange={(value) =>
                        mutateMeeting(meeting.id, (entry) => {
                          entry.rhythm = toRhythm(value);
                        })
                      }
                    />
                  </div>

                  <div>
                    <BlockFieldLabel className="mb-1.5 block">Next Date</BlockFieldLabel>
                    <AgencyDateField
                      value={meeting.nextDate ?? ""}
                      displayStyle="short"
                      className="h-8 rounded-xl"
                      aria-label="Next date"
                      onChange={(next) =>
                        mutateMeeting(meeting.id, (entry) => {
                          entry.nextDate = next || null;
                        })
                      }
                      onClear={() =>
                        mutateMeeting(meeting.id, (entry) => {
                          entry.nextDate = null;
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="sm:col-span-2">
                    <BlockFieldLabel className="mb-1.5 block">Purpose & Agenda</BlockFieldLabel>
                    <Textarea
                      value={meeting.purpose}
                      rows={3}
                      className="rounded-2xl bg-background"
                      onChange={(event) =>
                        mutateMeeting(meeting.id, (entry) => {
                          entry.purpose = event.target.value.slice(0, 4000);
                        })
                      }
                    />
                  </div>

                  <div>
                    <BlockFieldLabel className="mb-1.5 block">Duration (min)</BlockFieldLabel>
                    <Input
                      type="number"
                      value={String(meeting.durationMinutes)}
                      className="w-20 rounded-xl"
                      onChange={(event) =>
                        mutateMeeting(meeting.id, (entry) => {
                          entry.durationMinutes = Math.min(
                            480,
                            Math.max(
                              15,
                              Math.round(Number(event.target.value || entry.durationMinutes)),
                            ),
                          );
                        })
                      }
                    />
                  </div>

                  <div className="flex min-w-[120px] flex-col justify-center rounded-surface border border-muted bg-background px-3 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                      {workspaceLeadershipRhythmLabels[meeting.rhythm]}
                    </span>
                    {isLeadershipMeetingUpcoming(meeting) ? (
                      <span className="mt-1 text-sm font-semibold tracking-tight text-primary">
                        Upcoming
                      </span>
                    ) : isLeadershipMeetingMissed(meeting) ? (
                      <span className="mt-1 text-sm font-semibold tracking-tight text-destructive">
                        Attention
                      </span>
                    ) : (
                      <span className="mt-1 text-sm font-semibold tracking-tight text-foreground">
                        On track
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
