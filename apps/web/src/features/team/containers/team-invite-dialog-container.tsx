import { useTeamInviteDialog } from "../hooks/use-team-invite-dialog";
import { TeamInviteDialogView } from "../views/team-invite-dialog-view";

export function TeamInviteDialogContainer() {
  const view = useTeamInviteDialog();
  return <TeamInviteDialogView view={view} />;
}
