import { describe, expect, test } from "bun:test";

import { buildHourBreakdownSegments, deriveInternalSplit } from "./agency-hour-breakdown-metrics";

const baseMetrics = {
  totalSeconds: 10_000,
  externalSeconds: 7_000,
  internalSeconds: 3_000,
  internalBillableSeconds: 2_000,
  paidSeconds: 5_000,
};

describe("deriveInternalSplit", () => {
  test("splits internal into billable and non-billable", () => {
    expect(deriveInternalSplit(baseMetrics)).toEqual({
      wasteSeconds: 2_000,
      internalBillableSeconds: 2_000,
      internalNonBillableSeconds: 1_000,
    });
  });

  test("clamps internal billable to the internal total", () => {
    expect(
      deriveInternalSplit({
        ...baseMetrics,
        internalBillableSeconds: 9_999,
      }).internalBillableSeconds,
    ).toBe(3_000);
  });
});

describe("buildHourBreakdownSegments", () => {
  test("exposes four destination segments including the internal split", () => {
    const segments = buildHourBreakdownSegments(baseMetrics);

    expect(segments.find((segment) => segment.id === "waste")?.seconds).toBe(2_000);
    expect(segments.find((segment) => segment.id === "paid")?.seconds).toBe(5_000);
    expect(segments.find((segment) => segment.id === "internalBillable")?.seconds).toBe(2_000);
    expect(segments.find((segment) => segment.id === "internalNonBillable")?.seconds).toBe(1_000);
  });
});
