import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { shouldRunBillingCheckoutConfirm } from "@/features/billing/billing-checkout-confirm";
import { billingStateQueryKey, useBilling } from "@/features/billing/billing-queries";
import { orpcClient } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export type BillingSuccessStatus = "idle" | "confirming" | "active" | "error";

export function useBillingSuccess(teamId: string | undefined, checkoutId: string | undefined) {
  const queryClient = useQueryClient();
  const { openPortal } = useBilling(teamId);
  const confirmedCheckoutIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<BillingSuccessStatus>(() =>
    checkoutId ? "confirming" : "active",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!teamId) {
      return;
    }
    queryClient.invalidateQueries({ queryKey: billingStateQueryKey(teamId) });
  }, [queryClient, teamId]);

  useEffect(() => {
    if (!teamId || !shouldRunBillingCheckoutConfirm(checkoutId, confirmedCheckoutIdRef.current)) {
      if (!checkoutId) {
        setStatus("active");
      }
      return;
    }

    confirmedCheckoutIdRef.current = checkoutId;
    setStatus("confirming");
    setErrorMessage("");

    void (async () => {
      try {
        await orpcClient.billing.confirmCheckout({
          teamId,
          checkoutId,
        });
        queryClient.invalidateQueries({ queryKey: billingStateQueryKey(teamId) });
        setStatus("active");
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "We couldn't confirm this checkout."));
        setStatus("error");
      }
    })();
  }, [checkoutId, queryClient, teamId]);

  return {
    status,
    errorMessage,
    openPortal,
  };
}
