import type { Variants } from "motion/react";
import type { ReactNode } from "react";

import type { AgencyMemberOption } from "@/features/shared/agency-member-option";
import {
  buildMyTasksTimeConsumer,
  resolveMyTasksAssigner,
  type MyTasksAssignerDisplay,
} from "@/features/task-management/agency-my-tasks-row-meta";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import type { AgencyMyTasksRailViewModel } from "@/features/task-management/hooks/use-agency-my-tasks-rail";
import { AgencyMyTasksRailRowView } from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-row-view";
import { AgencyMiniTimerContainer } from "@/features/time-tracking/containers/agency-mini-timer-container";

type AgencyMyTasksRailRowProps = {
  task: AgencyProjectTask;
  view: AgencyMyTasksRailViewModel;
  projectName: string;
  colorHueId?: number | null;
  assignerMember: AgencyMemberOption | null;
  variants: Variants;
  stagger: number;
  isThreadOpen: boolean;
  onOpenThread: () => void;
};

export function AgencyMyTasksRailRow({
  task,
  view,
  projectName,
  colorHueId,
  assignerMember,
  variants,
  stagger,
  isThreadOpen,
  onOpenThread,
}: AgencyMyTasksRailRowProps) {
  const isDone = task.viewerStatus === "done";
  const isSelected = view.selectedTaskId === task.id;
  const isTracking = view.runningTaskId === task.id;
  const pending = view.pendingTaskIds.includes(task.id) || view.deletingTaskIds.includes(task.id);

  const assigner: MyTasksAssignerDisplay = resolveMyTasksAssigner({
    createdByUserId: task.createdByUserId,
    actorUserId: view.actorUserId,
    member: assignerMember,
  });
  const timeConsumer = buildMyTasksTimeConsumer({
    totalTrackedSeconds: task.totalTrackedSeconds,
    estimateMinutes: task.estimateMinutes,
  });

  const miniTimer: ReactNode = (
    <AgencyMiniTimerContainer
      teamId={view.teamId}
      taskId={task.id}
      projectId={task.projectId}
      taskTitle={task.title}
      projectName={projectName}
      variant="compact"
    />
  );

  return (
    <AgencyMyTasksRailRowView
      taskId={task.id}
      title={task.title}
      projectId={task.projectId}
      projectName={projectName}
      colorHueId={colorHueId}
      iconKey={task.iconKey}
      assigner={assigner}
      timeConsumer={timeConsumer}
      isDone={isDone}
      isSelected={isSelected}
      isThreadOpen={isThreadOpen}
      isTracking={isTracking}
      playPulse={view.justPlayedTaskId === task.id}
      completeFlash={view.justCompletedTaskId === task.id}
      createFlash={view.justCreatedTaskId === task.id}
      pending={pending}
      miniTimer={miniTimer}
      onSelect={() => view.onSelectTask(task.id)}
      onOpenThread={onOpenThread}
      onToggleComplete={() => {
        if (isDone) void view.onReopenTask(task);
        else void view.onCompleteTask(task.id);
      }}
      onEdit={() => view.onEditTask(task.id)}
      onDelete={() => void view.onDeleteTask(task)}
      onPlayEnter={() => view.onPlaySelected(task.id)}
      variants={variants}
      stagger={stagger}
    />
  );
}
