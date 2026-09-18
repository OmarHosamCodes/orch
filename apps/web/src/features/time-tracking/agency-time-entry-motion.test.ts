import { expect, test } from "bun:test";

import {
  timeEntryBulkCheckboxVariants,
  timeEntryChildVariants,
  timeEntryHoverRevealVariants,
  timeEntryOverlayVariants,
  timeEntryWasteTransition,
} from "./agency-time-entry-motion";

test("child variants use opacity and y only", () => {
  const hidden = timeEntryChildVariants.hidden;
  expect(hidden).toMatchObject({ opacity: 0, y: 4 });
  expect(hidden).not.toHaveProperty("height");
  const show = timeEntryChildVariants.show;
  expect(typeof show).toBe("function");
  if (typeof show === "function") {
    expect(show(0)).not.toHaveProperty("height");
    expect(show(0)).toMatchObject({ opacity: 1, y: 0 });
  }
});

test("bulk checkbox, overlay, and hover-reveal expose hidden/show or rest/hover", () => {
  expect(timeEntryBulkCheckboxVariants).toHaveProperty("hidden");
  expect(timeEntryBulkCheckboxVariants).toHaveProperty("show");
  expect(timeEntryBulkCheckboxVariants).toHaveProperty("exit");
  expect(timeEntryOverlayVariants).toHaveProperty("hidden");
  expect(timeEntryOverlayVariants).toHaveProperty("show");
  expect(timeEntryHoverRevealVariants).toHaveProperty("rest");
  expect(timeEntryHoverRevealVariants).toHaveProperty("hover");
  expect(timeEntryWasteTransition).toMatchObject({ type: "tween" });
});
