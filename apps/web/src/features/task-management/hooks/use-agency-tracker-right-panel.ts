import { useCallback, useEffect, useMemo, useState } from "react";

import { useAgencyMyTasksRail } from "@/features/task-management/hooks/use-agency-my-tasks-rail";
import { buildSurfaceMenuItems } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-surface-menu-view";
import {
  useAgencyTrackerRightPanelStore,
  type TrackerRightPanelSurface,
  type TrackerRightPanelSurfaceKind,
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
  const canOpenSurface = useAgencyTrackerRightPanelStore((s) => s.canOpenSurface);
  const openSurface = useAgencyTrackerRightPanelStore((s) => s.openSurface);
  const activateSurface = useAgencyTrackerRightPanelStore((s) => s.activateSurface);
  const closeSurface = useAgencyTrackerRightPanelStore((s) => s.closeSurface);
  const closeOthers = useAgencyTrackerRightPanelStore((s) => s.closeOthers);
  const closeToRight = useAgencyTrackerRightPanelStore((s) => s.closeToRight);
  const openPanel = useAgencyTrackerRightPanelStore((s) => s.openPanel);
  const closePanel = useAgencyTrackerRightPanelStore((s) => s.closePanel);
  const tickBreaks = useAgencyTrackerRightPanelStore((s) => s.tickBreaks);

  const [isDocked, setIsDocked] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const interval = window.setInterval(() => tickBreaks(), 1000);
    return () => window.clearInterval(interval);
  }, [tickBreaks]);

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
    for (const surface of surfaces) {
      if (
        surface.kind === "my-tasks" &&
        (tasksView.isAddingTask || (tasksView.runningTaskId && runningTaskOnMyTasks))
      ) {
        pending.add(surface.id);
      }
      if (surface.kind === "break" && surface.startedAt != null && surface.remainingSeconds > 0) {
        pending.add(surface.id);
      }
    }
    return pending;
  }, [runningTaskOnMyTasks, surfaces, tasksView.isAddingTask, tasksView.runningTaskId]);

  const surfaceMenuItems = useMemo(
    () => buildSurfaceMenuItems(canOpenSurface),
    [canOpenSurface, surfaces],
  );

  const onOpenSurfaceKind = useCallback(
    (kind: TrackerRightPanelSurfaceKind) => {
      if (!canOpenSurface(kind)) return;
      openSurface(kind);
      if (!isDocked) setSheetOpen(true);
    },
    [canOpenSurface, isDocked, openSurface],
  );

  useEffect(() => {
    if (!isOpen) return;
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (!document.querySelector('[data-od-id="tracker-right-panel"]:focus-within')) return;
      const key = event.key.toLowerCase();
      if (key === "t" && canOpenSurface("my-tasks")) {
        event.preventDefault();
        onOpenSurfaceKind("my-tasks");
      } else if (key === "b" && canOpenSurface("break")) {
        event.preventDefault();
        onOpenSurfaceKind("break");
      } else if (key === "a" && canOpenSurface("agent")) {
        event.preventDefault();
        onOpenSurfaceKind("agent");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canOpenSurface, isOpen, onOpenSurfaceKind]);

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

  function onOpenPanel() {
    openPanel();
    if (!isDocked) setSheetOpen(true);
  }

  function onOpenPanelToSurface(surfaceId: string) {
    activateSurface(surfaceId);
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

  const isEmptyOpen = isOpen && surfaces.length === 0;

  return {
    tasksView,
    isOpen,
    isEmptyOpen,
    surfaces,
    activeSurfaceId,
    pendingSurfaceIds,
    surfaceMenuItems,
    onOpenSurfaceKind,
    isDocked,
    sheetOpen,
    openTaskCount: tasksView.openCount,
    openTaskCountTickKey: tasksView.countTickKey,
    onActivateSurface,
    onCloseSurface,
    onCloseOthers,
    onCloseToRight,
    onOpenPanel,
    onOpenPanelToSurface,
    onCollapsePanel,
    onSheetOpenChange,
  };
}

export type AgencyTrackerRightPanelViewModel = ReturnType<typeof useAgencyTrackerRightPanel>;
