import { describe, expect, test } from "bun:test";

import { DETECTION_INTERVAL_MS, shouldStartDetection } from "./detection-lifecycle";

describe("shouldStartDetection", () => {
  test("starts when there is no prior detection", () => {
    expect(shouldStartDetection(null, new Date("2026-09-16T12:00:00.000Z"))).toBe(true);
  });

  test("waits six hours between detection runs", () => {
    const last = new Date("2026-09-16T06:00:00.000Z");
    expect(shouldStartDetection(last, new Date("2026-09-16T11:59:00.000Z"))).toBe(false);
    expect(shouldStartDetection(last, new Date(last.getTime() + DETECTION_INTERVAL_MS))).toBe(true);
  });
});
