import { describe, expect, test } from "bun:test";

import { createBreakTimerFields } from "@/features/task-management/break-timer/break-timer-state";
import { buildTrackerRightPanelCollapsedRailGroups } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-meta";
import type { TrackerRightPanelSurface } from "@/features/task-management/stores/agency-tracker-right-panel";

function surface(
  partial: Partial<TrackerRightPanelSurface> & Pick<TrackerRightPanelSurface, "id" | "kind">,
): TrackerRightPanelSurface {
  const breakFields =
    partial.kind === "break"
      ? { ...createBreakTimerFields(), ...partial }
      : createBreakTimerFields();

  return {
    title: partial.title ?? partial.kind,
    ...breakFields,
    ...partial,
  } as TrackerRightPanelSurface;
}

describe("buildTrackerRightPanelCollapsedRailGroups", () => {
  test("returns ordered groups with my-tasks badge and running break indicator", () => {
    const myTasks = surface({ id: "tasks-1", kind: "my-tasks" });
    const breakIdle = surface({ id: "break-1", kind: "break" });
    const breakRunning = surface({
      id: "break-2",
      kind: "break",
      startedAt: Date.now() - 1000,
      pausedAt: null,
      remainingSeconds: 600,
      durationSeconds: 900,
    });

    const groups = buildTrackerRightPanelCollapsedRailGroups({
      surfaces: [breakRunning, myTasks, breakIdle],
      activeSurfaceId: "break-1",
      pendingSurfaceIds: new Set(["tasks-1"]),
      openTaskCount: 4,
    });

    expect(groups.map((group) => group.kind)).toEqual(["my-tasks", "break"]);
    expect(groups[0]).toMatchObject({
      kind: "my-tasks",
      targetSurfaceId: "tasks-1",
      isActiveKind: false,
      isRunning: true,
      badgeCount: 4,
    });
    expect(groups[1]).toMatchObject({
      kind: "break",
      count: 2,
      targetSurfaceId: "break-1",
      isActiveKind: true,
      isRunning: true,
      badgeCount: 2,
    });
  });

  test("prefers running break tab when activating break kind from collapsed rail", () => {
    const breakIdle = surface({ id: "break-idle", kind: "break" });
    const breakRunning = surface({
      id: "break-live",
      kind: "break",
      startedAt: Date.now() - 500,
      pausedAt: null,
      remainingSeconds: 300,
      durationSeconds: 900,
    });

    const groups = buildTrackerRightPanelCollapsedRailGroups({
      surfaces: [breakIdle, breakRunning],
      activeSurfaceId: "tasks-missing",
      pendingSurfaceIds: new Set(),
      openTaskCount: 0,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.targetSurfaceId).toBe("break-live");
    expect(groups[0]?.isRunning).toBe(true);
    expect(groups[0]?.badgeCount).toBe(2);
  });

  test("includes agent group when agent surface is open", () => {
    const agent = surface({ id: "agent-1", kind: "agent" });

    const groups = buildTrackerRightPanelCollapsedRailGroups({
      surfaces: [agent],
      activeSurfaceId: "agent-1",
      pendingSurfaceIds: new Set(),
      openTaskCount: 0,
    });

    expect(groups).toEqual([
      {
        kind: "agent",
        count: 1,
        targetSurfaceId: "agent-1",
        isActiveKind: true,
        isRunning: false,
        badgeCount: null,
      },
    ]);
  });
});
