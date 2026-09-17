export type PolarOrderPaidView = {
  teamId: string;
  checkoutId: string;
  productId: string;
  seats: number;
  subscriptionId: string | null;
};

export type PolarSubscriptionActiveView = {
  teamId: string;
  subscriptionId: string;
  productId: string;
  seats: number;
};

type PolarOrderPaidHandler = (order: PolarOrderPaidView) => Promise<void>;
type PolarSubscriptionActiveHandler = (subscription: PolarSubscriptionActiveView) => Promise<void>;

type PolarBillingAfterDependencies = {
  logError: (message: string, error: unknown) => void;
};

export function createPolarBillingAfterHandler({ logError }: PolarBillingAfterDependencies) {
  let polarOrderPaidHandler: PolarOrderPaidHandler | null = null;
  let polarSubscriptionActiveHandler: PolarSubscriptionActiveHandler | null = null;

  return {
    registerPolarOrderPaid(callback: PolarOrderPaidHandler) {
      polarOrderPaidHandler = callback;
    },

    registerPolarSubscriptionActive(callback: PolarSubscriptionActiveHandler) {
      polarSubscriptionActiveHandler = callback;
    },

    async handleOrderPaid(order: PolarOrderPaidView) {
      if (!polarOrderPaidHandler) {
        logError("Polar order-paid handler is not registered.", new Error("missing handler"));
        return;
      }

      try {
        await polarOrderPaidHandler(order);
      } catch (error) {
        logError("Polar order-paid billing failed:", error);
        throw error;
      }
    },

    async handleSubscriptionActive(subscription: PolarSubscriptionActiveView) {
      if (!polarSubscriptionActiveHandler) {
        logError("Polar subscription-active handler is not registered.", new Error("missing handler"));
        return;
      }

      try {
        await polarSubscriptionActiveHandler(subscription);
      } catch (error) {
        logError("Polar subscription-active billing failed:", error);
        throw error;
      }
    },
  };
}
