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
  test("maps Polar checkout kind to UI status", () => {
    expect(resolveCheckoutConfirmationStatus("agency")).toBe("agency_active");
    expect(resolveCheckoutConfirmationStatus("credits")).toBe("credits_added");
  });

  test("credit checkout stays credits_added even when billing plan is Agency", () => {
    expect(resolveCheckoutConfirmationStatus("credits")).toBe("credits_added");
  });
});
