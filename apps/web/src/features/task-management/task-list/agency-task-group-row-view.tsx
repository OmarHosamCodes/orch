import { Check, ChevronDown, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import type { AgencyTaskGroupRowViewModel } from "@/features/task-management/hooks/use-agency-task-group-row";
import type { RenderAgencyTaskRow } from "@/features/task-management/hooks/use-agency-task-row";
import {
  agencyFocusRingClass,
  agencyTaskRowCheckboxCheckedClass,
  agencyTaskRowCheckboxClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";

type MemberStatus = "open" | "in_progress" | "done";

function memberStatusLabel(status: MemberStatus) {
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

type AgencyTaskGroupRowViewProps = {
  viewModel: AgencyTaskGroupRowViewModel;
  renderTaskRow: RenderAgencyTaskRow;
  renderRateControl?: (task: AgencyProjectTask) => ReactNode;
};

export function AgencyTaskGroupRowView({
  viewModel,
  renderTaskRow,
  renderRateControl,
}: AgencyTaskGroupRowViewProps) {
  const {
    group,
    mode,
    projects,
    teamId,
    currentUserId,
    selectedTaskId,
    onSelect,
    onSelectProject,
    onStatusChange,
    onDeleteInstance,
    onDelete,
    readOnly,
    highlightTaskId,
    expanded,
    progress,
    singleInstance,
    singleInstancePending,
    singleInstanceTrackingState,
    instanceRows,
    onToggleExpanded,
  } = viewModel;

  function rateControl(task: AgencyProjectTask) {
    return renderRateControl?.(task) ?? null;
  }

  if (singleInstance && mode === "work") {
    return renderTaskRow({
      task: singleInstance,
      projects,
      teamId,
      selectedTaskId,
      readOnly,
      highlight: singleInstance.id === highlightTaskId,
      isRowPending: singleInstancePending,
      onSelect: onSelect ?? (() => undefined),
      onSelectProject,
      onStatusChange,
      onDelete,
      trackingState: singleInstanceTrackingState,
    });
  }

  return (
    <li className="group/task-rate-row">
      <div className="flex w-full items-center gap-1 px-3 py-2 transition-colors hover:bg-default/50 motion-reduce:transition-none">
        <button
          type="button"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md text-left",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
          aria-expanded={expanded}
          onClick={onToggleExpanded}
        >
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-200",
              expanded ? "" : "-rotate-90",
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted">
            {group.title}
          </span>
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted">
            ×{group.instanceCount}
          </span>
          {progress.total > 0 ? (
            <span className="shrink-0 text-[10px] font-semibold text-muted">
              {progress.done}/{progress.total} done
            </span>
          ) : null}
        </button>
        {singleInstance ? rateControl(singleInstance) : null}
      </div>

      {expanded ? (
        <ul className="border-t border-default bg-default/30">
          {instanceRows.map(({ instance, createdLabel, viewerDone, pending, deleting }) => {
            if (mode === "work" && currentUserId) {
              return (
                <li
                  key={instance.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-default px-3 py-2 last:border-b-0"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={viewerDone}
                    aria-label={viewerDone ? `${group.title} is done` : `Mark ${group.title} done`}
                    disabled={pending || readOnly || viewerDone}
                    className={cn(
                      agencyTaskRowCheckboxClass,
                      viewerDone && agencyTaskRowCheckboxCheckedClass,
                      (pending || readOnly) && "cursor-not-allowed opacity-50",
                    )}
                    onClick={() => onStatusChange?.(instance, "done")}
                  >
                    {viewerDone ? <Check className="size-2.5" strokeWidth={3} aria-hidden /> : null}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 truncate text-left text-xs font-semibold text-highlighted",
                      agencyFocusRingClass,
                      instance.id === selectedTaskId && "text-primary",
                    )}
                    onClick={() => onSelect?.(instance.id)}
                  >
                    {createdLabel}
                    {instance.assignees.length > 0
                      ? ` · ${instance.assignees.map((a) => a.userName).join(", ")}`
                      : instance.assignedToTeam
                        ? " · Entire team"
                        : ""}
                  </button>
                </li>
              );
            }

            return (
              <li key={instance.id} className="border-b border-default px-3 py-2 last:border-b-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-muted">{createdLabel}</p>
                    <ul className="mt-1 space-y-1">
                      {instance.assignedToTeam ? (
                        <li className="text-xs text-highlighted">Entire team</li>
                      ) : instance.assignees.length === 0 ? (
                        <li className="text-xs text-muted">Unassigned</li>
                      ) : (
                        instance.assignees.map((assignee) => (
                          <li
                            key={assignee.userId}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="truncate font-medium text-highlighted">
                              {assignee.userName}
                            </span>
                            <span className="shrink-0 text-[10px] font-semibold capitalize text-muted">
                              {memberStatusLabel(assignee.status)}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!singleInstance ? rateControl(instance) : null}
                    {onDeleteInstance ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Delete task"
                        disabled={deleting}
                        onClick={() => onDeleteInstance(instance)}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
