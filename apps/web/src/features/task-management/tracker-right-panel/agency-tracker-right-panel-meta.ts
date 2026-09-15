import type { TrackerRightPanelSurfaceKind } from "@/features/task-management/stores/agency-tracker-right-panel";

export function trackerRightPanelSurfaceTitle(kind: TrackerRightPanelSurfaceKind): string {
  switch (kind) {
    case "my-tasks":
      return "My Tasks";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
