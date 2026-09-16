import { describe, expect, test } from "bun:test";

import { resolveBudgetModel } from "./budget-model";

describe("resolveBudgetModel", () => {
  test("uses free when the free toggle is on", () => {
    expect(resolveBudgetModel({ remainingCreditsUsd: 12, freeToggle: true })).toBe(
      "openrouter/free",
    );
  });

  test("uses free when credits are missing or zero", () => {
    expect(resolveBudgetModel({ remainingCreditsUsd: null, freeToggle: false })).toBe(
      "openrouter/free",
    );
    expect(resolveBudgetModel({ remainingCreditsUsd: 0, freeToggle: false })).toBe(
      "openrouter/free",
    );
  });

  test("uses auto-beta when credits remain", () => {
    expect(resolveBudgetModel({ remainingCreditsUsd: 1.5, freeToggle: false })).toBe(
      "openrouter/auto-beta",
    );
  });
});
