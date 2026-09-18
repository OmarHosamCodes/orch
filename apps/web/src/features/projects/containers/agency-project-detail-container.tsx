import { useAgencyProjectDetail } from "../hooks/use-agency-project-detail";
import { AgencyProjectDetailView } from "../agency-project-detail-view";
import { AgencyProjectJourneyStepper } from "../journey/agency-project-journey-stepper";
import { AgencyProjectTasks } from "@/features/task-management/task-list/agency-project-tasks";

type AgencyProjectDetailContainerProps = {
  teamId: string;
  projectId: string;
  focusTaskId?: string;
  onBack: () => void;
  onSelectClient?: (clientId: string) => void;
};

export function AgencyProjectDetailContainer({
  teamId,
  projectId,
  focusTaskId,
  onBack,
  onSelectClient,
}: AgencyProjectDetailContainerProps) {
  const viewModel = useAgencyProjectDetail({ teamId, projectId });
  const journeyStepper = (
    <AgencyProjectJourneyStepper
      teamId={teamId}
      projectId={projectId}
      readOnly={!viewModel.canEditRecords}
    />
  );
  const projectTasks = viewModel.project ? (
    <AgencyProjectTasks
      teamId={teamId}
      projectId={projectId}
      projectName={viewModel.project.name}
      focusTaskId={focusTaskId}
      isTrashed={viewModel.isTrashed}
    />
  ) : null;

  return (
    <AgencyProjectDetailView
      viewModel={viewModel}
      onBack={onBack}
      onSelectClient={onSelectClient}
      journeyStepper={journeyStepper}
      projectTasks={projectTasks}
    />
  );
}
