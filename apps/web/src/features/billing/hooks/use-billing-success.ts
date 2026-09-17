import type { AgencyPlan } from "@orch/workspace/tiers";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useShellBootGate } from "@/features/app-shell/shell/use-shell-boot-gate";
import { shouldRunBillingCheckoutConfirm } from "@/features/billing/billing-checkout-confirm";
import { billingStateQueryKey, useBilling } from "@/features/billing/billing-queries";
import {
  billingSuccessStatusWithoutCheckoutConfirm,
  type BillingSuccessStatus,
  initialBillingSuccessStatus,
  isBillingSuccessDataReady,
  resolveBillingSnapshotLoadState,
  resolveCheckoutConfirmationStatus,
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
  const { openPortal, plan, billingQuery } = useBilling(teamId);
  const billingSnapshotLoad = resolveBillingSnapshotLoadState({
    teamId,
    hasBillingData: billingQuery.data !== undefined,
    queryStatus: billingQuery.status,
  });
  const confirmedCheckoutIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<BillingSuccessStatus>(() =>
    initialBillingSuccessStatus(checkoutId),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [creditsPlan, setCreditsPlan] = useState<AgencyPlan | undefined>();

  useEffect(() => {
    if (!teamId) {
      return;
    }
    queryClient.invalidateQueries({ queryKey: billingStateQueryKey(teamId) });
  }, [queryClient, teamId]);

  useEffect(() => {
    const withoutCheckout = billingSuccessStatusWithoutCheckoutConfirm(checkoutId);
    if (withoutCheckout) {
      setStatus(withoutCheckout);
      setCreditsPlan(undefined);
    }

    if (!teamId || !shouldRunBillingCheckoutConfirm(checkoutId, confirmedCheckoutIdRef.current)) {
      return;
    }

    confirmedCheckoutIdRef.current = checkoutId;
    setStatus("confirming");
    setErrorMessage("");
    setCreditsPlan(undefined);

    void (async () => {
      try {
        const result = await orpcClient.billing.confirmCheckout({
          teamId,
          checkoutId,
        });
        queryClient.invalidateQueries({ queryKey: billingStateQueryKey(teamId) });

        setCreditsPlan(result.billing.plan);
        setStatus(resolveCheckoutConfirmationStatus(result.checkoutKind));
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "We couldn't confirm this checkout."));
        setStatus("error");
      }
    })();
  }, [checkoutId, queryClient, teamId]);

  const { isBooting } = useShellBootGate(
    isBillingSuccessDataReady(status, billingSnapshotLoad),
  );

  return {
    status,
    errorMessage,
    openPortal,
    isBooting,
    plan,
    creditsPlan,
  };
}
