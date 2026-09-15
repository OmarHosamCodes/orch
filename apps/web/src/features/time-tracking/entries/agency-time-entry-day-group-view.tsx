import { Copy, Pencil, Trash2, TrashIcon, X } from "lucide-react";

import {
  agencyTimeEntryBulkActionClass,
  agencyTimeEntryBulkRowSelectedClass,
  agencyTimeEntryBulkSelectColumnClass,
  agencyTimeEntryBulkToolbarClass,
  agencyTimeEntryDayGroupClass,
  agencyTimeEntryDayHeadClass,
  agencyTimeEntryIconButtonClass,
  agencyTimeEntrySectionHeaderBulkActiveClass,
  agencyTimeEntrySectionHeaderClass,
  agencyTimeTrackerIconActionClass,
  agencyWorkMetricClass,
} from "@/features/shared/agency-ui";
import { formatAgencyDayLabel } from "@/features/time-tracking/format-agency-day-label";
import { formatDuration } from "@/lib/utils/format-duration";
import {
  flattenCollapsedGroupsForBulkEdit,
  type TimeEntryDayGroup,
} from "@/features/time-tracking/group-time-entries";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import type { AgencyTagOption } from "@/features/time-tracking/choosers/agency-tag-chooser";
import { AgencyTaskChooser } from "@/features/time-tracking/choosers/agency-task-chooser";
import { AgencyTagChooser } from "@/features/time-tracking/choosers/agency-tag-chooser";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

/** Kept for the entries-log hook bulk patch draft. */
export type AgencyDayBulkDraft = {
  projectId: string;
  taskId: string;
  description: string;
  tagIds: string[];
  isBillable: boolean | null;
};

type AgencyTimeEntryDayGroupViewProps = {
  teamId: string;
  day: TimeEntryDayGroup;
  renderGroupRow: AgencyTimeEntryGroupRowRenderer;
  selectedEntryIds?: Set<string>;
  bulkEditActive?: boolean;
  bulkFieldEditOpen?: boolean;
  bulkDraft?: AgencyDayBulkDraft;
  onBulkDraftChange?: (patch: Partial<AgencyDayBulkDraft>) => void;
  onToggleEntrySelected?: (entryIds: string[]) => void;
  onToggleDayBulkEdit?: (dateKey: string) => void;
  onToggleBulkFieldEdit?: () => void;
  onDeleteSelected?: (entryIds: string[]) => void;
  onMarkSelectedAsWaste?: (entryIds: string[]) => void;
  onApplyBulk?: () => void;
  onCreateTag?: (name: string) => void;
  tagCreatePending?: boolean;
  tags?: AgencyTagOption[];
  projects?: AgencyProject[];
  tasks?: AgencyProjectTask[];
  wastePending?: boolean;
};

