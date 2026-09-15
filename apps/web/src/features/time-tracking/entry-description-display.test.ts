import { expect, test } from "bun:test";

import {
  entryDescriptionDisplayMode,
  type EntryDescriptionDisplayMode,
} from "./entry-description-display";

test("whitespace-only descriptions are omitted", () => {
  const mode: EntryDescriptionDisplayMode = entryDescriptionDisplayMode("   ");
  expect(mode).toBe("omitted");
});

test("present descriptions stay visible", () => {
  expect(entryDescriptionDisplayMode("paired homepage")).toBe("visible");
});
