import { describe, expect, test } from "bun:test";
import {
  canSaveMyTasksEdit,
  isMyTasksEditDraftDirty,
  myTasksEditDraftFromTask,
} from "./agency-my-tasks-edit-draft";

const task = {
  title: "Loyal Rev",
  assignedToTeam: false,
  assignees: [{ userId: "u2" }, { userId: "u1" }],
  estimateMinutes: 60,
};

describe("myTasksEditDraftFromTask", () => {
  test("copies fields and sorts assignee ids", () => {
    expect(myTasksEditDraftFromTask(task)).toEqual({
      title: "Loyal Rev",
      iconKey: null,
      assignedToTeam: false,
      assigneeUserIds: ["u1", "u2"],
      estimateMinutes: 60,
      billableRateDraft: "",
      billableRateCurrency: "USD",
    });
  });

  test("nulls missing estimate", () => {
    expect(myTasksEditDraftFromTask({ ...task, estimateMinutes: undefined }).estimateMinutes).toBe(
      null,
    );
  });

  test("formats billable rate draft from source minor units", () => {
    expect(
      myTasksEditDraftFromTask({
        ...task,
        billableRateAmount: 101_880,
        sourceBillableRateAmount: 2_000,
        currency: "USD",
      }).billableRateDraft,
    ).toBe("20");
  });
});

describe("isMyTasksEditDraftDirty", () => {
  const baseline = myTasksEditDraftFromTask(task);

  test("false when equal ignoring assignee order", () => {
    expect(
      isMyTasksEditDraftDirty(baseline, {
        ...baseline,
        assigneeUserIds: ["u2", "u1"],
      }),
    ).toBe(false);
  });

  test("true when title, assignees, team flag, estimate, or rate change", () => {
    expect(isMyTasksEditDraftDirty(baseline, { ...baseline, title: "Other" })).toBe(true);
    expect(isMyTasksEditDraftDirty(baseline, { ...baseline, estimateMinutes: null })).toBe(true);
    expect(isMyTasksEditDraftDirty(baseline, { ...baseline, assignedToTeam: true })).toBe(true);
    expect(isMyTasksEditDraftDirty(baseline, { ...baseline, assigneeUserIds: ["u1"] })).toBe(true);
    expect(isMyTasksEditDraftDirty(baseline, { ...baseline, billableRateDraft: "100" })).toBe(true);
    expect(isMyTasksEditDraftDirty(baseline, { ...baseline, billableRateCurrency: "EGP" })).toBe(
      true,
    );
  });
});

describe("canSaveMyTasksEdit", () => {
  const baseline = myTasksEditDraftFromTask(task);

  test("requires trimmed title, dirty, and not pending", () => {
    expect(
      canSaveMyTasksEdit({
        baseline,
        draft: { ...baseline, title: "Loyal Rev 2" },
        pending: false,
      }),
    ).toBe(true);
    expect(
      canSaveMyTasksEdit({ baseline, draft: { ...baseline, title: "  " }, pending: false }),
    ).toBe(false);
    expect(
      canSaveMyTasksEdit({
        baseline,
        draft: { ...baseline, title: "Loyal Rev 2" },
        pending: true,
      }),
    ).toBe(false);
    expect(canSaveMyTasksEdit({ baseline, draft: baseline, pending: false })).toBe(false);
  });
});
