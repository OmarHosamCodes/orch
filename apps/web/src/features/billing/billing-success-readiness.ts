export type BillingSuccessStatus =
  | "idle"
  | "confirming"
  | "agency_active"
  | "credits_added"
  | "error";

type CheckoutConfirmationSnapshot = {
  plan: "trial" | "leftover" | "agency" | "agency_unlimited";
  orchCreditsRemaining: number;
};

/** `useShellBootGate` expects dataReady — false while confirmation is in flight. */
export function isBillingSuccessDataReady(status: BillingSuccessStatus): boolean {
  return status !== "confirming";
}

export function resolveCheckoutConfirmationStatus(
  snapshot: CheckoutConfirmationSnapshot,
): "agency_active" | "credits_added" | "error" {
  if (snapshot.plan === "agency" || snapshot.plan === "agency_unlimited") {
    return "agency_active";
  }

  if (snapshot.orchCreditsRemaining > 0) {
    return "credits_added";
  }

  return "error";
}
