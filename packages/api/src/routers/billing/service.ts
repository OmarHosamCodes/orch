import { ORPCError } from "@orpc/server";
import { env } from "@orch/env/server";

import { applyCreditPack, applyPolarSnapshot, getTeamBilling } from "../../billing-team";
import { createPolarCheckout, fetchPolarCheckout } from "../../billing-polar-checkout";
import { requireTeamMembership } from "../../lib/team-membership";

import { agencyEnabled, legacyTier } from "@orch/workspace/tiers";

function polarProProductIds(): string[] {
  return (env.POLAR_PRODUCT_PRO ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isPolarProProduct(productId: string): boolean {
  return polarProProductIds().includes(productId);
}

function assertPositiveIntegerSeats(seats: number) {
  if (!Number.isInteger(seats) || seats < 1) {
    throw new ORPCError("BAD_REQUEST", { message: "Seats must be a positive integer." });
  }
}

export async function getSubscriptionBillingState(actorUserId: string, input: { teamId: string }) {
  await requireTeamMembership(actorUserId, input.teamId);
  const billing = await getTeamBilling(input.teamId);

  return {
    plan: billing.plan,
    tier: legacyTier(billing.plan),
    agencyEnabled: agencyEnabled(billing.plan),
    seats: billing.seats,
    trialEndsAt: billing.trialEndsAt,
    subscription: null,
    limits: {
      ...billing.limits,
      aiConversations: Math.max(1, billing.orchMessagesIncluded),
      teamMembers: billing.seats,
      agencyOps: agencyEnabled(billing.plan),
    },
  };
}

export async function createSeatCheckout(
  actorUserId: string,
  input: { teamId: string; seats: number },
): Promise<{ url: string }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");
  assertPositiveIntegerSeats(input.seats);

  return createPolarCheckout({
    productId: env.POLAR_PRODUCT_PRO,
    seats: input.seats,
    teamId: input.teamId,
    actorUserId,
  });
}

export async function createCreditCheckout(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ url: string }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const productId = env.POLAR_PRODUCT_ORCH_CREDITS;
  if (!productId) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Orch credit packs are not configured for this environment.",
    });
  }

  return createPolarCheckout({
    productId,
    teamId: input.teamId,
    actorUserId,
  });
}

export async function confirmCheckout(
  actorUserId: string,
  input: { teamId: string; checkoutId: string },
) {
  await requireTeamMembership(actorUserId, input.teamId);

  const checkout = await fetchPolarCheckout(input.checkoutId);
  if (checkout.teamId !== input.teamId) {
    throw new ORPCError("FORBIDDEN", { message: "Checkout does not belong to this team." });
  }

  if (checkout.status !== "succeeded" && checkout.status !== "confirmed") {
    throw new ORPCError("BAD_REQUEST", { message: "Checkout is not complete yet." });
  }

  if (env.POLAR_PRODUCT_ORCH_CREDITS && checkout.productId === env.POLAR_PRODUCT_ORCH_CREDITS) {
    await applyCreditPack(input.teamId, { checkoutId: input.checkoutId, credits: 100 });
  } else if (isPolarProProduct(checkout.productId)) {
    const subscriptionId = checkout.subscriptionId ?? checkout.checkoutId;
    await applyPolarSnapshot(input.teamId, {
      teamId: input.teamId,
      subscriptionId,
      productId: checkout.productId,
      seats: checkout.seats,
      status: "active",
    });
  }

  return getTeamBilling(input.teamId);
}
