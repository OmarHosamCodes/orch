import { describe, expect, test } from "bun:test";

import { agencyTimeRangeCanReset } from "@/features/shared/command-bar/agency-time-range-can-reset";

const defaults = {
  rangePreset: "tenure" as const,
  defaultRangePreset: "tenure" as const,
  tenureMonthIndexes: [1],
  defaultTenureMonthIndexes: [1],
  clientIds: [] as string[],
  projectIds: [] as string[],
  memberUserIds: [] as string[],
  customFromDate: "2026-09-01",
  customToDate: "2026-09-15",
  defaultCustomFromDate: "2026-09-01",
  defaultCustomToDate: "2026-09-15",
};

describe("agencyTimeRangeCanReset", () => {
  test("is false on the default tenure month with no entity filters", () => {
    expect(agencyTimeRangeCanReset(defaults)).toBe(false);
  });

  test("is true when the preset differs from the default", () => {
    expect(agencyTimeRangeCanReset({ ...defaults, rangePreset: "week" })).toBe(true);
  });

  test("is true when entity ids are selected", () => {
    expect(agencyTimeRangeCanReset({ ...defaults, clientIds: ["c1"] })).toBe(true);
    expect(agencyTimeRangeCanReset({ ...defaults, projectIds: ["p1"] })).toBe(true);
    expect(agencyTimeRangeCanReset({ ...defaults, memberUserIds: ["u1"] })).toBe(true);
  });

  test("is true when tenure indexes differ from the default current month", () => {
    expect(agencyTimeRangeCanReset({ ...defaults, tenureMonthIndexes: [] })).toBe(true);
    expect(agencyTimeRangeCanReset({ ...defaults, tenureMonthIndexes: [0, 1] })).toBe(true);
  });

  test("treats custom dates as dirty only while the preset is custom", () => {
    expect(
      agencyTimeRangeCanReset({
        ...defaults,
        customToDate: "2026-09-30",
      }),
    ).toBe(false);

    expect(
      agencyTimeRangeCanReset({
        ...defaults,
        rangePreset: "custom",
        defaultRangePreset: "custom",
        customToDate: "2026-09-30",
      }),
    ).toBe(true);
  });
});
