export type BillingSuccessStatus =
  | "idle"
  | "confirming"
  | "agency_active"
  | "credits_added"
  | "error";

export type CheckoutKind = "agency" | "credits";

export type BillingSnapshotLoadState = "pending" | "loaded" | "error";

export function resolveBillingSnapshotLoadState(input: {
  teamId?: string;
  hasBillingData: boolean;
  queryStatus: "pending" | "error" | "success";
}): BillingSnapshotLoadState {
  if (!input.teamId) {
    return "error";
  }
  if (input.hasBillingData) {
    return "loaded";
  }
  if (input.queryStatus === "error") {
    return "error";
  }
  return "pending";
}

/** `useShellBootGate` expects dataReady — false while confirmation or billing.state is pending. */
export function isBillingSuccessDataReady(
  status: BillingSuccessStatus,
  billingSnapshot: BillingSnapshotLoadState = "loaded",
): boolean {
  if (status === "confirming") {
    return false;
  }
  if (status === "idle") {
    return billingSnapshot === "loaded" || billingSnapshot === "error";
  }
  return true;
}

export function initialBillingSuccessStatus(
  checkoutId: string | undefined,
): BillingSuccessStatus {
  return checkoutId ? "confirming" : "idle";
}

/** Without a Polar checkout_id we never claim Agency activation from confirm. */
export function billingSuccessStatusWithoutCheckoutConfirm(
  checkoutId: string | undefined,
): BillingSuccessStatus | null {
  if (!checkoutId) {
    return "idle";
  }
  return null;
}

export function resolveCheckoutConfirmationStatus(
  checkoutKind: CheckoutKind,
): "agency_active" | "credits_added" {
  switch (checkoutKind) {
    case "agency":
      return "agency_active";
    case "credits":
      return "credits_added";
    default: {
      const _exhaustive: never = checkoutKind;
      return _exhaustive;
    }
  }
}
