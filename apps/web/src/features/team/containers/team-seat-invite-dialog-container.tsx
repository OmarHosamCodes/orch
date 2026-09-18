import { useTeamSeatInviteDialog } from "../hooks/use-team-seat-invite-dialog";
import { TeamSeatInviteDialogView } from "../views/team-seat-invite-dialog-view";

export function TeamSeatInviteDialogContainer() {
  const viewModel = useTeamSeatInviteDialog();
  return <TeamSeatInviteDialogView {...viewModel} />;
}
