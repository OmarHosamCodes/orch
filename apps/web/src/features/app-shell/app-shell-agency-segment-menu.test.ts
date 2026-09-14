import { describe, expect, test } from "bun:test";

import { nextSegmentIndex } from "./app-shell-agency-segment-menu";

describe("nextSegmentIndex", () => {
  const lastIndex = 7;

  test("ArrowDown wraps from the last row to the first", () => {
    expect(nextSegmentIndex(lastIndex, "ArrowDown", lastIndex)).toBe(0);
  });

  test("ArrowDown advances within bounds", () => {
    expect(nextSegmentIndex(2, "ArrowDown", lastIndex)).toBe(3);
  });

  test("ArrowUp wraps from the first row to the last", () => {
    expect(nextSegmentIndex(0, "ArrowUp", lastIndex)).toBe(lastIndex);
  });

  test("ArrowUp retreats within bounds", () => {
    expect(nextSegmentIndex(3, "ArrowUp", lastIndex)).toBe(2);
  });

  test("Home jumps to the first row", () => {
    expect(nextSegmentIndex(4, "Home", lastIndex)).toBe(0);
  });

  test("End jumps to the last row", () => {
    expect(nextSegmentIndex(1, "End", lastIndex)).toBe(lastIndex);
  });

  test("returns null for unrelated keys", () => {
    expect(nextSegmentIndex(2, "Enter", lastIndex)).toBeNull();
  });
});
