import {
  type AgencyTaskGroupRowProps,
  useAgencyTaskGroupRow,
} from "@/features/task-management/hooks/use-agency-task-group-row";
import { AgencyTaskRatePopover } from "@/features/task-management/task-list/agency-task-rate-popover";
import { AgencyTaskGroupRowView } from "@/features/task-management/task-list/agency-task-group-row-view";
import { AgencyTaskRow } from "@/features/task-management/task-list/agency-task-row";

export type { AgencyTaskGroupRowProps } from "@/features/task-management/hooks/use-agency-task-group-row";

export function AgencyTaskGroupRow(props: AgencyTaskGroupRowProps) {
  const viewModel = useAgencyTaskGroupRow(props);
  return (
    <AgencyTaskGroupRowView
      viewModel={viewModel}
      renderTaskRow={(taskRowProps) => <AgencyTaskRow {...taskRowProps} />}
      renderRateControl={(task) => {
        if (props.mode !== "project" || !props.teamId) return null;
        return (
          <AgencyTaskRatePopover
            teamId={props.teamId}
            task={task}
            canEdit={props.canEditTaskRate ?? false}
            disabled={props.isRowPending?.(task.id) ?? false}
            quietUntilHover
          />
        );
      }}
    />
  );
}
