import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuthSession } from "@/lib/auth-session";
import { orpc } from "@/lib/orpc";
import {
  useAgencyActiveTimerQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
} from "@/features/shared/agency-queries";
import { findProjectTaskInCache } from "@/features/shared/agency-query-cache";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { toAgencyMemberOption } from "@/features/shared/agency-member-option";
import { selectIsCreatingTask, useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import {
  composerStateFromExistingTask,
  composerSubmitCopy,
  composerSubmitKind,
  isRedundantMyTasksAdd,
  nextAssigneesForComposerSubmit,
  nextPillsAfterAdd,
  withActorMember,
} from "@/features/task-management/agency-my-tasks-add";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import { groupTasksByClient } from "@/features/task-management/agency-task-utils";
import { RAIL_HOLD_MS } from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export type MyTasksFilterPill = "open" | "done" | "delegated";

type UseAgencyMyTasksRailOptions = {
  teamId: string;
};

export function useAgencyMyTasksRail({ teamId }: UseAgencyMyTasksRailOptions) {
  const { user } = useAuthSession();
  const actorUserId = user?.id ?? "";

  const [pills, setPills] = useState<Set<MyTasksFilterPill>>(() => new Set(["open"]));
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>(() =>
    actorUserId ? [actorUserId] : [],
  );
  const [assignedToTeam, setAssignedToTeam] = useState(false);
  const [composerTaskId, setComposerTaskId] = useState("");
  const [estimateMinutes, setEstimateMinutes] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [composerStatus, setComposerStatus] = useState<string | null>(null);
  const [justCompletedTaskId, setJustCompletedTaskId] = useState<string | null>(null);
  const [justCreatedTaskId, setJustCreatedTaskId] = useState<string | null>(null);
  const [justPlayedTaskId, setJustPlayedTaskId] = useState<string | null>(null);
  const [countTickKey, setCountTickKey] = useState(0);
  const flashTimerIdsRef = useRef<number[]>([]);

  function flashId(setter: (id: string | null) => void, id: string, ms: number) {
    setter(id);
    const timerId = window.setTimeout(() => {
      setter(null);
      flashTimerIdsRef.current = flashTimerIdsRef.current.filter((t) => t !== timerId);
    }, ms);
    flashTimerIdsRef.current.push(timerId);
  }

  useEffect(() => {
    return () => {
      for (const timerId of flashTimerIdsRef.current) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  useEffect(() => {
    if (!actorUserId || assignedToTeam || assigneeUserIds.length > 0) return;
    setAssigneeUserIds([actorUserId]);
  }, [actorUserId, assignedToTeam, assigneeUserIds.length]);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];

  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);
  const runningTaskId = activeTimerQuery.data?.timer?.taskId ?? null;
  const prevRunningTaskIdRef = useRef<string | null>(null);
  const hasSettledRunningTaskRef = useRef(false);

  useEffect(() => {
    if (!activeTimerQuery.isFetched) return;

    const previousTaskId = prevRunningTaskIdRef.current;
    prevRunningTaskIdRef.current = runningTaskId;

    if (!hasSettledRunningTaskRef.current) {
      hasSettledRunningTaskRef.current = true;
      return;
    }

    if (!runningTaskId || runningTaskId === previousTaskId) return;
    flashId(setJustPlayedTaskId, runningTaskId, RAIL_HOLD_MS.pulse);
  }, [runningTaskId, activeTimerQuery.isFetched]);

  const showOpen = pills.has("open") || pills.size === 0;
  const showDone = pills.has("done");
  const showDelegated = pills.has("delegated");

  const openQuery = useAgencyProjectTasksQuery(teamId, {
    assigneeUserId: actorUserId || undefined,
    statuses: ["open", "in_progress"],
    enabled: Boolean(actorUserId) && (showOpen || (!showDone && !showDelegated)),
  });
  const doneQuery = useAgencyProjectTasksQuery(teamId, {
    assigneeUserId: actorUserId || undefined,
    statuses: ["done"],
    enabled: Boolean(actorUserId) && showDone,
  });
  const delegatedQuery = useAgencyProjectTasksQuery(teamId, {
    delegatedByUserId: actorUserId || undefined,
    statuses: ["open", "in_progress"],
    enabled: Boolean(actorUserId) && showDelegated,
  });

  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.team.members.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId),
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const members = useMemo(
    () =>
      withActorMember(
        (membersQuery.data?.items ?? []).map(toAgencyMemberOption),
        actorUserId && user
          ? {
              userId: actorUserId,
              userName: user.name,
              userAvatar: user.image ?? null,
            }
          : null,
      ),
    [actorUserId, membersQuery.data?.items, user],
  );

  const tasks = useMemo(() => {
    const byId = new Map<string, AgencyProjectTask>();
    const push = (items: AgencyProjectTask[] | undefined) => {
      for (const task of items ?? []) {
        byId.set(task.id, task);
      }
    };
    if (showOpen || pills.size === 0) push(openQuery.data?.items);
    if (showDone) push(doneQuery.data?.items);
    if (showDelegated) push(delegatedQuery.data?.items);
    return Array.from(byId.values());
  }, [
    showOpen,
    showDone,
    showDelegated,
    pills.size,
    openQuery.data?.items,
    doneQuery.data?.items,
    delegatedQuery.data?.items,
  ]);

  const clientGroups = useMemo(() => groupTasksByClient(tasks, projects), [tasks, projects]);

  const flatTaskIds = useMemo(
    () => clientGroups.flatMap((group) => group.tasks.map((task) => task.id)),
    [clientGroups],
  );

  const openCount = openQuery.data?.items?.length ?? 0;
  const prevOpenCountRef = useRef(openCount);

  useEffect(() => {
    if (prevOpenCountRef.current === openCount) return;
    prevOpenCountRef.current = openCount;
    setCountTickKey((key) => key + 1);
  }, [openCount]);

  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null;

  const isLoading =
    (showOpen && openQuery.isLoading) ||
    (showDone && doneQuery.isLoading) ||
    (showDelegated && delegatedQuery.isLoading);
  const queryError =
    openQuery.error ?? doneQuery.error ?? delegatedQuery.error ?? projectsQuery.error;
  const errorMessage = queryError ? getErrorMessage(queryError, "Couldn't load tasks.") : null;

  const createProjectTask = useAgencyOpsStore((s) => s.createProjectTask);
  const updateProjectTask = useAgencyOpsStore((s) => s.updateProjectTask);
  const completeProjectTaskForMember = useAgencyOpsStore((s) => s.completeProjectTaskForMember);
  const deleteProjectTask = useAgencyOpsStore((s) => s.deleteProjectTask);
  const isCreatingTask = useAgencyOpsStore(selectIsCreatingTask);
  const pendingTaskIds = useAgencyOpsStore((s) => s.pendingTaskIds);
  const deletingTaskIds = useAgencyOpsStore((s) => s.deletingTaskIds);
  const isAddingTask =
    isCreatingTask || Boolean(composerTaskId && pendingTaskIds.includes(composerTaskId));

  const composerExisting = composerTaskId
    ? (tasks.find((task) => task.id === composerTaskId) ??
      findProjectTaskInCache(teamId, composerTaskId))
    : null;
  const submitKind = composerSubmitKind({
    composerTaskId,
    actorUserId,
    railHasTask: Boolean(composerTaskId) && tasks.some((task) => task.id === composerTaskId),
    existing: composerExisting,
  });
  const submitCopy = composerSubmitCopy(submitKind);

  function togglePill(pill: MyTasksFilterPill) {
    setPills((prev) => {
      const next = new Set(prev);
      if (next.has(pill)) next.delete(pill);
      else next.add(pill);
      if (next.size === 0) next.add("open");
      return next;
    });
  }

  async function onCreateTask() {
    if (!teamId || !composerTaskId) {
      setCreateError("Choose a task.");
      return;
    }
    setCreateError(null);
    setComposerStatus(null);
    const existing = composerExisting;
    const nextAssignees = nextAssigneesForComposerSubmit({
      kind: submitKind,
      existing,
      composerAssignedToTeam: assignedToTeam,
      composerAssigneeIds: assigneeUserIds,
      actorUserId,
    });
    const addedTaskId = composerTaskId;

    function finishAdd() {
      flashId(setJustCreatedTaskId, addedTaskId, RAIL_HOLD_MS.flash);
      setSelectedTaskId(addedTaskId);
      setPills((prev) => nextPillsAfterAdd(prev, existing?.status));
      setComposerTaskId("");
      setEstimateMinutes(null);
      setComposerStatus(submitCopy.status);
    }

    if (
      isRedundantMyTasksAdd({
        existing,
        nextAssignedToTeam: nextAssignees.assignedToTeam,
        nextAssigneeUserIds: nextAssignees.assigneeUserIds,
        estimateMinutes,
        kind: submitKind,
      })
    ) {
      finishAdd();
      return;
    }

    try {
      await updateProjectTask({
        teamId,
        taskId: addedTaskId,
        assignedToTeam: nextAssignees.assignedToTeam,
        assigneeUserIds: nextAssignees.assigneeUserIds,
        ...(submitKind === "update" || estimateMinutes !== null ? { estimateMinutes } : {}),
      });
      finishAdd();
    } catch (error) {
      setCreateError(getErrorMessage(error, submitCopy.errorFallback));
    }
  }

  async function onCompleteTask(taskId: string) {
    flashId(setJustCompletedTaskId, taskId, RAIL_HOLD_MS.complete);
    await completeProjectTaskForMember({ teamId, taskId });
  }

  async function onReopenTask(task: { id: string; title: string; projectId: string }) {
    await createProjectTask({
      teamId,
      projectId: task.projectId,
      title: task.title,
      assigneeUserIds: actorUserId ? [actorUserId] : [],
      successToast: false,
    });
  }

  async function onDeleteTask(task: { id: string; title: string }) {
    await deleteProjectTask({ teamId, taskId: task.id, taskTitle: task.title });
  }

  function onEditTask(taskId: string) {
    setEditingTaskId(taskId);
  }

  function onEditOpenChange(open: boolean) {
    if (!open) setEditingTaskId(null);
  }

  function onSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
  }

  function onComposerTaskChange(taskId: string) {
    setComposerTaskId(taskId);
    setCreateError(null);
    setComposerStatus(null);
    const existing =
      tasks.find((task) => task.id === taskId) ?? findProjectTaskInCache(teamId, taskId);
    const kind = composerSubmitKind({
      composerTaskId: taskId,
      actorUserId,
      railHasTask: tasks.some((task) => task.id === taskId),
      existing,
    });
    switch (kind) {
      case "update": {
        const next = composerStateFromExistingTask(existing, actorUserId);
        setAssignedToTeam(next.assignedToTeam);
        setAssigneeUserIds(next.assigneeUserIds);
        setEstimateMinutes(next.estimateMinutes);
        return;
      }
      case "add": {
        setAssignedToTeam(false);
        setAssigneeUserIds(actorUserId ? [actorUserId] : []);
        setEstimateMinutes(null);
        return;
      }
      default: {
        const _exhaustive: never = kind;
        return _exhaustive;
      }
    }
  }

  function onKeyboardMove(delta: 1 | -1) {
    if (flatTaskIds.length === 0) return;
    const currentIndex = selectedTaskId ? flatTaskIds.indexOf(selectedTaskId) : -1;
    const nextIndex =
      currentIndex < 0
        ? delta > 0
          ? 0
          : flatTaskIds.length - 1
        : Math.min(flatTaskIds.length - 1, Math.max(0, currentIndex + delta));
    setSelectedTaskId(flatTaskIds[nextIndex] ?? null);
  }

  function onPlaySelected(taskIdOverride?: string) {
    const taskId = taskIdOverride ?? selectedTaskId;
    if (!taskId || !teamId) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const project = projects.find((item) => item.id === task.projectId);
    void useAgencyTimeTrackingStore.getState().startTimer({
      teamId,
      project: { id: task.projectId, name: project?.name ?? "" },
      task: { id: task.id, title: task.title },
      description: "",
      successDescription: "Timer started for this task.",
    });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement) {
        if (target.closest("input, textarea, select, [contenteditable=true]")) {
          return;
        }
        if (
          target.closest("[data-od-id='my-tasks-rail']") &&
          target.closest("button, [role=checkbox], [role=menuitem]")
        ) {
          return;
        }
      }

      const railFocused =
        target instanceof HTMLElement && Boolean(target.closest("[data-od-id='my-tasks-rail']"));
      if (!railFocused && !selectedTaskId) return;

      if (event.key === "j" || event.key === "J") {
        event.preventDefault();
        onKeyboardMove(1);
        return;
      }
      if (event.key === "k" || event.key === "K") {
        event.preventDefault();
        onKeyboardMove(-1);
        return;
      }
      if (event.key === "Enter" && selectedTaskId) {
        event.preventDefault();
        onPlaySelected();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // ponytail: rebind when selection/list changes; keyboard handlers close over latest state
  }, [selectedTaskId, flatTaskIds, tasks, projects, teamId]);

  useEffect(() => {
    if (!selectedTaskId) return;
    const row = document.querySelector<HTMLElement>(
      `[data-od-id='my-tasks-rail'] [data-task-id='${CSS.escape(selectedTaskId)}']`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [selectedTaskId]);

  const prevComposerTaskIdRef = useRef(composerTaskId);

  useEffect(() => {
    const previousId = prevComposerTaskIdRef.current;
    prevComposerTaskIdRef.current = composerTaskId;

    function focusInVisibleRail(selector: string) {
      for (const rail of document.querySelectorAll<HTMLElement>("[data-od-id='my-tasks-rail']")) {
        if (rail.getClientRects().length === 0) continue;
        const target = rail.querySelector<HTMLElement>(selector);
        if (!target || target.getClientRects().length === 0) continue;
        target.focus();
        return;
      }
    }

    if (!previousId && composerTaskId) {
      focusInVisibleRail("[data-od-id='my-tasks-add']");
      return;
    }
    if (previousId && !composerTaskId && !isAddingTask) {
      focusInVisibleRail("[data-od-id='my-tasks-composer-chooser'] button");
    }
  }, [composerTaskId, isAddingTask]);

  function onRetry() {
    void openQuery.refetch();
    void doneQuery.refetch();
    void delegatedQuery.refetch();
    void projectsQuery.refetch();
  }

  return {
    teamId,
    actorUserId,
    pills,
    togglePill,
    composerTaskId,
    onComposerTaskChange,
    assigneeUserIds,
    setAssigneeUserIds,
    assignedToTeam,
    setAssignedToTeam,
    estimateMinutes,
    setEstimateMinutes,
    projects,
    tasks,
    members,
    clientGroups,
    flatTaskIds,
    selectedTaskId,
    onSelectTask,
    editingTaskId,
    editingTask,
    onEditTask,
    onEditOpenChange,
    onKeyboardMove,
    onPlaySelected,
    runningTaskId,
    openCount,
    isLoading,
    errorMessage,
    createError,
    composerStatus,
    composerSubmitKind: submitKind,
    composerSubmitLabel: submitCopy.label,
    composerSubmitArmedAriaLabel: submitCopy.armedAriaLabel,
    composerFormAriaLabel: submitCopy.formAriaLabel,
    isAddingTask,
    pendingTaskIds,
    deletingTaskIds,
    onCreateTask,
    onCompleteTask,
    onReopenTask,
    onDeleteTask,
    onRetry,
    isEmpty: !isLoading && !errorMessage && tasks.length === 0,
    justCompletedTaskId,
    justCreatedTaskId,
    justPlayedTaskId,
    countTickKey,
  };
}

export type AgencyMyTasksRailViewModel = ReturnType<typeof useAgencyMyTasksRail>;
