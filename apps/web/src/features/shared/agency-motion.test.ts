import { describe, expect, test } from "bun:test";

import { AGENCY_STAGGER_CAP, agencyStaggerIndex } from "./agency-motion";

describe("agencyStaggerIndex", () => {
  test("caps stagger so long lists do not delay forever", () => {
    expect(agencyStaggerIndex(0)).toBe(0);
    expect(agencyStaggerIndex(3)).toBe(3);
    expect(agencyStaggerIndex(99)).toBe(AGENCY_STAGGER_CAP - 1);
  });
});
