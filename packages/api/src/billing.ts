import { env } from "@orch/env/server";
import { type Tier, TIER_LIMITS } from "@orch/workspace/tiers";
import type { CustomerState } from "@polar-sh/sdk/models/components/customerstate.js";

export type BillingSubscription = {
  productId: string;
  status: string;
  currentPeriodEnd: string | null;
  source: "polar" | "lifetime";
  isLifetime: boolean;
};

export type BillingState = {
  tier: Tier;
  subscription: BillingSubscription | null;
  limits: (typeof TIER_LIMITS)[Tier];
};

type BillingStateOptions = {
  lifetimePro?: boolean;
};

type ActiveSubscription = NonNullable<CustomerState["activeSubscriptions"]>[number];

export function getFreeBillingState(): BillingState {
  return { tier: "free", subscription: null, limits: TIER_LIMITS.free };
}

export function getLifetimeBillingState(): BillingState {
  return {
    tier: "pro",
    subscription: {
      productId: "lifetime-pro",
      status: "active",
      currentPeriodEnd: null,
      source: "lifetime",
      isLifetime: true,
    },
    limits: TIER_LIMITS.pro,
  };
}

function getPolarProBillingState(subscription: ActiveSubscription): BillingState {
  return {
    tier: "pro",
    subscription: {
      productId: subscription.productId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      source: "polar",
      isLifetime: false,
    },
    limits: TIER_LIMITS.pro,
  };
}

export function normalizeBillingState(
  customerState: CustomerState | null,
  options: BillingStateOptions = {},
): BillingState {
  const fallbackBilling = options.lifetimePro ? getLifetimeBillingState() : getFreeBillingState();

  if (!customerState?.activeSubscriptions?.length) {
    return fallbackBilling;
  }

  const proProductIds = (env.POLAR_PRODUCT_PRO ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  // First try to match configured Pro product IDs
  const proSubscription = customerState.activeSubscriptions.find((sub) =>
    proProductIds.includes(sub.productId),
  );

  if (proSubscription) {
    return getPolarProBillingState(proSubscription);
  }

  return fallbackBilling;
}
