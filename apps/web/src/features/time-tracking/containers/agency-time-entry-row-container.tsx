import { useAgencyTimeEntryRow } from "@/features/time-tracking/hooks/use-agency-time-entry-row";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import type { AgencyTagOption } from "@/features/time-tracking/choosers/agency-tag-chooser";
import type { TimeEntryDraft } from "@/features/time-tracking/agency-time-entry";
import type { CollapsedEntryGroup } from "@/features/time-tracking/group-time-entries";

import { AnimatePresence, motion } from "motion/react";

import { AgencyTimeEntryRowView } from "@/features/time-tracking/entries/agency-time-entry-row-view";
import { timeEntryChildVariants } from "@/features/time-tracking/agency-time-entry-motion";
import {
  agencyTimeEntryGroupBorderClass,
  agencyTimeEntryMultiChildClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeEntryRowContainerProps = {
  group: CollapsedEntryGroup;
  teamId: string;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  tags: AgencyTagOption[];
  tagCreatePending: boolean;
  onCreateTag?: (name: string) => void;
  expanded: boolean;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  duplicatingEntryIds: string[];
  onToggleExpand: () => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onDuplicate: (entryId: string) => void;
  onToggleWaste: (entryId: string | readonly string[]) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  onSaveLinks: (entryId: string, links: string[]) => Promise<void>;
  onBulkPatch: (
    entryIds: string[],
    patch: {
      projectId?: string;
      taskId?: string | null;
      description?: string;
      tagIds?: string[];
      isBillable?: boolean;
      isWaste?: boolean;
    },
  ) => Promise<void>;
  /** Suppress the row bottom border (last row in a day group, or last child in a multi group). */
  omitBottomBorder?: boolean;
  /** Child row inside an expanded multi-entry group. */
  multiGroupChild?: boolean;
};

export function AgencyTimeEntryRowContainer({
  omitBottomBorder = false,
  multiGroupChild = false,
  ...props
}: AgencyTimeEntryRowContainerProps) {
  const view = useAgencyTimeEntryRow(props);

  if (!view.isMulti) {
    return (
      <AgencyTimeEntryRowView
        view={view}
        multiGroupChild={multiGroupChild}
        className={cn(
          omitBottomBorder ? "border-b-0" : undefined,
          multiGroupChild && agencyTimeEntryMultiChildClass,
        )}
      />
    );
  }

  return (
    <div className={cn(omitBottomBorder ? undefined : agencyTimeEntryGroupBorderClass)}>
      <AgencyTimeEntryRowView view={view} className="border-b-0" />
      <AnimatePresence initial={false}>
        {view.expandedChildGroups.map((childGroup, index) => (
          <motion.div
            key={childGroup.entries[0]!.id}
            custom={index}
            className="overflow-visible"
            inherit={false}
            variants={timeEntryChildVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <AgencyTimeEntryRowContainer
              {...props}
              group={childGroup}
              expanded={false}
              multiGroupChild
              omitBottomBorder={index === view.expandedChildGroups.length - 1}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
