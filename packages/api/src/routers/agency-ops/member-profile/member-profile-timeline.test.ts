import { describe, expect, test } from "bun:test";

import { buildLeaveActivity, buildTimeEntryActivity } from "./member-profile-timeline";

const baseEntry = {
  id: "te_1",
  date: "2026-07-29",
  createdAt: "2026-07-29T12:00:00.000Z",
  projectId: "proj_1",
  projectName: "SAAS",
  taskId: "task_1",
  taskTitle: "UX",
  taskIconKey: "palette" as const,
  colorHueId: 1,
  projectIconKey: "globe" as const,
  clientId: "client_1",
  clientName: "Acme",
  startedAt: "2026-07-29T10:00:00.000Z",
  endedAt: "2026-07-29T11:00:00.000Z",
  teamId: "team_1",
  userId: "user_1",
  userName: "Omar",
  source: "manual" as const,
  isBillable: true,
  taskIsWaste: false as boolean | null,
};

describe("buildTimeEntryActivity", () => {
  test("maps waste entries to waste_marked", () => {
    const item = buildTimeEntryActivity({
      ...baseEntry,
      description: "Waiting",
      durationSeconds: 600,
      isWaste: true,
    });
    expect(item.eventType).toBe("waste_marked");
    expect(item.title).toBe("UX");
    expect(item.body).toContain("10m");
    expect(item.meta).toBe("Project · SAAS");
    expect(item.projectId).toBe("proj_1");
    expect(item.isWaste).toBe(true);
  });

  test("maps normal entries to time_logged with task title as title", () => {
    const item = buildTimeEntryActivity({
      ...baseEntry,
      id: "te_2",
      description: "Polish rails",
      durationSeconds: 3600,
      isWaste: false,
    });
    expect(item.eventType).toBe("time_logged");
    expect(item.title).toBe("UX");
    expect(item.body).toBe("Polish rails");
    expect(item.taskId).toBe("task_1");
  });

  test("maps waste-flagged tasks to waste_marked without entry flag", () => {
    const item = buildTimeEntryActivity({
      ...baseEntry,
      description: "Research",
      durationSeconds: 1800,
      isWaste: false,
      taskIsWaste: true,
    });
    expect(item.eventType).toBe("waste_marked");
    expect(item.isWaste).toBe(true);
  });

  test("maps waste project names to waste_marked without entry flag", () => {
    const item = buildTimeEntryActivity({
      ...baseEntry,
      projectName: "Internal waste",
      description: "Admin",
      durationSeconds: 900,
      isWaste: false,
      taskIsWaste: false,
    });
    expect(item.eventType).toBe("waste_marked");
    expect(item.isWaste).toBe(true);
  });
});

describe("buildLeaveActivity", () => {
  test("emits on start date when range is inside the window", () => {
    const item = buildLeaveActivity({
      id: "leave_1",
      type: "pto",
      reason: "Vacation",
      startDate: "2026-07-29",
      endDate: "2026-07-30",
      createdAt: "2026-07-28T12:00:00.000Z",
      windowStart: "2026-07-01",
      windowEnd: "2026-07-31",
    });
    expect(item?.date).toBe("2026-07-29");
    expect(item?.eventType).toBe("leave");
    expect(item?.projectId).toBeNull();
  });
});
