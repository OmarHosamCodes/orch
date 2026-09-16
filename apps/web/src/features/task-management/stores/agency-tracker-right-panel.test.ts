import { describe, expect, test, beforeEach } from "bun:test";

import { useAgencyTrackerRightPanelStore } from "./agency-tracker-right-panel";

describe("agency-tracker-right-panel store", () => {
  beforeEach(() => {
    useAgencyTrackerRightPanelStore.setState({
      isOpen: false,
      surfaces: [],
      activeSurfaceId: null,
      hydrated: true,
    });
  });

  test("openPanel keeps empty surfaces without auto-creating my-tasks", () => {
    useAgencyTrackerRightPanelStore.getState().openPanel();
    const state = useAgencyTrackerRightPanelStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.surfaces).toHaveLength(0);
    expect(state.activeSurfaceId).toBeNull();
  });

  test("openMyTasks adds one my-tasks surface and opens the panel", () => {
    const id = useAgencyTrackerRightPanelStore.getState().openMyTasks();
    const state = useAgencyTrackerRightPanelStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.surfaces).toHaveLength(1);
    expect(state.surfaces[0]?.kind).toBe("my-tasks");
    expect(state.activeSurfaceId).toBe(id);
  });

  test("openMyTasks reuses an existing my-tasks tab", () => {
    const firstId = useAgencyTrackerRightPanelStore.getState().openMyTasks();
    useAgencyTrackerRightPanelStore.getState().closePanel();
    const secondId = useAgencyTrackerRightPanelStore.getState().openMyTasks();
    expect(secondId).toBe(firstId);
    expect(useAgencyTrackerRightPanelStore.getState().surfaces).toHaveLength(1);
  });

  test("closing the last surface keeps the panel open with empty picker", () => {
    const id = useAgencyTrackerRightPanelStore.getState().openMyTasks();
    useAgencyTrackerRightPanelStore.getState().closeSurface(id);
    const state = useAgencyTrackerRightPanelStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.surfaces).toHaveLength(0);
    expect(state.activeSurfaceId).toBeNull();
  });

  test("canOpenSurface enforces singleton my-tasks and agent", () => {
    const store = useAgencyTrackerRightPanelStore.getState();
    expect(store.canOpenSurface("my-tasks")).toBe(true);
    expect(store.canOpenSurface("break")).toBe(true);
    expect(store.canOpenSurface("agent")).toBe(true);
    store.openMyTasks();
    expect(useAgencyTrackerRightPanelStore.getState().canOpenSurface("my-tasks")).toBe(false);
    expect(useAgencyTrackerRightPanelStore.getState().canOpenSurface("break")).toBe(true);
    useAgencyTrackerRightPanelStore.getState().openSurface("agent");
    expect(useAgencyTrackerRightPanelStore.getState().canOpenSurface("agent")).toBe(false);
  });

  test("openSurface creates multiple break tabs", () => {
    const first = useAgencyTrackerRightPanelStore.getState().openSurface("break");
    const second = useAgencyTrackerRightPanelStore.getState().openSurface("break");
    expect(first).not.toBe(second);
    expect(useAgencyTrackerRightPanelStore.getState().surfaces).toHaveLength(2);
    expect(
      useAgencyTrackerRightPanelStore
        .getState()
        .surfaces.every((surface) => surface.kind === "break"),
    ).toBe(true);
  });

  test("closeOthers keeps only the active surface", () => {
    const myTasksId = useAgencyTrackerRightPanelStore.getState().openMyTasks();
    useAgencyTrackerRightPanelStore.getState().openSurface("break");
    useAgencyTrackerRightPanelStore.getState().closeOthers(myTasksId);
    expect(useAgencyTrackerRightPanelStore.getState().surfaces).toHaveLength(1);
    expect(useAgencyTrackerRightPanelStore.getState().surfaces[0]?.id).toBe(myTasksId);
  });
});
