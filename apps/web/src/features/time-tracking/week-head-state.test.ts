import { expect, test } from "bun:test";

import { agencyTimeWeekHeadStateClass } from "./week-head-state";

test("rest week head is tall", () => {
  expect(agencyTimeWeekHeadStateClass(false)).toContain("min-h-[62px]");
});

test("pinned week head slims", () => {
  const pinned = agencyTimeWeekHeadStateClass(true);
  expect(pinned).toContain("min-h-9");
  expect(pinned).not.toContain("min-h-[62px]");
});
