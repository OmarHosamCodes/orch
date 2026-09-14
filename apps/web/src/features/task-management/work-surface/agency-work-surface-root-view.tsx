import type { ReactNode } from "react";

import type { AgencyWorkSurfaceView } from "@/features/task-management/agency-work";
import { agencyTimeLogPanelClass, agencyTimeTrackerPanelClass } from "@/features/shared/agency-ui";
import { AgencyWorkSurfaceEmptyView } from "@/features/task-management/work-surface/agency-work-surface-empty-view";
import { AgencyWorkSurfaceErrorView } from "@/features/task-management/work-surface/agency-work-surface-error-view";
import { AgencyWorkSurfaceLayoutView } from "@/features/task-management/work-surface/agency-work-surface-layout-view";
import { cn } from "@/lib/utils";

type AgencyWorkSurfaceRootViewProps = {
  view: AgencyWorkSurfaceView;
  trackerControl: ReactNode;
  content: ReactNode;
  taskRail?: ReactNode;
  threadCover?: ReactNode;
  onThreadCoverShowComplete?: () => void;
};

export function AgencyWorkSurfaceRootView({
  view,
  trackerControl,
  content,
  taskRail,
  threadCover = null,
  onThreadCoverShowComplete,
}: AgencyWorkSurfaceRootViewProps) {
  let surface: ReactNode;

  switch (view.status) {
    case "error":
      surface = <AgencyWorkSurfaceErrorView message={view.message} onRetry={view.onRetry} />;
      break;
    case "empty":
      surface = (
        <AgencyWorkSurfaceEmptyView
          onGoToClients={view.onGoToClients}
          onGoToProjects={view.onGoToProjects}
        />
      );
      break;
    case "ready":
      surface = (
        <AgencyWorkSurfaceLayoutView
          trackerPane={<div className={agencyTimeTrackerPanelClass}>{trackerControl}</div>}
          contentPane={
            <div className={cn(agencyTimeLogPanelClass, "min-h-0")} aria-label="Time entries">
              {content}
            </div>
          }
          taskRail={taskRail}
          threadCover={threadCover}
          onThreadCoverShowComplete={onThreadCoverShowComplete}
        />
      );
      break;
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }

  return <div className="flex min-h-0 flex-1 flex-col">{surface}</div>;
}
