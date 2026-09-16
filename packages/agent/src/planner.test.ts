import { describe, expect, test } from "bun:test";

import { formatPlannerPlanForTools, PLANNER_SYSTEM_PROMPT } from "./planner";

describe("planner-then-tools", () => {
  test("planner prompt is internal and has no UI modes", () => {
    expect(PLANNER_SYSTEM_PROMPT).toContain("internal planner");
    expect(PLANNER_SYSTEM_PROMPT.toLowerCase()).not.toContain("ask mode");
    expect(PLANNER_SYSTEM_PROMPT).toContain("no Ask, Plan, or Agent mode");
  });

  test("formats a plan for the tools pass", () => {
    expect(formatPlannerPlanForTools("1. list time entries\n2. propose waste")).toContain(
      "Internal plan",
    );
    expect(formatPlannerPlanForTools("   ")).toContain("inspect with tools");
  });
});
