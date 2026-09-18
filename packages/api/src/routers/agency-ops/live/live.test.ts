import { describe, expect, test } from "bun:test";

import { agencyLiveEventSchema } from "./live";

describe("agency timer live events", () => {
  test("carry the complete persisted timer state", () => {
    const timestamp = "2026-07-18T09:30:00.000Z";
    const event = agencyLiveEventSchema.parse({
      type: "timer.updated",
      teamId: "team-1",
      userId: "user-1",
      updatedAt: timestamp,
      timer: {
        id: "timer-1",
        teamId: "team-1",
        userId: "user-1",
        projectId: "project-1",
        taskId: "task-1",
        taskTitle: "Ship live timer state",
        taskIconKey: "flag",
        projectName: "Orch",
        colorHueId: 1,
        projectIconKey: "code",
        description: "Implement pub/sub reconciliation",
        isBillable: false,
        tags: [
          {
            id: "tag-1",
            teamId: "team-1",
            name: "Realtime",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        links: [{ id: "link-1", url: "https://example.com/pr/1" }],
        startedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });

    expect(event).toMatchObject({
      timer: {
        isBillable: false,
        tags: [{ id: "tag-1", name: "Realtime" }],
        links: [{ id: "link-1", url: "https://example.com/pr/1" }],
      },
    });
  });
});
