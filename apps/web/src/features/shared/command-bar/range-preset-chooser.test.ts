import { describe, expect, test } from "bun:test";

import { rangePresetLabel, rangePresets } from "@/features/shared/command-bar/range-preset-chooser";

describe("rangePresets", () => {
  test("includes Today and This month when tenure is unavailable", () => {
    expect(rangePresets(false)).toEqual(["today", "week", "month", "last30", "custom"]);
  });

  test("replaces This month with tenure when tenure is available", () => {
    expect(rangePresets(true)).toEqual(["tenure", "today", "week", "last30", "custom"]);
    expect(rangePresets(true)).not.toContain("month");
  });
});

describe("rangePresetLabel", () => {
  test("uses the simple tenure period label when provided", () => {
    expect(rangePresetLabel("tenure", "Q1 2026")).toBe("Q1 2026");
  });

  test("falls back to Tenure when the period label is missing", () => {
    expect(rangePresetLabel("tenure", null)).toBe("Tenure");
    expect(rangePresetLabel("tenure")).toBe("Tenure");
  });

  test("leaves other presets unchanged", () => {
    expect(rangePresetLabel("week", "Q1 2026")).toBe("This week");
  });
});
