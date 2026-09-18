import { expect, test } from "bun:test";

import { agencyTimeWeekHeadStateClass } from "./week-head-state";

test("week head stays rest height", () => {
  const className = agencyTimeWeekHeadStateClass();
  expect(className).toContain("min-h-[62px]");
  expect(className).not.toContain("min-h-9");
});
