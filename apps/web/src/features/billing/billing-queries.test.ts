import { describe, expect, test } from "bun:test";

import { deriveBillingState } from "./billing-queries";

describe("deriveBillingState", () => {
  test("does not default plan to leftover before billing.state loads", () => {
    const derived = deriveBillingState(undefined);
    expect(derived.plan).toBeUndefined();
  });

  test("uses plan from billing.state when loaded", () => {
    const derived = deriveBillingState({
      plan: "agency",
      tier: "free",
      agencyEnabled: true,
      limits: {} as never,
      subscription: null,
    });
    expect(derived.plan).toBe("agency");
  });
});