export function AgencyTimeEntryDayGroupView({
  teamId,
  day,
  renderGroupRow,
  selectedEntryIds,
  bulkEditActive = false,
  bulkFieldEditOpen = false,
  bulkDraft,
  onBulkDraftChange,
  onToggleEntrySelected,
  onToggleDayBulkEdit,
  onToggleBulkFieldEdit,
  onDeleteSelected,
  onMarkSelectedAsWaste,
  onApplyBulk,
  onCreateTag,
  tagCreatePending = false,
  tags = [],
  projects = [],
  tasks = [],
  wastePending = false,
}: AgencyTimeEntryDayGroupViewProps) {
  const dayEntryIds = day.groups.flatMap((group) => group.entries.map((entry) => entry.id));
  const selectedDayEntryIds = dayEntryIds.filter((id) => selectedEntryIds?.has(id));
  const selectedCount = selectedDayEntryIds.length;
  const allSelected = dayEntryIds.length > 0 && selectedCount === dayEntryIds.length;
  const partiallySelected = selectedCount > 0 && !allSelected;
  const hasSelection = selectedCount > 0;
  const hasBulkPatch = Boolean(
    bulkDraft?.projectId ||
    bulkDraft?.taskId ||
    bulkDraft?.description.trim() ||
    bulkDraft?.tagIds.length ||
    bulkDraft?.isBillable === true ||
    bulkDraft?.isBillable === false,
  );
  // Bulk mode selects entries one-by-one; flatten so expanded multi-groups
  // don't hide child checkboxes behind a single vertically-centered control.
  const displayGroups = bulkEditActive ? flattenCollapsedGroupsForBulkEdit(day.groups) : day.groups;
  const lastDisplayIndex = displayGroups.length - 1;

  return (
    <section
      className={cn(
        agencyTimeEntryDayGroupClass,
        bulkEditActive && hasSelection && "border-primary/30",
      )}
      data-bulk-edit={bulkEditActive ? "true" : undefined}
    >
      <header
        className={cn(
          agencyTimeEntrySectionHeaderClass,
          agencyTimeEntryDayHeadClass,
          "justify-between gap-3 bg-transparent",
          bulkEditActive ? "pr-5 pl-4" : null,
          bulkEditActive && hasSelection && agencyTimeEntrySectionHeaderBulkActiveClass,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {bulkEditActive && onToggleEntrySelected ? (
            <label className={agencyTimeEntryBulkSelectColumnClass}>
              <Checkbox
                checked={partiallySelected ? "indeterminate" : allSelected}
                onCheckedChange={() => onToggleEntrySelected(dayEntryIds)}
                aria-label="Select all entries for day"
                className="size-3.5"
              />
            </label>
          ) : null}

          <span className="min-w-0 shrink truncate text-sm font-semibold text-highlighted">
            {formatAgencyDayLabel(day.dateKey)}
          </span>

          {bulkEditActive ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {hasSelection ? (
                <>
                  <span
                    className="shrink-0 font-mono text-xs tabular-nums text-primary"
                    aria-live="polite"
                  >
                    {selectedCount} selected
                  </span>
                  <span className="h-3 w-px shrink-0 bg-border" aria-hidden />
                  <div className="flex min-w-0 flex-wrap items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className={cn(
                        agencyTimeEntryBulkActionClass,
                        "text-destructive hover:text-destructive",
                      )}
                      disabled={!hasSelection}
                      onClick={() => onDeleteSelected?.(selectedDayEntryIds)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className={cn(
                        agencyTimeEntryBulkActionClass,
                        "hover:text-warning",
                        wastePending && "opacity-60",
                      )}
                      disabled={!hasSelection || wastePending}
                      onClick={() => onMarkSelectedAsWaste?.(selectedDayEntryIds)}
                    >
                      <TrashIcon className="size-3.5" />
                      Mark as waste
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className={cn(
                        agencyTimeEntryBulkActionClass,
                        bulkFieldEditOpen && "bg-elevated text-highlighted",
                      )}
                      disabled={!hasSelection}
                      aria-pressed={bulkFieldEditOpen}
                      onClick={() => onToggleBulkFieldEdit?.()}
                    >
                      <Pencil className="size-3.5" />
                      Bulk edit
                    </Button>
                  </div>
                </>
              ) : (
                <span className="truncate text-xs text-muted">Select entries to edit</span>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-xs text-muted">Total</span>
            <span className={agencyWorkMetricClass}>
              {formatDuration(day.totalSeconds, "clock")}
            </span>
          </div>
          {onToggleDayBulkEdit ? (
            <button
              type="button"
              className={cn(
                agencyTimeEntryIconButtonClass,
                bulkEditActive && "bg-elevated text-highlighted",
                !bulkEditActive &&
                  "opacity-0 transition-opacity group-hover/day:opacity-100 focus-visible:opacity-100 motion-reduce:opacity-100",
              )}
              aria-label={bulkEditActive ? "Exit bulk edit" : "Bulk edit day"}
              aria-pressed={bulkEditActive}
              onClick={() => onToggleDayBulkEdit(day.dateKey)}
            >
              {bulkEditActive ? <X className="size-4" /> : <Copy className="size-4" />}
            </button>
          ) : null}
        </div>
      </header>

      {bulkEditActive && bulkFieldEditOpen && bulkDraft && onBulkDraftChange && onApplyBulk ? (
        <div className={agencyTimeEntryBulkToolbarClass} role="group" aria-label="Bulk edit fields">
          <AgencyTaskChooser
            teamId={teamId}
            value={bulkDraft.taskId}
            onValueChange={(taskId, projectId) => {
              const task = tasks.find((item) => item.id === taskId);
              onBulkDraftChange({
                taskId,
                projectId: projectId ?? task?.projectId ?? bulkDraft.projectId,
              });
            }}
            projects={projects}
            tasks={tasks}
            placeholder="Task"
            triggerFormat="task-client"
            contentAlign="start"
          />
          <AgencyTagChooser
            value={bulkDraft.tagIds}
            tags={tags}
            onValueChange={(tagIds) => onBulkDraftChange({ tagIds })}
            onCreateTag={onCreateTag}
            creating={tagCreatePending}
          />
          <button
            type="button"
            className={cn(
              agencyTimeTrackerIconActionClass,
              bulkDraft.isBillable === null ? "text-muted" : "text-info",
            )}
            aria-pressed={bulkDraft.isBillable ?? false}
            aria-label={
              bulkDraft.isBillable === null
                ? "Leave billable unchanged"
                : bulkDraft.isBillable
                  ? "Set billable"
                  : "Set non-billable"
            }
            onClick={() =>
              onBulkDraftChange({
                isBillable:
                  bulkDraft.isBillable === null ? true : bulkDraft.isBillable ? false : null,
              })
            }
          >
            $
          </button>
          <Input
            value={bulkDraft.description}
            onChange={(e) => onBulkDraftChange({ description: e.target.value })}
            placeholder="Description"
            className="h-8 max-w-[12rem]"
            aria-label="Bulk description"
          />
          <Button size="sm" disabled={selectedCount === 0 || !hasBulkPatch} onClick={onApplyBulk}>
            Apply
          </Button>
        </div>
      ) : null}

      <ul className="flex min-w-0 flex-col">
        {displayGroups.map((group, index) => {
          const primaryEntry = group.entries[0];
          if (!primaryEntry) return null;
          const groupExpandKey = `${day.dateKey}||${group.collapseKey}`;
          const groupEntryIds = group.entries.map((entry) => entry.id);
          const selected = groupEntryIds.every((entryId) => selectedEntryIds?.has(entryId));
          return (
            <li
              key={groupExpandKey}
              className={cn(
                bulkEditActive && "flex items-stretch",
                selected && agencyTimeEntryBulkRowSelectedClass,
                "motion-reduce:transition-none transition-colors duration-150",
              )}
            >
              {bulkEditActive && onToggleEntrySelected ? (
                <label className={agencyTimeEntryBulkSelectColumnClass}>
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggleEntrySelected(groupEntryIds)}
                    aria-label={`Select ${group.entries.length === 1 ? "entry" : `${group.entries.length} entries`}`}
                    className="size-3.5"
                  />
                </label>
              ) : null}
              <div className="min-w-0 flex-1">
                {renderGroupRow({
                  group,
                  groupExpandKey,
                  omitBottomBorder: index === lastDisplayIndex,
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
