import { describe, expect, test } from "bun:test";

import {
  rangePresetLabel,
  rangePresets,
} from "@/features/shared/command-bar/agency-time-range-command-bar";

describe("agency time-range command bar", () => {
  test("exports range presets and labels", () => {
    expect(rangePresets(false)).toEqual(["today", "week", "month", "last30", "custom"]);
    expect(rangePresetLabel("week")).toBe("This week");
  });
});
