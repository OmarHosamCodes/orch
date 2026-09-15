import type { AgencyWorkSurfaceView } from "@/features/task-management/agency-work";
import { AgencyTrackerRightPanelContainer } from "@/features/task-management/containers/agency-tracker-right-panel-container";
import type { AgencyTaskThreadTitlePayload } from "@/features/task-management/hooks/use-agency-task-thread-shell";
import { AgencyTaskThread } from "@/features/task-management/task-thread/agency-task-thread";
import { AgencyTimeEntriesLog } from "@/features/time-tracking/entries/agency-time-entries-log";
import { AgencyTimeTracker } from "@/features/time-tracking/agency-time-tracker";
import { AgencyWorkSurfaceRootView } from "@/features/task-management/work-surface/agency-work-surface-root-view";
import { agencyTimeLogPanelClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyWorkSurfaceReadyBindProps = {
  view: Extract<AgencyWorkSurfaceView, { status: "ready" }>;
  thread: {
    openTaskId: string | null;
    openTaskMeta: {
      title: string;
      projectId: string;
      projectName: string | null;
      assignedToTeam: boolean;
      assignees: { userId: string; userName: string; userAvatar: string | null }[];
    } | null;
    onTitleOpenThread: (task: AgencyTaskThreadTitlePayload) => void;
    onBack: () => void;
    onCoverShowComplete: () => void;
  };
};

export function AgencyWorkSurfaceReadyBind({ view, thread }: AgencyWorkSurfaceReadyBindProps) {
  return (
    <AgencyWorkSurfaceRootView
      view={view}
      trackerControl={<AgencyTimeTracker teamId={view.teamId} />}
      content={
        <div className={cn(agencyTimeLogPanelClass, "min-h-0")} aria-label="Time entries">
          <AgencyTimeEntriesLog teamId={view.teamId} />
        </div>
      }
      taskRail={
        <AgencyTrackerRightPanelContainer
          openThreadTaskId={thread.openTaskId}
          onTitleOpenThread={thread.onTitleOpenThread}
        />
      }
      threadCover={
        thread.openTaskId && thread.openTaskMeta ? (
          <AgencyTaskThread
            teamId={view.teamId}
            taskId={thread.openTaskId}
            title={thread.openTaskMeta.title}
            projectId={thread.openTaskMeta.projectId}
            projectName={thread.openTaskMeta.projectName}
            assignedToTeam={thread.openTaskMeta.assignedToTeam}
            assignees={thread.openTaskMeta.assignees}
            onBack={thread.onBack}
          />
        ) : null
      }
      onThreadCoverShowComplete={thread.onCoverShowComplete}
    />
  );
}
