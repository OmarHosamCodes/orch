import { useEffect, useReducer, useRef, useState } from "react";

import {
  ORCH_PRESENCE_MORPH_MS,
  prefersReducedMotion,
} from "@/features/shared/orch-presence-morph";
import {
  reduceAgencyTaskThreadOpen,
  type AgencyTaskThreadOpenState,
} from "@/features/task-management/task-thread/agency-task-thread-open";
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";

export type AgencyTaskThreadTitlePayload = {
  id: string;
  title: string;
  projectId: string;
  projectName: string | null;
  assignedToTeam: boolean;
  assignees: Array<{
    userId: string;
    userName: string;
    userAvatar: string | null;
  }>;
};

export type AgencyTaskThreadOpenMeta = {
  title: string;
  projectId: string;
  projectName: string | null;
  assignedToTeam: boolean;
  assignees: AgencyTaskThreadTitlePayload["assignees"];
};

const initialOpen: AgencyTaskThreadOpenState = { openTaskId: null };

export function useAgencyTaskThreadShell() {
  const [open, dispatch] = useReducer(reduceAgencyTaskThreadOpen, initialOpen);
  const [openTaskMeta, setOpenTaskMeta] = useState<AgencyTaskThreadOpenMeta | null>(null);
  const closeGenerationRef = useRef(0);
  const openTaskIdRef = useRef(open.openTaskId);
  openTaskIdRef.current = open.openTaskId;

  const setOrchPresence = useWorkspaceAgentStore((s) => s.setOrchPresence);
  const setExpanded = useWorkspaceAgentStore((s) => s.setExpanded);
  const setBoundTask = useWorkspaceAgentStore((s) => s.setBoundTask);

  function clearThread() {
    dispatch({ type: "back" });
    setOpenTaskMeta(null);
    setBoundTask(null);
  }

  function requestClose() {
    const generation = ++closeGenerationRef.current;
    const presence = useWorkspaceAgentStore.getState().orchPresence;

    if (presence !== "thread") {
      clearThread();
      return;
    }

    setOrchPresence("dock");

    if (prefersReducedMotion()) {
      clearThread();
      return;
    }

    window.setTimeout(() => {
      if (closeGenerationRef.current !== generation) return;
      clearThread();
    }, ORCH_PRESENCE_MORPH_MS);
  }

  function onTitleOpenThread(task: AgencyTaskThreadTitlePayload) {
    closeGenerationRef.current += 1;

    // Already open → close (same or other title). Keep cover mounted for reverse morph.
    if (open.openTaskId !== null) {
      requestClose();
      return;
    }

    dispatch({ type: "title", taskId: task.id });
    // Collapse so the morph source is the pill, not the expanded card.
    setExpanded(false);
    setOrchPresence("dock");
    setBoundTask({ id: task.id, title: task.title });
    setOpenTaskMeta({
      title: task.title,
      projectId: task.projectId,
      projectName: task.projectName,
      assignedToTeam: task.assignedToTeam,
      assignees: task.assignees,
    });
  }

  function onCoverShowComplete() {
    if (!openTaskIdRef.current) return;
    setOrchPresence("thread");
  }

  function onBack() {
    requestClose();
  }

  useEffect(() => {
    if (!open.openTaskId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open.openTaskId]);

  useEffect(() => {
    if (open.openTaskId) return;
    if (useWorkspaceAgentStore.getState().orchPresence === "thread") {
      setOrchPresence("dock");
    }
  }, [open.openTaskId, setOrchPresence]);

  return {
    openTaskId: open.openTaskId,
    openTaskMeta,
    onTitleOpenThread,
    onCoverShowComplete,
    onBack,
  };
}
