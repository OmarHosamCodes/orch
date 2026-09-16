import { describe, expect, test } from "bun:test";

import { buildProjectActivityTimeline } from "./project-activity-timeline";

const hadil = {
  userId: "u-hadil",
  userName: "Hadil alaidi",
};

describe("buildProjectActivityTimeline", () => {
  test("groups by local day and merges same person plus description", () => {
    const days = buildProjectActivityTimeline(
      [
        {
          ...hadil,
          id: "a",
          description: "new colors",
          startedAt: "2026-08-31T12:08:00.000Z",
          durationSeconds: 111,
        },
        {
          ...hadil,
          id: "b",
          description: "new colors",
          startedAt: "2026-08-31T15:35:00.000Z",
          durationSeconds: 35,
        },
        {
          ...hadil,
          id: "c",
          description: "new colors",
          startedAt: "2026-09-05T10:18:00.000Z",
          durationSeconds: 255,
        },
      ],
      "newest",
    );

    expect(days.map((day) => day.items.length)).toEqual([1, 1]);
    expect(days[0]?.items[0]?.count).toBe(1);
    expect(days[1]?.items[0]?.count).toBe(2);
    expect(days[1]?.items[0]?.durationSeconds).toBe(146);
  });

  test("longest orders days and clusters by duration", () => {
    const days = buildProjectActivityTimeline(
      [
        {
          ...hadil,
          id: "short",
          description: "short",
          startedAt: "2026-09-05T10:00:00.000Z",
          durationSeconds: 10,
        },
        {
          userId: "u-omar",
          userName: "Omar",
          id: "long",
          description: "long",
          startedAt: "2026-09-01T10:00:00.000Z",
          durationSeconds: 400,
        },
      ],
      "longest",
    );

    expect(days[0]?.items[0]?.id).toBe("long");
    expect(days.map((day) => day.totalSeconds)).toEqual([400, 10]);
  });
});
