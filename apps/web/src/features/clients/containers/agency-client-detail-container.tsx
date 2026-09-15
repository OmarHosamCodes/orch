import { AgencyProjectCreateDialog } from "@/features/projects/agency-project-create-dialog";

import { AgencyClientDetailView } from "../agency-client-detail-view";
import { useAgencyClientDetail } from "../hooks/use-agency-client-detail";

type AgencyClientDetailContainerProps = {
  teamId: string;
  clientId: string;
  onBack: () => void;
  onSelectProject: (projectId: string) => void;
};

export function AgencyClientDetailContainer({
  teamId,
  clientId,
  onBack,
  onSelectProject,
}: AgencyClientDetailContainerProps) {
  const viewModel = useAgencyClientDetail({
    teamId,
    clientId,
    onArchived: onBack,
  });
  return (
    <>
      <AgencyClientDetailView
        viewModel={viewModel}
        onBack={onBack}
        onSelectProject={onSelectProject}
      />
      <AgencyProjectCreateDialog
        open={viewModel.createProjectOpen}
        onOpenChange={viewModel.setCreateProjectOpen}
        teamId={teamId}
        clients={viewModel.createProjectClients}
        lockClientId={clientId}
      />
    </>
  );
}
