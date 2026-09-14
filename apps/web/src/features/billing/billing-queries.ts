import type { TierLimits } from "@orch/workspace/tiers";
import type { QueryClient } from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { useAuthSession } from "@/lib/auth-session";
import { orpc, orpcClient } from "@/lib/orpc";

const DEFAULT_BILLING_LIMITS: TierLimits = {
  workspaceNodes: 10,
  blocksPerTab: 6,
  tabsPerNode: 3,
  teams: 1,
  teamMembers: 3,
  aiConversations: 5,
  agencyOps: false,
  marketplacePublish: false,
};

type BillingState = Awaited<ReturnType<typeof orpcClient.billing.state>>;

function billingStateQueryOptions(authEnabled: boolean) {
  return {
    ...orpc.billing.state.queryOptions(),
    enabled: authEnabled,
    staleTime: 5 * 60 * 1000,
  };
}

function billingStateQueryKey() {
  return orpc.billing.state.queryOptions().queryKey;
}

function deriveBillingState(data: BillingState | undefined) {
  const tier = data?.tier ?? "free";
  return {
    tier,
    isPro: tier === "pro",
    limits: data?.limits ?? DEFAULT_BILLING_LIMITS,
    subscription: data?.subscription ?? null,
  };
}

async function checkoutBilling(slug = "pro") {
  await authClient.checkout({ slug });
}

async function openBillingPortal() {
  await authClient.customer.portal();
}

function refreshBillingState(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: billingStateQueryKey() });
}

export function useBilling(enabled = true) {
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const authEnabled = enabled && Boolean(user);

  const billingQuery = useQuery(billingStateQueryOptions(authEnabled));
  const derived = deriveBillingState(billingQuery.data);

  return {
    billingQuery,
    ...derived,
    checkout: checkoutBilling,
    openPortal: openBillingPortal,
    refreshBillingState: () => refreshBillingState(queryClient),
  };
}
