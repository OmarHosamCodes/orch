import { describe, expect, test } from "bun:test";

import {
  applyBreakCountdownDigit,
  breakCountdownShapeToSeconds,
  normalizeBreakCountdownShape,
  secondsToBreakCountdownShape,
} from "./break-countdown-segments";

describe("break-countdown-segments", () => {
  test("shape round-trip", () => {
    expect(secondsToBreakCountdownShape(15 * 60 + 5)).toBe("015:05");
    expect(breakCountdownShapeToSeconds("063:00")).toBe(63 * 60);
    expect(breakCountdownShapeToSeconds("180:00")).toBe(180 * 60);
  });

  test("normalizeBreakCountdownShape", () => {
    expect(normalizeBreakCountdownShape("1:2")).toBe("001:02");
  });

  test("applyBreakCountdownDigit advances slots", () => {
    const first = applyBreakCountdownDigit("015:00", 0, 0, "1", true);
    expect(first.value).toBe("100:00");
    const second = applyBreakCountdownDigit(first.value, 0, 1, "5", false);
    expect(second.value).toBe("150:00");
  });
});
