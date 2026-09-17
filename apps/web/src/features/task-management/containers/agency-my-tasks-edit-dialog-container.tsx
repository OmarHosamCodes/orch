import {
  useAgencyMyTasksEditDialog,
  type UseAgencyMyTasksEditDialogOptions,
} from "@/features/task-management/hooks/use-agency-my-tasks-edit-dialog";
import { AgencyMyTasksEditDialogView } from "@/features/task-management/my-tasks-rail/agency-my-tasks-edit-dialog-view";

export type AgencyMyTasksEditDialogProps = UseAgencyMyTasksEditDialogOptions;

export function AgencyMyTasksEditDialogContainer(props: AgencyMyTasksEditDialogProps) {
  const { open, onOpenChange } = props;
  const viewModel = useAgencyMyTasksEditDialog(props);
  return (
    <AgencyMyTasksEditDialogView
      open={open}
      onOpenChange={onOpenChange}
      canEditRecords={viewModel.canEditRecords}
      viewModel={viewModel}
    />
  );
}
