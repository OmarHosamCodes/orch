import { applyCreditPack, applyPolarSnapshot } from "@orch/api/billing-team";
import type { PolarOrderPaidView, PolarSubscriptionActiveView } from "@orch/auth/polar-billing-after";
import { env } from "@orch/env/server";

function polarProProductIds(): string[] {
  return (env.POLAR_PRODUCT_PRO ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isPolarProProduct(productId: string): boolean {
  return polarProProductIds().includes(productId);
}

async function handlePolarOrderPaid(order: PolarOrderPaidView) {
  if (env.POLAR_PRODUCT_ORCH_CREDITS && order.productId === env.POLAR_PRODUCT_ORCH_CREDITS) {
    if (!order.checkoutId) {
      return;
    }
    await applyCreditPack(order.teamId, { checkoutId: order.checkoutId, credits: 100 });
    return;
  }

  if (!isPolarProProduct(order.productId)) {
    return;
  }

  const subscriptionId = order.subscriptionId ?? order.checkoutId;
  if (!subscriptionId) {
    return;
  }

  await applyPolarSnapshot(order.teamId, {
    teamId: order.teamId,
    subscriptionId,
    productId: order.productId,
    seats: order.seats,
    status: "active",
  });
}

async function handlePolarSubscriptionActive(subscription: PolarSubscriptionActiveView) {
  await applyPolarSnapshot(subscription.teamId, {
    teamId: subscription.teamId,
    subscriptionId: subscription.subscriptionId,
    productId: subscription.productId,
    seats: subscription.seats,
    status: "active",
  });
}

export function registerTeamPolarBillingHandlers(handlers: {
  registerPolarOrderPaid: (callback: (order: PolarOrderPaidView) => Promise<void>) => void;
  registerPolarSubscriptionActive: (
    callback: (subscription: PolarSubscriptionActiveView) => Promise<void>,
  ) => void;
}) {
  handlers.registerPolarOrderPaid(handlePolarOrderPaid);
  handlers.registerPolarSubscriptionActive(handlePolarSubscriptionActive);
}
