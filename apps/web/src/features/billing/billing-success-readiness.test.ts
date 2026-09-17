import { describe, expect, test } from "bun:test";

import {
  isBillingSuccessDataReady,
  isCheckoutConfirmationSuccessful,
} from "./billing-success-readiness";

describe("isBillingSuccessDataReady", () => {
  test("is not ready while confirming", () => {
    expect(isBillingSuccessDataReady("confirming")).toBe(false);
  });

  test("is ready for active, error, and idle", () => {
    expect(isBillingSuccessDataReady("active")).toBe(true);
    expect(isBillingSuccessDataReady("error")).toBe(true);
    expect(isBillingSuccessDataReady("idle")).toBe(true);
  });
});

describe("isCheckoutConfirmationSuccessful", () => {
  test("accepts paid Agency plans", () => {
    expect(
      isCheckoutConfirmationSuccessful({ plan: "agency", orchCreditsRemaining: 0 }),
    ).toBe(true);
    expect(
      isCheckoutConfirmationSuccessful({ plan: "agency_unlimited", orchCreditsRemaining: 0 }),
    ).toBe(true);
  });

  test("accepts credit-only snapshots", () => {
    expect(
      isCheckoutConfirmationSuccessful({ plan: "trial", orchCreditsRemaining: 100 }),
    ).toBe(true);
  });

  test("rejects unchanged trial without credits", () => {
    expect(
      isCheckoutConfirmationSuccessful({ plan: "trial", orchCreditsRemaining: 0 }),
    ).toBe(false);
  });
});
