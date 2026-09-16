import type { AgencySegmentId } from "@/features/shared/agency-segments";
import { useAgencyWorkSurface } from "@/features/task-management/hooks/use-agency-work-surface";
import { AgencyTrackerRightPanelProvider } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-context";
import { AgencyWorkSurfaceReadyBind } from "@/features/task-management/work-surface/agency-work-surface-ready-bind";
import { AgencyWorkSurfaceRootView } from "@/features/task-management/work-surface/agency-work-surface-root-view";

type AgencyWorkSurfaceProps = {
  teamId: string;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

export function AgencyWorkSurface({ teamId, onSegmentChange }: AgencyWorkSurfaceProps) {
  const { view, thread } = useAgencyWorkSurface({ teamId, onSegmentChange });
  const readyView = view.status === "ready" ? view : null;

  if (readyView) {
    return (
      <AgencyTrackerRightPanelProvider teamId={readyView.teamId}>
        <AgencyWorkSurfaceReadyBind view={readyView} thread={thread} />
      </AgencyTrackerRightPanelProvider>
    );
  }

  return (
    <AgencyWorkSurfaceRootView view={view} trackerControl={null} content={null} taskRail={null} />
  );
}
