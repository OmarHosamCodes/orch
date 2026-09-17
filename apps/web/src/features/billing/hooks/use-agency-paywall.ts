import { useState } from "react";

import { useBilling } from "@/features/billing/billing-queries";
import { useTeamStore } from "@/features/team/team-store";

import { agencyPaywallCopy } from "../agency-paywall-copy";

export function useAgencyPaywall() {
  const selectedTeamId = useTeamStore((state) => state.selectedTeamId);
  const { checkout } = useBilling(selectedTeamId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  async function onSubscribe() {
    setIsSubmitting(true);
    setCheckoutError("");

    try {
      await checkout("agency");
    } catch {
      setCheckoutError("Checkout didn't finish. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    copy: agencyPaywallCopy("leftover"),
    isSubmitting,
    checkoutError,
    onSubscribe,
  };
}
