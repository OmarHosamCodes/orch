import { describe, expect, test } from "bun:test";

import type { AgencyProjectTask } from "../schemas/agency-work";
import {
  filterTasksByTitleSearch,
  findOpenTaskByExactTitle,
  normalizeTaskTitle,
  taskTitleExactlyMatches,
} from "./agency-task-title-filter";
import { getTaskGroupKey, groupTasksByProjectTitle } from "./agency-task-utils";

function makeTask(
  overrides: Partial<AgencyProjectTask> & Pick<AgencyProjectTask, "id" | "projectId" | "title">,
): AgencyProjectTask {
  return {
    teamId: "team-1",
    iconKey: null,
    iconSource: "auto",
    status: "open",
    taskKind: "standard",
    assignedToTeam: false,
    isWaste: false,
    estimateMinutes: null,
    billableRateAmount: null,
    sourceBillableRateAmount: null,
    currency: "USD",
    projectBillableRateAmount: null,
    projectSourceBillableRateAmount: null,
    projectCurrency: "USD",
    clientBillableRateAmount: null,
    clientSourceBillableRateAmount: null,
    clientCurrency: "USD",
    createdByUserId: "user-1",
    assignees: [],
    dueDate: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("normalizeTaskTitle", () => {
  test("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeTaskTitle("  Design   Review  ")).toBe("design review");
  });
});

describe("filterTasksByTitleSearch", () => {
  test("returns all matching instances without deduping titles", () => {
    const tasks = [
      makeTask({ id: "a", projectId: "p1", title: "Design Review" }),
      makeTask({ id: "b", projectId: "p1", title: "design review" }),
      makeTask({ id: "c", projectId: "p1", title: "Other" }),
    ];

    const results = filterTasksByTitleSearch(tasks, "design review");
    expect(results.map((task) => task.id).sort()).toEqual(["a", "b"]);
  });
});

describe("taskTitleExactlyMatches", () => {
  test("matches normalized titles", () => {
    const tasks = [makeTask({ id: "a", projectId: "p1", title: "Design Review" })];
    expect(taskTitleExactlyMatches(tasks, "design review")).toBe(true);
  });
});

describe("findOpenTaskByExactTitle", () => {
  test("returns open/in-progress match and ignores archived", () => {
    const tasks = [
      makeTask({ id: "done", projectId: "p1", title: "Design Review", status: "done" }),
      makeTask({ id: "open", projectId: "p1", title: "design review", status: "open" }),
      makeTask({ id: "arch", projectId: "p1", title: "Design Review", status: "archived" }),
    ];
    expect(findOpenTaskByExactTitle(tasks, "Design Review")?.id).toBe("open");
  });

  test("returns null when only done or archived share the title", () => {
    const tasks = [
      makeTask({ id: "done", projectId: "p1", title: "Design Review", status: "done" }),
    ];
    expect(findOpenTaskByExactTitle(tasks, "Design Review")).toBeNull();
  });
});

describe("groupTasksByProjectTitle", () => {
  test("groups same normalized title within a project", () => {
    const tasks = [
      makeTask({
        id: "a",
        projectId: "p1",
        title: "Design Review",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
      makeTask({
        id: "b",
        projectId: "p1",
        title: "design review",
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
      makeTask({ id: "c", projectId: "p2", title: "design review" }),
    ];

    const groups = groupTasksByProjectTitle(tasks);
    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.projectId === "p1")?.instanceCount).toBe(2);
    expect(getTaskGroupKey(tasks[0]!)).toBe(getTaskGroupKey(tasks[1]!));
    expect(getTaskGroupKey(tasks[0]!)).not.toBe(getTaskGroupKey(tasks[2]!));
  });
});
