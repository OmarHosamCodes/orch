import { useAgencyClientCreateDialog } from "../hooks/use-agency-client-create-dialog";
import { AgencyClientCreateDialogView } from "../views/agency-client-create-dialog-view";
import type { AgencyClientCreateCategory } from "../hooks/use-agency-client-create-dialog";

export type AgencyClientCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  defaultCategory?: AgencyClientCreateCategory;
  onCreated?: (clientId: string) => void;
};

export function AgencyClientCreateDialogContainer(props: AgencyClientCreateDialogProps) {
  const { open, onOpenChange, teamId, defaultCategory, onCreated } = props;
  const viewModel = useAgencyClientCreateDialog({
    open,
    onOpenChange,
    teamId,
    defaultCategory,
    onCreated,
  });

  return (
    <AgencyClientCreateDialogView open={open} onOpenChange={onOpenChange} viewModel={viewModel} />
  );
}
