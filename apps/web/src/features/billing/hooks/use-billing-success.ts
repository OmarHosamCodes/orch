import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useShellBootGate } from "@/features/app-shell/shell/use-shell-boot-gate";
import { shouldRunBillingCheckoutConfirm } from "@/features/billing/billing-checkout-confirm";
import { billingStateQueryKey, useBilling } from "@/features/billing/billing-queries";
import {
  type BillingSuccessStatus,
  isBillingSuccessDataReady,
  isCheckoutConfirmationSuccessful,
} from "@/features/billing/billing-success-readiness";
import { useTeamStore } from "@/features/team/team-store";
import { useSearchParams } from "@/lib/navigation";
import { orpcClient } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export function useBillingSuccess() {
  const [searchParams] = useSearchParams();
  const checkoutId = searchParams.get("checkout_id") ?? undefined;
  const teamId = useTeamStore((state) => state.selectedTeamId) || undefined;

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
        const snapshot = await orpcClient.billing.confirmCheckout({
          teamId,
          checkoutId,
        });
        queryClient.invalidateQueries({ queryKey: billingStateQueryKey(teamId) });

        if (!isCheckoutConfirmationSuccessful(snapshot)) {
          setErrorMessage("This checkout did not activate Agency billing for the team.");
          setStatus("error");
          return;
        }

        setStatus("active");
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "We couldn't confirm this checkout."));
        setStatus("error");
      }
    })();
  }, [checkoutId, queryClient, teamId]);

  const { isBooting } = useShellBootGate(isBillingSuccessDataReady(status));

  return {
    status,
    errorMessage,
    openPortal,
    isBooting,
  };
}
