import { useEffect, useMemo, useState } from "react";

import { useAgencyMyTasksRail } from "@/features/task-management/hooks/use-agency-my-tasks-rail";
import {
  useAgencyTrackerRightPanelStore,
  type TrackerRightPanelSurface,
} from "@/features/task-management/stores/agency-tracker-right-panel";

type UseAgencyTrackerRightPanelOptions = {
  teamId: string;
};

export function useAgencyTrackerRightPanel({ teamId }: UseAgencyTrackerRightPanelOptions) {
  const tasksView = useAgencyMyTasksRail({ teamId });

  const hydrate = useAgencyTrackerRightPanelStore((s) => s.hydrate);
  const isOpen = useAgencyTrackerRightPanelStore((s) => s.isOpen);
  const surfaces = useAgencyTrackerRightPanelStore((s) => s.surfaces);
  const activeSurfaceId = useAgencyTrackerRightPanelStore((s) => s.activeSurfaceId);
  const hasSurfaceKind = useAgencyTrackerRightPanelStore((s) => s.hasSurfaceKind);
  const openMyTasks = useAgencyTrackerRightPanelStore((s) => s.openMyTasks);
  const activateSurface = useAgencyTrackerRightPanelStore((s) => s.activateSurface);
  const closeSurface = useAgencyTrackerRightPanelStore((s) => s.closeSurface);
  const closeOthers = useAgencyTrackerRightPanelStore((s) => s.closeOthers);
  const closeToRight = useAgencyTrackerRightPanelStore((s) => s.closeToRight);
  const openPanel = useAgencyTrackerRightPanelStore((s) => s.openPanel);
  const closePanel = useAgencyTrackerRightPanelStore((s) => s.closePanel);

  const [isDocked, setIsDocked] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    function onViewportChange() {
      const nextDocked = media.matches;
      setIsDocked(nextDocked);
      if (nextDocked) {
        setSheetOpen(false);
      } else if (isOpen) {
        setSheetOpen(true);
      }
    }
    onViewportChange();
    media.addEventListener("change", onViewportChange);
    return () => media.removeEventListener("change", onViewportChange);
  }, [isOpen]);

  useEffect(() => {
    if (!isDocked && isOpen) {
      setSheetOpen(true);
    }
  }, [isDocked, isOpen]);

  const runningTaskOnMyTasks = useMemo(() => {
    if (!tasksView.runningTaskId) return false;
    return tasksView.flatTaskIds.includes(tasksView.runningTaskId);
  }, [tasksView.flatTaskIds, tasksView.runningTaskId]);

  const pendingSurfaceIds = useMemo(() => {
    const pending = new Set<string>();
    if (!activeSurfaceId) return pending;
    const active = surfaces.find((surface) => surface.id === activeSurfaceId);
    if (!active) return pending;
    if (
      active.kind === "my-tasks" &&
      (tasksView.isAddingTask || (tasksView.runningTaskId && runningTaskOnMyTasks))
    ) {
      pending.add(active.id);
    }
    return pending;
  }, [
    activeSurfaceId,
    runningTaskOnMyTasks,
    surfaces,
    tasksView.isAddingTask,
    tasksView.runningTaskId,
  ]);

  const canAddMyTasks = !hasSurfaceKind("my-tasks");

  function onActivateSurface(surface: TrackerRightPanelSurface) {
    activateSurface(surface.id);
  }

  function onCloseSurface(surface: TrackerRightPanelSurface) {
    closeSurface(surface.id);
    if (!useAgencyTrackerRightPanelStore.getState().isOpen) {
      setSheetOpen(false);
    }
  }

  function onCloseOthers(surface: TrackerRightPanelSurface) {
    closeOthers(surface.id);
  }

  function onCloseToRight(surface: TrackerRightPanelSurface) {
    closeToRight(surface.id);
  }

  function onAddMyTasks() {
    openMyTasks();
    if (!isDocked) setSheetOpen(true);
  }

  function onOpenPanel() {
    openPanel();
    if (!isDocked) setSheetOpen(true);
  }

  function onCollapsePanel() {
    closePanel();
    if (!isDocked) setSheetOpen(false);
  }

  function onSheetOpenChange(nextOpen: boolean) {
    setSheetOpen(nextOpen);
    if (!nextOpen) closePanel();
  }

  return {
    tasksView,
    isOpen,
    surfaces,
    activeSurfaceId,
    pendingSurfaceIds,
    canAddMyTasks,
    isDocked,
    sheetOpen,
    openTaskCount: tasksView.openCount,
    openTaskCountTickKey: tasksView.countTickKey,
    onActivateSurface,
    onCloseSurface,
    onCloseOthers,
    onCloseToRight,
    onAddMyTasks,
    onOpenPanel,
    onCollapsePanel,
    onSheetOpenChange,
  };
}

export type AgencyTrackerRightPanelViewModel = ReturnType<typeof useAgencyTrackerRightPanel>;
