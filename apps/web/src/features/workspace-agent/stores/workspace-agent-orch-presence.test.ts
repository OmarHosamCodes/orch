import { describe, expect, test } from "bun:test";

import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";

describe("orchPresence handoff", () => {
  test("thread presence does not collapse or block the Eclipse panel", () => {
    useWorkspaceAgentStore.setState({
      expanded: true,
      orchPresence: "dock",
      scopeModeActive: true,
    });

    useWorkspaceAgentStore.getState().setOrchPresence("thread");
    expect(useWorkspaceAgentStore.getState().orchPresence).toBe("thread");
    expect(useWorkspaceAgentStore.getState().expanded).toBe(true);
    expect(useWorkspaceAgentStore.getState().scopeModeActive).toBe(false);

    useWorkspaceAgentStore.getState().setExpanded(false);
    useWorkspaceAgentStore.getState().setExpanded(true);
    expect(useWorkspaceAgentStore.getState().expanded).toBe(true);

    useWorkspaceAgentStore.getState().setOrchPresence("dock");
    expect(useWorkspaceAgentStore.getState().orchPresence).toBe("dock");
    expect(useWorkspaceAgentStore.getState().expanded).toBe(true);
  });
});
