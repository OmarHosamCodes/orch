import { AgencyClientCreateDialog } from "@/features/clients/agency-client-create-dialog";
import { AgencyProjectCreateDialog } from "@/features/projects/agency-project-create-dialog";
import { useAgencyWorkSurface } from "@/features/task-management/hooks/use-agency-work-surface";
import { AgencyTrackerRightPanelProvider } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-context";
import { AgencyWorkSurfaceReadyBind } from "@/features/task-management/work-surface/agency-work-surface-ready-bind";
import { AgencyWorkSurfaceRootView } from "@/features/task-management/work-surface/agency-work-surface-root-view";

type AgencyWorkSurfaceProps = {
  teamId: string;
};

export function AgencyWorkSurface({ teamId }: AgencyWorkSurfaceProps) {
  const { view, thread, creates } = useAgencyWorkSurface({ teamId });
  const readyView = view.status === "ready" ? view : null;

  const surface = readyView ? (
    <AgencyTrackerRightPanelProvider teamId={readyView.teamId}>
      <AgencyWorkSurfaceReadyBind view={readyView} thread={thread} />
    </AgencyTrackerRightPanelProvider>
  ) : (
    <AgencyWorkSurfaceRootView view={view} trackerControl={null} content={null} taskRail={null} />
  );

  return (
    <>
      {surface}
      {creates ? (
        <>
          <AgencyClientCreateDialog
            open={creates.clientCreateOpen}
            onOpenChange={creates.onClientCreateOpenChange}
            teamId={creates.teamId}
            onCreated={creates.onClientCreated}
          />
          <AgencyProjectCreateDialog
            open={creates.projectCreateOpen}
            onOpenChange={creates.onProjectCreateOpenChange}
            teamId={creates.teamId}
            clients={creates.clients}
            defaultClientId={creates.defaultClientId}
          />
        </>
      ) : null}
    </>
  );
}
