export type BillingSuccessStatus = "idle" | "confirming" | "active" | "error";

/** `useShellBootGate` expects dataReady — false while confirmation is in flight. */
export function isBillingSuccessDataReady(status: BillingSuccessStatus): boolean {
  return status !== "confirming";
}

type CheckoutConfirmationSnapshot = {
  plan: "trial" | "leftover" | "agency" | "agency_unlimited";
  orchCreditsRemaining: number;
};

export function isCheckoutConfirmationSuccessful(snapshot: CheckoutConfirmationSnapshot): boolean {
  if (snapshot.plan === "agency" || snapshot.plan === "agency_unlimited") {
    return true;
  }

  return snapshot.orchCreditsRemaining > 0;
}
