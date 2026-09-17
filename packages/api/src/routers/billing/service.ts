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

function primaryPolarProProductId(): string {
  const [productId] = polarProProductIds();
  if (!productId) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Agency seat checkout is not configured for this environment.",
    });
  }
  return productId;
}

function assertInviteSeatCount(seats: number) {
  if (!Number.isInteger(seats) || seats < 2) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Seat checkout requires at least 2 seats for a team invite.",
    });
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
  assertInviteSeatCount(input.seats);

  return createPolarCheckout({
    productId: primaryPolarProProductId(),
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
    const { applied } = await applyCreditPack(input.teamId, {
      checkoutId: input.checkoutId,
      credits: 100,
    });
    const snapshot = await getTeamBilling(input.teamId);
    if (!applied && snapshot.orchCreditsRemaining <= 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "This checkout did not add Orch credits to the team.",
      });
    }
    return snapshot;
  }

  if (isPolarProProduct(checkout.productId)) {
    if (!checkout.subscriptionId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "This checkout did not include an active Agency subscription.",
      });
    }

    await applyPolarSnapshot(input.teamId, {
      teamId: input.teamId,
      subscriptionId: checkout.subscriptionId,
      productId: checkout.productId,
      seats: checkout.seats,
      status: "active",
    });

    const snapshot = await getTeamBilling(input.teamId);
    if (snapshot.plan !== "agency" && snapshot.plan !== "agency_unlimited") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Agency billing is not active for this team yet.",
      });
    }
    return snapshot;
  }

  return getTeamBilling(input.teamId);
}
