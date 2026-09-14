export type AgencyTimerProjectRef = {
  id: string;
  name: string;
};

export type AgencyTimerTaskRef = {
  id: string;
  title: string;
};

export type AgencyActiveTimerRef = {
  taskId: string | null;
  taskTitle: string | null;
  description: string;
  projectId?: string;
};

export function canStartAgencyTimer(input: {
  activeTimer: AgencyActiveTimerRef | null;
  project: AgencyTimerProjectRef | null;
  /** Tracker draft description when switching; defaults to active timer description. */
  description?: string;
  selectedTask?: AgencyTimerTaskRef | null;
  selectedTaskId?: string;
  selectedTaskTitle?: string | null;
  catalogTasks?: AgencyTimerTaskRef[];
}): boolean {
  if (!input.activeTimer) {
    return true;
  }

  return canStopAgencyTimer({
    activeTimer: input.activeTimer,
    description: input.description ?? input.activeTimer.description,
    selectedTask: input.selectedTask,
    selectedTaskId: input.selectedTaskId,
    selectedTaskTitle: input.selectedTaskTitle,
    catalogTasks: input.catalogTasks,
  });
}

export function resolveAgencyTimerTaskRef(input: {
  activeTimer: AgencyActiveTimerRef | null;
  selectedTaskId?: string;
  selectedTaskTitle?: string | null;
  catalogTasks?: AgencyTimerTaskRef[];
}): AgencyTimerTaskRef | null {
  // Prefer tracker draft so mid-run task changes stick through stop/save.
  const draftTaskId = input.selectedTaskId?.trim() ?? "";
  if (draftTaskId) {
    const fromCatalog = input.catalogTasks?.find((task) => task.id === draftTaskId);
    if (fromCatalog) {
      return fromCatalog;
    }

    const draftTitle = input.selectedTaskTitle?.trim() ?? "";
    if (input.activeTimer?.taskId === draftTaskId) {
      return {
        id: draftTaskId,
        title: input.activeTimer.taskTitle ?? draftTitle,
      };
    }

    if (draftTitle) {
      return { id: draftTaskId, title: draftTitle };
    }

    return { id: draftTaskId, title: "" };
  }

  if (input.activeTimer?.taskId) {
    return {
      id: input.activeTimer.taskId,
      title: input.activeTimer.taskTitle ?? input.selectedTaskTitle?.trim() ?? "",
    };
  }

  return null;
}

/** Prefer typed description; fall back to task title / project name so stop/save works without typing. */
export function resolveAgencyTimerStopDescription(
  description: string,
  taskTitle?: string | null,
  projectName?: string | null,
): string {
  return description.trim() || taskTitle?.trim() || projectName?.trim() || "";
}

export function canStopAgencyTimer(input: {
  activeTimer: AgencyActiveTimerRef | null;
  description: string;
  selectedTask?: AgencyTimerTaskRef | null;
  selectedTaskId?: string;
  selectedTaskTitle?: string | null;
  catalogTasks?: AgencyTimerTaskRef[];
  projectName?: string | null;
}): boolean {
  return getAgencyTimerStopBlockedMessage(input) === null && Boolean(input.activeTimer);
}

export function resolveAgencyTimerStartProject(input: {
  projects: AgencyTimerProjectRef[];
  selectedTaskProjectId: string | null;
}): AgencyTimerProjectRef | null {
  if (!input.selectedTaskProjectId) {
    return null;
  }

  return input.projects.find((project) => project.id === input.selectedTaskProjectId) ?? null;
}

export function getAgencyTimerStartBlockedMessage(input: {
  activeTimer: AgencyActiveTimerRef | null;
  project: AgencyTimerProjectRef | null;
  description?: string;
  selectedTask?: AgencyTimerTaskRef | null;
  selectedTaskId?: string;
  selectedTaskTitle?: string | null;
  catalogTasks?: AgencyTimerTaskRef[];
}): string | null {
  if (!input.activeTimer) {
    return null;
  }

  if (!input.project) {
    return "No project available to start the timer.";
  }

  const stopInput = {
    activeTimer: input.activeTimer,
    description: input.description ?? input.activeTimer.description,
    selectedTask: input.selectedTask,
    selectedTaskId: input.selectedTaskId,
    selectedTaskTitle: input.selectedTaskTitle,
    catalogTasks: input.catalogTasks,
  };

  if (canStopAgencyTimer(stopInput)) {
    return null;
  }

  const stopBlockedMessage = getAgencyTimerStopBlockedMessage(stopInput);

  return (
    stopBlockedMessage ?? "Finish the active timer in the time tracker before starting another."
  );
}

const AGENCY_TIMER_STOP_DESCRIPTION_REQUIRED = "Add a description before stopping the timer.";
export const AGENCY_TIMER_STOP_TASK_REQUIRED = "Choose a task before stopping the timer.";

export function getAgencyTimerStopBlockedMessage(input: {
  activeTimer: AgencyActiveTimerRef | null;
  description: string;
  selectedTask?: AgencyTimerTaskRef | null;
  selectedTaskId?: string;
  selectedTaskTitle?: string | null;
  catalogTasks?: AgencyTimerTaskRef[];
  projectName?: string | null;
}): string | null {
  if (!input.activeTimer) {
    return null;
  }

  if (!input.description.trim()) {
    return AGENCY_TIMER_STOP_DESCRIPTION_REQUIRED;
  }

  const hasProject = Boolean(input.activeTimer.projectId?.trim());
  // Prefer an already-resolved draft task so mid-run chooser picks unlock Stop.
  const task =
    input.selectedTask ??
    resolveAgencyTimerTaskRef({
      activeTimer: input.activeTimer,
      selectedTaskId: input.selectedTaskId,
      selectedTaskTitle: input.selectedTaskTitle,
      catalogTasks: input.catalogTasks,
    });

  if (!hasProject && !task?.id) {
    return AGENCY_TIMER_STOP_TASK_REQUIRED;
  }

  return null;
}

/** Stop CTA while a timer is running. */
export function getAgencyTimerStopButtonPresentation(input: {
  isPending: boolean;
  hasActiveTimer: boolean;
}): { label: string; disabled: boolean } {
  if (input.isPending) {
    return { label: "Stop", disabled: true };
  }
  return { label: "Stop", disabled: !input.hasActiveTimer };
}
