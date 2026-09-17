import { describe, expect, test } from "bun:test";

import {
  isBillingSuccessDataReady,
  resolveCheckoutConfirmationStatus,
} from "./billing-success-readiness";

describe("isBillingSuccessDataReady", () => {
  test("is not ready while confirming", () => {
    expect(isBillingSuccessDataReady("confirming")).toBe(false);
  });

  test("is ready after confirmation finishes", () => {
    expect(isBillingSuccessDataReady("agency_active")).toBe(true);
    expect(isBillingSuccessDataReady("credits_added")).toBe(true);
    expect(isBillingSuccessDataReady("error")).toBe(true);
    expect(isBillingSuccessDataReady("idle")).toBe(true);
  });
});

describe("resolveCheckoutConfirmationStatus", () => {
  test("maps paid Agency plans to agency_active", () => {
    expect(
      resolveCheckoutConfirmationStatus({ plan: "agency", orchCreditsRemaining: 0 }),
    ).toBe("agency_active");
    expect(
      resolveCheckoutConfirmationStatus({ plan: "agency_unlimited", orchCreditsRemaining: 0 }),
    ).toBe("agency_active");
  });

  test("maps credit-only snapshots to credits_added", () => {
    expect(
      resolveCheckoutConfirmationStatus({ plan: "trial", orchCreditsRemaining: 100 }),
    ).toBe("credits_added");
    expect(
      resolveCheckoutConfirmationStatus({ plan: "leftover", orchCreditsRemaining: 50 }),
    ).toBe("credits_added");
  });

  test("rejects unchanged trial without credits", () => {
    expect(
      resolveCheckoutConfirmationStatus({ plan: "trial", orchCreditsRemaining: 0 }),
    ).toBe("error");
  });
});
