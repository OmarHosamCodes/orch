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

function billingStateQueryOptions(teamId: string | null | undefined, enabled: boolean) {
  const resolvedTeamId = teamId ?? "";
  return {
    ...orpc.billing.state.queryOptions({ input: { teamId: resolvedTeamId } }),
    enabled: enabled && Boolean(resolvedTeamId),
    staleTime: 5 * 60 * 1000,
  };
}

function billingStateQueryKey(teamId: string | null | undefined) {
  return orpc.billing.state.queryOptions({ input: { teamId: teamId ?? "" } }).queryKey;
}

function deriveBillingState(data: BillingState | undefined) {
  const plan = data?.plan ?? "leftover";
  const tier = data?.tier ?? "free";
  return {
    plan,
    tier,
    isPro: tier === "pro",
    agencyEnabled: data?.agencyEnabled ?? false,
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

function refreshBillingState(queryClient: QueryClient, teamId: string | null | undefined) {
  if (!teamId) return;
  queryClient.invalidateQueries({ queryKey: billingStateQueryKey(teamId) });
}

export function useBilling(teamId?: string | null, enabled = true) {
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const queryEnabled = enabled && Boolean(user);

  const billingQuery = useQuery(billingStateQueryOptions(teamId, queryEnabled));
  const derived = deriveBillingState(billingQuery.data);

  return {
    billingQuery,
    ...derived,
    checkout: checkoutBilling,
    openPortal: openBillingPortal,
    refreshBillingState: () => refreshBillingState(queryClient, teamId),
  };
}
