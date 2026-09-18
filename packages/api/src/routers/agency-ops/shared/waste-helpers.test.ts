import { describe, expect, test } from "bun:test";

import { isReportEntryWaste, isWasteLabel, resolveEntryWaste } from "./waste-helpers";

describe("isWasteLabel", () => {
  test("matches waste in any format", () => {
    expect(isWasteLabel("waste")).toBe(true);
    expect(isWasteLabel("Waste")).toBe(true);
    expect(isWasteLabel("  WASTE  ")).toBe(true);
    expect(isWasteLabel("waste!")).toBe(true);
    expect(isWasteLabel("Daily waste")).toBe(true);
    expect(isWasteLabel("wasted effort")).toBe(false);
    expect(isWasteLabel("Research")).toBe(false);
    expect(isWasteLabel(null)).toBe(false);
  });
});

describe("isReportEntryWaste", () => {
  test("uses entry isWaste flag", () => {
    expect(isReportEntryWaste(false, "Research", "Ship", true)).toBe(true);
    expect(isReportEntryWaste(false, "Research", "Ship", false)).toBe(false);
  });

  test("uses task isWaste flag", () => {
    expect(isReportEntryWaste(true, "Research", "Ship")).toBe(true);
    expect(isReportEntryWaste(false, "Research", "Ship")).toBe(false);
    expect(isReportEntryWaste(null, null, "Ship")).toBe(false);
  });

  test("matches waste task or project names", () => {
    expect(isReportEntryWaste(false, "Waste", "Ship")).toBe(true);
    expect(isReportEntryWaste(false, "Ship", "Waste")).toBe(true);
    expect(isReportEntryWaste(false, "Ship", "Internal waste")).toBe(true);
    expect(isReportEntryWaste(false, "Ship", "Shipping")).toBe(false);
  });
});

describe("resolveEntryWaste", () => {
  test("delegates to isReportEntryWaste", () => {
    expect(
      resolveEntryWaste({
        isWaste: false,
        taskIsWaste: true,
        taskTitle: "Research",
        projectName: "Ship",
      }),
    ).toBe(true);
    expect(
      resolveEntryWaste({
        isWaste: false,
        taskIsWaste: false,
        taskTitle: "Research",
        projectName: "Ship",
      }),
    ).toBe(false);
  });
});
