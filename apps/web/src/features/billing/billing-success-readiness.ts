export type BillingSuccessStatus =
  | "idle"
  | "confirming"
  | "agency_active"
  | "credits_added"
  | "error";

export type CheckoutKind = "agency" | "credits";

/** `useShellBootGate` expects dataReady — false while confirmation is in flight. */
export function isBillingSuccessDataReady(status: BillingSuccessStatus): boolean {
  return status !== "confirming";
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
