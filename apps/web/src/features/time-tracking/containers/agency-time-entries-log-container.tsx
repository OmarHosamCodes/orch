import { MotionConfig } from "motion/react";

import { useAgencyTimeEntriesLog } from "@/features/time-tracking/hooks/use-agency-time-entries-log";
import { AgencyTimeEntryRowContainer } from "@/features/time-tracking/containers/agency-time-entry-row-container";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";

import { AgencyTimeEntriesLogView } from "@/features/time-tracking/entries/agency-time-entries-log-view";

type AgencyTimeEntriesLogContainerProps = {
  teamId: string;
  className?: string;
};

export function AgencyTimeEntriesLogContainer({
  teamId,
  className,
}: AgencyTimeEntriesLogContainerProps) {
  const view = useAgencyTimeEntriesLog({ teamId, className });
  const renderGroupRow: AgencyTimeEntryGroupRowRenderer = ({
    group,
    groupExpandKey,
    omitBottomBorder,
  }) => (
    <AgencyTimeEntryRowContainer
      group={group}
      teamId={view.teamId}
      projects={view.projects}
      tasks={view.tasks}
      tags={view.tags}
      tagCreatePending={view.tagCreatePending}
      onCreateTag={view.onCreateTag}
      expanded={view.expandedGroupKeys.has(groupExpandKey)}
      isTimerMutationPending={view.isTimerMutationPending}
      deletingEntryIds={view.deletingEntryIds}
      updatingEntryIds={view.updatingEntryIds}
      duplicatingEntryIds={view.duplicatingEntryIds}
      omitBottomBorder={omitBottomBorder}
      onToggleExpand={() => view.onToggleGroupExpand(groupExpandKey)}
      onRestart={view.onRestart}
      onDeleteGroup={view.onDeleteGroup}
      onDeleteEntry={view.onDeleteEntry}
      onDuplicate={view.onDuplicate}
      onToggleWaste={view.onToggleWaste}
      onSaveEdit={view.onSaveEdit}
      onSaveLinks={view.onSaveLinks}
      onBulkPatch={view.onBulkPatch}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
      <AgencyTimeEntriesLogView view={view} renderGroupRow={renderGroupRow} />
    </MotionConfig>
  );
}
