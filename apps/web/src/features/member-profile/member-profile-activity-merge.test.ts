import { describe, expect, test } from "bun:test";

import {
  memberProfileActivityMergeKey,
  mergeTimelineItems,
  type MemberProfileTimelineActivity,
} from "./member-profile-activity-merge";

function activity(
  patch: Partial<MemberProfileTimelineActivity> &
    Pick<MemberProfileTimelineActivity, "id" | "title">,
): MemberProfileTimelineActivity {
  return {
    kind: "activity",
    eventType: "time_logged",
    kindLabel: "Activity",
    body: null,
    meta: "Project · SAAS",
    timeLabel: "10:00",
    durationLabel: "01:00",
    durationSeconds: 3600,
    projectId: "proj_1",
    projectName: "SAAS",
    taskId: "task_1",
    taskTitle: "UX",
    taskIconKey: "palette",
    colorHueId: 1,
    projectIconKey: "globe",
    clientId: "client_1",
    clientName: "Acme",
    description: "Polish",
    isWaste: false,
    taskIsWaste: false,
    startedAt: "2026-07-29T10:00:00.000Z",
    endedAt: "2026-07-29T11:00:00.000Z",
    teamId: "team_1",
    userId: "user_1",
    userName: "Omar",
    source: "manual",
    isBillable: true,
    ...patch,
  };
}

describe("mergeTimelineItems", () => {
  test("merges same task+description within a day and sums duration", () => {
    const merged = mergeTimelineItems([
      activity({ id: "a", title: "UX", startedAt: "2026-07-29T10:00:00.000Z" }),
      activity({
        id: "b",
        title: "UX",
        startedAt: "2026-07-29T14:00:00.000Z",
        endedAt: "2026-07-29T14:30:00.000Z",
        durationSeconds: 1800,
      }),
      activity({
        id: "c",
        title: "Other",
        taskId: "task_2",
        taskTitle: "Other",
        description: "Different",
      }),
    ]);

    const groups = merged.filter((item) => item.kind === "activity");
    expect(groups).toHaveLength(2);
    expect(groups[0]?.entryCount).toBe(2);
    expect(groups[0]?.durationSeconds).toBe(5400);
    expect(groups[0]?.entries).toHaveLength(2);
    expect(groups[1]?.entryCount).toBe(1);
  });

  test("does not merge leave with time entries", () => {
    const leave: MemberProfileTimelineActivity = {
      ...activity({ id: "leave-1", title: "PTO" }),
      eventType: "leave",
      projectId: null,
      projectName: null,
      taskId: null,
      taskTitle: null,
      taskIconKey: null,
      colorHueId: null,
      projectIconKey: null,
      clientId: null,
      clientName: null,
      description: null,
      durationSeconds: null,
      startedAt: null,
      endedAt: null,
      teamId: null,
      userId: null,
      userName: null,
      source: null,
      isBillable: null,
    };
    expect(memberProfileActivityMergeKey(leave)).toBe("leave:leave-1");
  });
});
