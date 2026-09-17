import { describe, expect, test } from "bun:test";

import {
  billingSuccessStatusWithoutCheckoutConfirm,
  initialBillingSuccessStatus,
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

describe("initialBillingSuccessStatus", () => {
  test("starts idle without checkout_id", () => {
    expect(initialBillingSuccessStatus(undefined)).toBe("idle");
  });

  test("starts confirming when checkout_id is present", () => {
    expect(initialBillingSuccessStatus("chk_123")).toBe("confirming");
  });
});

describe("billingSuccessStatusWithoutCheckoutConfirm", () => {
  test("returns idle when checkout_id is missing", () => {
    expect(billingSuccessStatusWithoutCheckoutConfirm(undefined)).toBe("idle");
  });

  test("returns null when checkout_id is present", () => {
    expect(billingSuccessStatusWithoutCheckoutConfirm("chk_123")).toBeNull();
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
