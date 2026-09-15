import { Bot, Coffee, ListTodo, type LucideIcon } from "lucide-react";

import {
  formatBreakCountdown,
  isBreakRunning,
} from "@/features/task-management/break-timer/break-timer-state";
import type {
  TrackerRightPanelSurface,
  TrackerRightPanelSurfaceKind,
} from "@/features/task-management/stores/agency-tracker-right-panel";

export function trackerRightPanelSurfaceTitle(surface: TrackerRightPanelSurface): string {
  switch (surface.kind) {
    case "my-tasks":
      return "My Tasks";
    case "agent":
      return "Agent";
    case "break": {
      if (surface.startedAt != null && surface.remainingSeconds > 0) {
        return `Break · ${formatBreakCountdown(surface.remainingSeconds)}`;
      }
      return "Break";
    }
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }
}

export function trackerRightPanelSurfaceIcon(kind: TrackerRightPanelSurfaceKind): LucideIcon {
  switch (kind) {
    case "my-tasks":
      return ListTodo;
    case "break":
      return Coffee;
    case "agent":
      return Bot;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function trackerRightPanelSurfaceKindLabel(kind: TrackerRightPanelSurfaceKind): string {
  switch (kind) {
    case "my-tasks":
      return "My Tasks";
    case "break":
      return "Break";
    case "agent":
      return "Agent";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export type TrackerRightPanelCollapsedRailGroup = {
  kind: TrackerRightPanelSurfaceKind;
  count: number;
  targetSurfaceId: string;
  isActiveKind: boolean;
  isRunning: boolean;
  badgeCount: number | null;
};

const COLLAPSED_RAIL_KIND_ORDER: TrackerRightPanelSurfaceKind[] = ["my-tasks", "break", "agent"];

export function buildTrackerRightPanelCollapsedRailGroups(input: {
  surfaces: TrackerRightPanelSurface[];
  activeSurfaceId: string | null;
  pendingSurfaceIds: ReadonlySet<string>;
  openTaskCount: number;
}): TrackerRightPanelCollapsedRailGroup[] {
  const activeSurface =
    input.surfaces.find((surface) => surface.id === input.activeSurfaceId) ?? null;

  return COLLAPSED_RAIL_KIND_ORDER.flatMap((kind) => {
    const kindSurfaces = input.surfaces.filter((surface) => surface.kind === kind);
    if (kindSurfaces.length === 0) return [];

    const targetSurface =
      kindSurfaces.find((surface) => surface.id === input.activeSurfaceId) ??
      (kind === "break"
        ? kindSurfaces.find(
            (surface): surface is Extract<TrackerRightPanelSurface, { kind: "break" }> =>
              surface.kind === "break" && isBreakRunning(surface),
          )
        : undefined) ??
      kindSurfaces[0];
    if (!targetSurface) return [];

    const isRunning =
      kind === "break"
        ? kindSurfaces.some(
            (surface) => surface.kind === "break" && isBreakRunning(surface),
          )
        : kind === "my-tasks" &&
          kindSurfaces.some((surface) => input.pendingSurfaceIds.has(surface.id));

    let badgeCount: number | null = null;
    if (kind === "my-tasks" && input.openTaskCount > 0) {
      badgeCount = input.openTaskCount;
    } else if (kind === "break" && kindSurfaces.length > 1) {
      badgeCount = kindSurfaces.length;
    }

    return [
      {
        kind,
        count: kindSurfaces.length,
        targetSurfaceId: targetSurface.id,
        isActiveKind: activeSurface?.kind === kind,
        isRunning,
        badgeCount,
      },
    ];
  });
}
