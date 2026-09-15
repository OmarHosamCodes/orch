import {
  AgencyTimeEntryDayGroupView,
  type AgencyDayBulkDraft,
} from "@/features/time-tracking/entries/agency-time-entry-day-group-view";
import {
  agencyTimeWeekGroupBodyClass,
  agencyTimeWeekGroupClass,
  agencyWorkWeekLabelClass,
} from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import type { TimeEntryWeekGroup } from "@/features/time-tracking/group-time-entries";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import type { AgencyTagOption } from "@/features/time-tracking/choosers/agency-tag-chooser";
import { agencyTimeWeekHeadStateClass } from "@/features/time-tracking/week-head-state";
import { cn } from "@/lib/utils";

type AgencyTimeEntryWeekGroupViewProps = {
  teamId: string;
  week: TimeEntryWeekGroup;
  renderGroupRow: AgencyTimeEntryGroupRowRenderer;
  selectedEntryIds?: Set<string>;
  bulkEditDayKey?: string | null;
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

type AgencyTimeEntryWeekHeaderViewProps = {
  label: string;
  totalSeconds: number;
  weekStartKey?: string;
};

export function AgencyTimeEntryWeekHeaderView({
  label,
  totalSeconds,
  weekStartKey,
}: AgencyTimeEntryWeekHeaderViewProps) {
  return (
    <header data-week-head={weekStartKey} className={agencyTimeWeekHeadStateClass()}>
      <h2 className={agencyWorkWeekLabelClass}>{label}</h2>
      <p className={cn("inline-flex items-baseline gap-2", agencyWorkWeekLabelClass)}>
        <span>Week total:</span>
        <span className={cn("font-mono tabular-nums", agencyWorkWeekLabelClass)}>
          {formatDuration(totalSeconds, "clock")}
        </span>
      </p>
    </header>
  );
}

export function AgencyTimeEntryWeekGroupView({
  teamId,
  week,
  renderGroupRow,
  selectedEntryIds,
  bulkEditDayKey = null,
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
  tagCreatePending,
  tags,
  projects,
  tasks,
  wastePending,
}: AgencyTimeEntryWeekGroupViewProps) {
  return (
    <section className={agencyTimeWeekGroupClass}>
      <AgencyTimeEntryWeekHeaderView
        label={week.label}
        totalSeconds={week.totalSeconds}
        weekStartKey={week.weekStartKey}
      />

      <div className={agencyTimeWeekGroupBodyClass}>
        {week.days.map((day) => (
          <AgencyTimeEntryDayGroupView
            key={day.dateKey}
            teamId={teamId}
            day={day}
            renderGroupRow={renderGroupRow}
            selectedEntryIds={selectedEntryIds}
            bulkEditActive={bulkEditDayKey === day.dateKey}
            bulkFieldEditOpen={bulkFieldEditOpen && bulkEditDayKey === day.dateKey}
            bulkDraft={bulkDraft}
            onBulkDraftChange={onBulkDraftChange}
            onToggleEntrySelected={onToggleEntrySelected}
            onToggleDayBulkEdit={onToggleDayBulkEdit}
            onToggleBulkFieldEdit={onToggleBulkFieldEdit}
            onDeleteSelected={onDeleteSelected}
            onMarkSelectedAsWaste={onMarkSelectedAsWaste}
            onApplyBulk={onApplyBulk}
            onCreateTag={onCreateTag}
            tagCreatePending={tagCreatePending}
            tags={tags}
            projects={projects}
            tasks={tasks}
            wastePending={wastePending}
          />
        ))}
      </div>
    </section>
  );
}
