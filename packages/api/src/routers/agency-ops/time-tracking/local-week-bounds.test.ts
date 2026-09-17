import { describe, expect, test } from "bun:test";

import {
  addDaysToDateKey,
  applyDailyDurationTotals,
  getLocalWeekBounds,
  getLocalWeekStartKeyFromDateKey,
  localDateKeyFromInstant,
} from "./local-week-bounds";

describe("local-week-bounds", () => {
  test("localDateKeyFromInstant respects utc offset", () => {
    // 2026-07-25T02:00Z with +180 → still 2026-07-25 local morning
    expect(localDateKeyFromInstant(new Date("2026-07-25T02:00:00.000Z"), -180)).toBe("2026-07-25");
    // same instant with -300 → previous local calendar day
    expect(localDateKeyFromInstant(new Date("2026-07-25T02:00:00.000Z"), 300)).toBe("2026-07-24");
  });

  test("week starts Monday by default", () => {
    expect(getLocalWeekStartKeyFromDateKey("2026-07-25")).toBe("2026-07-20");
    expect(addDaysToDateKey("2026-07-20", 6)).toBe("2026-07-26");
  });

  test("week starts Sunday when weekStartsOn is 0", () => {
    expect(getLocalWeekStartKeyFromDateKey("2026-07-25", 0)).toBe("2026-07-19");
  });

  test("getLocalWeekBounds returns Mon–Sun window", () => {
    const bounds = getLocalWeekBounds(new Date("2026-07-25T12:00:00.000Z"), 0);
    expect(bounds.weekStartKey).toBe("2026-07-20");
    expect(bounds.weekStart.toISOString()).toBe("2026-07-20T00:00:00.000Z");
    expect(bounds.weekEnd.toISOString()).toBe("2026-07-26T23:59:59.999Z");
  });

  test("getLocalWeekBounds respects Sunday week start", () => {
    const bounds = getLocalWeekBounds(new Date("2026-07-25T12:00:00.000Z"), 0, 0);
    expect(bounds.weekStartKey).toBe("2026-07-19");
    expect(bounds.weekEnd.toISOString()).toBe("2026-07-25T23:59:59.999Z");
  });

  test("applyDailyDurationTotals fills the matching week only", () => {
    const daily = new Map<string, number>([
      ["2026-07-20", 0],
      ["2026-07-21", 0],
    ]);
    const summaries = new Map([
      ["2026-07-20", { daily, totalSeconds: 0 }],
    ]);
    applyDailyDurationTotals(
      summaries,
      [
        { dateKey: "2026-07-20", totalSeconds: 60 },
        { dateKey: "2026-07-21", totalSeconds: 120 },
        { dateKey: "2026-07-27", totalSeconds: 999 },
      ],
    );
    expect(summaries.get("2026-07-20")?.totalSeconds).toBe(180);
    expect(summaries.get("2026-07-20")?.daily.get("2026-07-20")).toBe(60);
    expect(summaries.get("2026-07-20")?.daily.get("2026-07-21")).toBe(120);
  });
});
