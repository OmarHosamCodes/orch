import type {
  AgencyProjectJourney,
  AgencyProjectJourneyStep,
  AgencyProjectTask,
} from "@/features/task-management/agency-work";

export type JourneyProgressSummary = {
  completedSteps: number;
  totalSteps: number;
};

export function isJourneyAnchorTask(task: Pick<AgencyProjectTask, "taskKind">): boolean {
  return task.taskKind === "journey_anchor";
}

export function isJourneyMilestoneTask(task: Pick<AgencyProjectTask, "taskKind">): boolean {
  return task.taskKind === "journey_milestone";
}

export function dedupeAssignees<
  T extends { userId: string; userName: string; userAvatar: string | null },
>(assignees: T[]): T[] {
  const byId = new Map<string, T>();
  for (const assignee of assignees) {
    if (!byId.has(assignee.userId)) byId.set(assignee.userId, assignee);
  }
  return [...byId.values()];
}

/** Anchor row only when the viewer owns at least one milestone on the project. */
export function shouldShowJourneyAnchor(
  task: AgencyProjectTask,
  allTasks: AgencyProjectTask[],
  userId: string,
): boolean {
  if (!isJourneyAnchorTask(task)) return true;
  if (!userId) return false;

  return allTasks.some(
    (candidate) =>
      candidate.projectId === task.projectId &&
      isJourneyMilestoneTask(candidate) &&
      candidate.assignees.some((assignee) => assignee.userId === userId),
  );
}

/** Anchor row when the viewer has no milestone on the project (discovery rail). */
export function shouldShowJourneyAnchorForDiscovery(
  task: AgencyProjectTask,
  allTasks: AgencyProjectTask[],
  userId: string,
): boolean {
  if (!isJourneyAnchorTask(task)) return true;
  if (!userId) return false;

  return !allTasks.some(
    (candidate) =>
      candidate.projectId === task.projectId &&
      isJourneyMilestoneTask(candidate) &&
      candidate.assignees.some((assignee) => assignee.userId === userId),
  );
}

function resolveJourneyStepForTask(
  journey: AgencyProjectJourney | undefined,
  taskId: string,
): AgencyProjectJourneyStep | null {
  if (!journey) return null;
  return journey.steps.find((step) => step.taskId === taskId) ?? null;
}

function resolveActiveJourneyStep(
  journey: AgencyProjectJourney | undefined,
): AgencyProjectJourneyStep | null {
  if (!journey) return null;
  return (
    journey.steps.find((step) => step.status === "active") ??
    journey.steps.find((step) => step.status !== "done" && step.stepKind !== "destination") ??
    null
  );
}

export function resolveFocusedJourneyStep(
  journey: AgencyProjectJourney | undefined,
  task: Pick<AgencyProjectTask, "id" | "taskKind">,
): AgencyProjectJourneyStep | null {
  if (!journey) return null;
  if (isJourneyMilestoneTask(task)) {
    return resolveJourneyStepForTask(journey, task.id);
  }
  return resolveActiveJourneyStep(journey);
}

/** Mirrors removeStep unlink semantics: null journeyStepId, preserve entry rows. */
export function unlinkTimeEntriesFromJourneyStep<T extends { journeyStepId: string | null }>(
  entries: T[],
  stepId: string,
): T[] {
  return entries.map((entry) =>
    entry.journeyStepId === stepId ? { ...entry, journeyStepId: null } : entry,
  );
}
