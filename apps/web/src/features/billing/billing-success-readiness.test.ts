import { describe, expect, test } from "bun:test";

import {
  billingSuccessStatusWithoutCheckoutConfirm,
  initialBillingSuccessStatus,
  isBillingSuccessDataReady,
  resolveBillingSnapshotLoadState,
  resolveCheckoutConfirmationStatus,
} from "./billing-success-readiness";

describe("resolveBillingSnapshotLoadState", () => {
  test("pending without team or billing data", () => {
    expect(
      resolveBillingSnapshotLoadState({
        teamId: "team_1",
        hasBillingData: false,
        queryStatus: "pending",
      }),
    ).toBe("pending");
  });

  test("loaded when billing.state data exists", () => {
    expect(
      resolveBillingSnapshotLoadState({
        teamId: "team_1",
        hasBillingData: true,
        queryStatus: "pending",
      }),
    ).toBe("loaded");
  });

  test("error without team id", () => {
    expect(
      resolveBillingSnapshotLoadState({
        hasBillingData: false,
        queryStatus: "pending",
      }),
    ).toBe("error");
  });
});

describe("isBillingSuccessDataReady", () => {
  test("is not ready while confirming", () => {
    expect(isBillingSuccessDataReady("confirming")).toBe(false);
  });

  test("idle waits for billing.state", () => {
    expect(isBillingSuccessDataReady("idle", "pending")).toBe(false);
    expect(isBillingSuccessDataReady("idle", "loaded")).toBe(true);
    expect(isBillingSuccessDataReady("idle", "error")).toBe(true);
  });

  test("is ready after confirmation finishes", () => {
    expect(isBillingSuccessDataReady("agency_active")).toBe(true);
    expect(isBillingSuccessDataReady("credits_added")).toBe(true);
    expect(isBillingSuccessDataReady("error")).toBe(true);
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
