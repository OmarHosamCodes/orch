import { describe, expect, test } from "bun:test";

import { formatPlannerPlanForTools, parsePlannerTodos, PLANNER_SYSTEM_PROMPT } from "./planner";

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

  test("parses numbered planner lines into user-visible todos", () => {
    expect(parsePlannerTodos("1. List today's entries\n2. Propose waste mark")).toEqual([
      { id: "todo-1", title: "List today's entries", status: "pending" },
      { id: "todo-2", title: "Propose waste mark", status: "pending" },
    ]);
    expect(parsePlannerTodos("Internal plan: inspect with tools")).toEqual([]);
  });
});
