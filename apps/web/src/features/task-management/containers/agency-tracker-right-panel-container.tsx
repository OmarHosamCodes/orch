import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

import type { AgencyTaskThreadTitlePayload } from "@/features/task-management/hooks/use-agency-task-thread-shell";
import { useAgencyTrackerRightPanelContext } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-context";
import { AgencyMyTasksRailRow } from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-row";
import {
  railLayoutTransition,
  railListContainerVariants,
  railListItemVariants,
  railSectionExit,
  railStaggerIndex,
} from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion";
import { AgencyMyTasksSurfaceBody } from "@/features/task-management/my-tasks-rail/agency-my-tasks-surface-body";
import type { TrackerRightPanelSurface } from "@/features/task-management/stores/agency-tracker-right-panel";
import { AgencyTrackerRightPanelView } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-view";
import { agencyMyTasksClientGroupHeaderClass } from "@/features/shared/agency-ui";

type AgencyTrackerRightPanelContainerProps = {
  openThreadTaskId: string | null;
  onTitleOpenThread: (task: AgencyTaskThreadTitlePayload) => void;
};

function projectLabelForTask(
  projects: { id: string; name: string; clientName?: string | null }[],
  projectId: string,
): string {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return "Project";
  if (project.clientName) return `${project.name} · ${project.clientName}`;
  return project.name;
}

export function AgencyTrackerRightPanelContainer({
  openThreadTaskId,
  onTitleOpenThread,
}: AgencyTrackerRightPanelContainerProps) {
  const panel = useAgencyTrackerRightPanelContext();
  const tasksView = panel.tasksView;

  const renderList = (): ReactNode => {
    let rowIndex = 0;
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          className="flex flex-col gap-3"
          variants={railListContainerVariants}
          initial={false}
          animate="show"
          layout
          transition={railLayoutTransition}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {tasksView.clientGroups.map((group) => (
              <motion.section
                key={group.clientId}
                aria-label={group.clientName}
                className="px-0.5"
                layout
                transition={railLayoutTransition}
                exit={railSectionExit}
              >
                <motion.h3 layout="position" className={agencyMyTasksClientGroupHeaderClass}>
                  {group.clientName}
                </motion.h3>
                <motion.ul
                  layout
                  className="flex flex-col gap-0.5"
                  transition={railLayoutTransition}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    {group.tasks.map((task) => {
                      const stagger = railStaggerIndex(rowIndex++);
                      const project = tasksView.projects.find((item) => item.id === task.projectId);
                      const assignerMember =
                        tasksView.members.find((member) => member.userId === task.createdByUserId) ??
                        null;
                      return (
                        <AgencyMyTasksRailRow
                          key={task.id}
                          task={task}
                          view={tasksView}
                          projectName={project?.name ?? "Project"}
                          assignerMember={assignerMember}
                          variants={railListItemVariants}
                          stagger={stagger}
                          isThreadOpen={openThreadTaskId === task.id}
                          onOpenThread={() =>
                            onTitleOpenThread({
                              id: task.id,
                              title: task.title,
                              projectId: task.projectId,
                              projectName: project?.name ?? null,
                              assignedToTeam: task.assignedToTeam,
                              assignees: task.assignedToTeam
                                ? []
                                : task.assignees.map((assignee) => ({
                                    userId: assignee.userId,
                                    userName: assignee.userName,
                                    userAvatar: assignee.userAvatar,
                                  })),
                            })
                          }
                        />
                      );
                    })}
                  </AnimatePresence>
                </motion.ul>
              </motion.section>
            ))}
          </AnimatePresence>
        </motion.div>
      </MotionConfig>
    );
  };

  const renderSurface = (surface: TrackerRightPanelSurface) => {
    switch (surface.kind) {
      case "my-tasks":
        return <AgencyMyTasksSurfaceBody view={tasksView} list={renderList()} />;
      default: {
        const _exhaustive: never = surface.kind;
        return _exhaustive;
      }
    }
  };

  return (
    <AgencyTrackerRightPanelView
      panel={panel}
      renderSurface={renderSurface}
      editProjectLabel={
        tasksView.editingTask
          ? projectLabelForTask(tasksView.projects, tasksView.editingTask.projectId)
          : "Project"
      }
    />
  );
}
