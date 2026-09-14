export type MyTasksAddPill = "open" | "done" | "delegated";

export function withActorMember<T extends { userId: string }>(
  members: readonly T[],
  actor: T | null,
): T[] {
  if (!actor?.userId) return [...members];
  if (members.some((member) => member.userId === actor.userId)) return [...members];
  return [actor, ...members];
}

export function nextPillsAfterAdd(
  pills: ReadonlySet<MyTasksAddPill>,
  taskStatus: string | undefined,
): Set<MyTasksAddPill> {
  const next = new Set(pills);
  if (taskStatus === "done") next.add("done");
  else next.add("open");
  return next;
}

export type MyTasksComposerSubmitKind = "add" | "update";

export type MyTasksComposerExisting = {
  assignedToTeam: boolean;
  assignees: readonly { userId: string }[];
  estimateMinutes?: number | null;
};

function isOnMyTasks(input: {
  taskId: string;
  actorUserId: string;
  railHasTask: boolean;
  existing: MyTasksComposerExisting | null;
}): boolean {
  if (!input.taskId) return false;
  if (input.railHasTask) return true;
  if (!input.existing) return false;
  if (input.existing.assignedToTeam) return true;
  return Boolean(
    input.actorUserId &&
    input.existing.assignees.some((assignee) => assignee.userId === input.actorUserId),
  );
}

export function composerSubmitCopy(kind: MyTasksComposerSubmitKind): {
  label: string;
  armedAriaLabel: string;
  formAriaLabel: string;
  status: string;
  errorFallback: string;
} {
  switch (kind) {
    case "update":
      return {
        label: "Update",
        armedAriaLabel: "Update on My Tasks",
        formAriaLabel: "Update on My Tasks",
        status: "Updated on My Tasks",
        errorFallback: "Couldn't update task.",
      };
    case "add":
      return {
        label: "Add",
        armedAriaLabel: "Add to My Tasks",
        formAriaLabel: "Add to My Tasks",
        status: "Added to My Tasks",
        errorFallback: "Couldn't add task.",
      };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function composerSubmitKind(input: {
  composerTaskId: string;
  actorUserId: string;
  railHasTask: boolean;
  existing: MyTasksComposerExisting | null;
}): MyTasksComposerSubmitKind {
  if (!input.composerTaskId) return "add";
  return isOnMyTasks({
    taskId: input.composerTaskId,
    actorUserId: input.actorUserId,
    railHasTask: input.railHasTask,
    existing: input.existing,
  })
    ? "update"
    : "add";
}

export function composerStateFromExistingTask(
  existing: MyTasksComposerExisting | null,
  actorUserId: string,
): {
  assignedToTeam: boolean;
  assigneeUserIds: string[];
  estimateMinutes: number | null;
} {
  if (!existing) {
    return {
      assignedToTeam: false,
      assigneeUserIds: actorUserId ? [actorUserId] : [],
      estimateMinutes: null,
    };
  }
  if (existing.assignedToTeam) {
    return {
      assignedToTeam: true,
      assigneeUserIds: [],
      estimateMinutes: existing.estimateMinutes ?? null,
    };
  }
  const assigneeUserIds = existing.assignees.map((assignee) => assignee.userId);
  return {
    assignedToTeam: false,
    assigneeUserIds:
      assigneeUserIds.length > 0 ? assigneeUserIds : actorUserId ? [actorUserId] : [],
    estimateMinutes: existing.estimateMinutes ?? null,
  };
}

export function nextAssigneesForComposerSubmit(input: {
  kind: MyTasksComposerSubmitKind;
  existing: MyTasksComposerExisting | null;
  composerAssignedToTeam: boolean;
  composerAssigneeIds: readonly string[];
  actorUserId: string;
}): { assignedToTeam: boolean; assigneeUserIds: string[] } {
  const fallbackIds = input.actorUserId ? [input.actorUserId] : [];
  switch (input.kind) {
    case "update": {
      if (input.composerAssignedToTeam) return { assignedToTeam: true, assigneeUserIds: [] };
      return {
        assignedToTeam: false,
        assigneeUserIds:
          input.composerAssigneeIds.length > 0 ? [...input.composerAssigneeIds] : fallbackIds,
      };
    }
    case "add": {
      const assignedToTeam =
        input.composerAssignedToTeam || Boolean(input.existing?.assignedToTeam);
      if (assignedToTeam) return { assignedToTeam: true, assigneeUserIds: [] };
      return {
        assignedToTeam: false,
        assigneeUserIds: [
          ...new Set([
            ...(input.existing?.assignees.map((assignee) => assignee.userId) ?? []),
            ...(input.composerAssigneeIds.length > 0 ? input.composerAssigneeIds : fallbackIds),
          ]),
        ],
      };
    }
    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
}

export function isRedundantMyTasksAdd(input: {
  existing: MyTasksComposerExisting | null;
  nextAssignedToTeam: boolean;
  nextAssigneeUserIds: readonly string[];
  estimateMinutes: number | null;
  kind?: MyTasksComposerSubmitKind;
}): boolean {
  const {
    existing,
    nextAssignedToTeam,
    nextAssigneeUserIds,
    estimateMinutes,
    kind = "add",
  } = input;
  if (!existing) return false;
  const existingEstimate = existing.estimateMinutes ?? null;
  switch (kind) {
    case "update": {
      if (nextAssignedToTeam !== existing.assignedToTeam) return false;
      if (estimateMinutes !== existingEstimate) return false;
      if (nextAssignedToTeam) return true;
      const have = new Set(existing.assignees.map((assignee) => assignee.userId));
      return (
        have.size === nextAssigneeUserIds.length && nextAssigneeUserIds.every((id) => have.has(id))
      );
    }
    case "add": {
      if (estimateMinutes !== null && estimateMinutes !== existingEstimate) return false;
      if (nextAssignedToTeam) return existing.assignedToTeam;
      if (existing.assignedToTeam) return false;
      const have = new Set(existing.assignees.map((assignee) => assignee.userId));
      return nextAssigneeUserIds.length > 0 && nextAssigneeUserIds.every((id) => have.has(id));
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
