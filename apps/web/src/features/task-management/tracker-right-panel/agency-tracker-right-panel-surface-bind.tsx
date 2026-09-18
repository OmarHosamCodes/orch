import type { ReactNode } from "react";

import { AgencyBreakTimerSurfaceContainer } from "@/features/task-management/containers/agency-break-timer-surface-container";
import type { AgencyMyTasksRailViewModel } from "@/features/task-management/hooks/use-agency-my-tasks-rail";
import { AgencyAgentPanelSurfaceBodyView } from "@/features/task-management/tracker-right-panel/agency-agent-panel-surface-body-view";
import { AgencyMyTasksSurfaceBody } from "@/features/task-management/my-tasks-rail/agency-my-tasks-surface-body";
import type { TrackerRightPanelSurface } from "@/features/task-management/stores/agency-tracker-right-panel";

type AgencyTrackerRightPanelSurfaceBindProps = {
  surface: TrackerRightPanelSurface;
  tasksView: AgencyMyTasksRailViewModel;
  list: ReactNode;
};

export function AgencyTrackerRightPanelSurfaceBind({
  surface,
  tasksView,
  list,
}: AgencyTrackerRightPanelSurfaceBindProps) {
  switch (surface.kind) {
    case "my-tasks":
      return <AgencyMyTasksSurfaceBody view={tasksView} list={list} />;
    case "break":
      return <AgencyBreakTimerSurfaceContainer surfaceId={surface.id} />;
    case "agent":
      return <AgencyAgentPanelSurfaceBodyView />;
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }
}
