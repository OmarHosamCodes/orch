import { describe, expect, test } from "bun:test";

import { listAgentToolCatalog, resolveUnlockedSurfaces } from "./tool-catalog";

describe("listAgentToolCatalog", () => {
  test("always exposes agency and canvas tools without ask_agency_question or ui_present", () => {
    const tools = listAgentToolCatalog({ surface: "canvas", mode: "ask" });
    const names = tools.map((tool) => tool.name);

    expect(names).toContain("list_dashboard_nodes");
    expect(names).toContain("query_knowledge");
    expect(names).toContain("get_knowledge_object");
    expect(names).toContain("get_current_time");
    expect(names).toContain("remember_fact");
    expect(names).toContain("list_agency_time_entries");
    expect(names).toContain("propose_agency_action");
    expect(names).toContain("apply_canvas_action");
    expect(names).toContain("apply_knowledge_action");
    expect(names).not.toContain("ui_present");
    expect(names).not.toContain("ask_agency_question");
    expect(names).not.toContain("propose_canvas_action");
    expect(names).not.toContain("propose_knowledge_action");
  });

  test("scope chips do not change the catalog", () => {
    const withScope = listAgentToolCatalog({
      surface: "agency",
      mode: "agent",
      scopeRefs: [{ kind: "node", id: "n1" }],
    });
    const without = listAgentToolCatalog({ surface: "agency", mode: "plan" });
    expect(withScope.map((tool) => tool.name)).toEqual(without.map((tool) => tool.name));
  });
});

describe("resolveUnlockedSurfaces", () => {
  test("always unlocks agency and canvas", () => {
    expect(resolveUnlockedSurfaces({ surface: "agency" })).toEqual(["agency", "canvas"]);
    expect(resolveUnlockedSurfaces({ surface: "canvas" })).toEqual(["agency", "canvas"]);
  });
});
