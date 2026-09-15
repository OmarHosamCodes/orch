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

  test("closing the last surface closes the panel", () => {
    const id = useAgencyTrackerRightPanelStore.getState().openMyTasks();
    useAgencyTrackerRightPanelStore.getState().closeSurface(id);
    const state = useAgencyTrackerRightPanelStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.surfaces).toHaveLength(0);
  });

  test("closeOthers keeps only the active surface", () => {
    const id = useAgencyTrackerRightPanelStore.getState().openMyTasks();
    useAgencyTrackerRightPanelStore.getState().closeOthers(id);
    expect(useAgencyTrackerRightPanelStore.getState().surfaces).toHaveLength(1);
  });
});
