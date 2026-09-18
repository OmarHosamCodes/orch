import { ORPCError } from "@orpc/server";
import { env, planForPolarProductId, resolvePolarCatalog } from "@orch/env/server";

import {
  applyCreditPack,
  applyPolarSnapshot,
  deriveInviteSeatCheckoutQuantity,
  getTeamBilling,
  hasCreditGrantForCheckout,
} from "../../billing-team";
import { db } from "@orch/db";
import { createPolarCheckout, fetchPolarCheckout } from "../../billing-polar-checkout";
import { requireTeamMembership } from "../../lib/team-membership";

import { agencyEnabled, legacyTier } from "@orch/workspace/tiers";

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

  const snapshot = await getTeamBilling(input.teamId);
  const catalog = resolvePolarCatalog(env);
  const productId =
    snapshot.plan === "agency_unlimited" && catalog.unlimitedProductId
      ? catalog.unlimitedProductId
      : catalog.agencyProductId;
  if (!productId) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Agency seat checkout is not configured for this environment.",
    });
  }

  const seats = await db.transaction(async (tx) =>
    deriveInviteSeatCheckoutQuantity(input.teamId, tx),
  );

  return createPolarCheckout({
    productId,
    seats,
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

export type ConfirmCheckoutResult = {
  billing: Awaited<ReturnType<typeof getTeamBilling>>;
  checkoutKind: "agency" | "credits";
};

export async function confirmCheckout(
  actorUserId: string,
  input: { teamId: string; checkoutId: string },
): Promise<ConfirmCheckoutResult> {
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
    if (!applied && !(await hasCreditGrantForCheckout(input.checkoutId))) {
      throw new ORPCError("BAD_REQUEST", {
        message: "This checkout did not add Orch credits to the team.",
      });
    }
    return { billing: snapshot, checkoutKind: "credits" };
  }

  if (planForPolarProductId(resolvePolarCatalog(env), checkout.productId)) {
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
    return { billing: snapshot, checkoutKind: "agency" };
  }

  throw new ORPCError("BAD_REQUEST", {
    message: "This checkout product is not supported for team billing.",
  });
}
