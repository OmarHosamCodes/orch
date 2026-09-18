import { describe, expect, test } from "bun:test";

import { createPolarBillingAfterHandler } from "./polar-billing-after";

const order = {
  teamId: "team-1",
  checkoutId: "chk_1",
  productId: "prod-credits",
  seats: 1,
  subscriptionId: null,
};

const subscription = {
  teamId: "team-1",
  subscriptionId: "sub_1",
  productId: "prod-pro",
  seats: 2,
};

describe("createPolarBillingAfterHandler", () => {
  test("forwards order-paid events to the registered handler", async () => {
    const events: string[] = [];
    const handler = createPolarBillingAfterHandler({
      logError: () => {},
    });
    handler.registerPolarOrderPaid(async (payload) => {
      events.push(`order:${payload.checkoutId}`);
    });

    await handler.handleOrderPaid(order);

    expect(events).toEqual(["order:chk_1"]);
  });

  test("forwards subscription-active events to the registered handler", async () => {
    const events: string[] = [];
    const handler = createPolarBillingAfterHandler({
      logError: () => {},
    });
    handler.registerPolarSubscriptionActive(async (payload) => {
      events.push(`sub:${payload.subscriptionId}`);
    });

    await handler.handleSubscriptionActive(subscription);

    expect(events).toEqual(["sub:sub_1"]);
  });

  test("logs and rethrows order-paid handler failures", async () => {
    const failure = new Error("apply failed");
    const logged: Array<[string, unknown]> = [];
    const handler = createPolarBillingAfterHandler({
      logError: (message, error) => logged.push([message, error]),
    });
    handler.registerPolarOrderPaid(async () => {
      throw failure;
    });

    await expect(handler.handleOrderPaid(order)).rejects.toBe(failure);
    expect(logged).toEqual([["Polar order-paid billing failed:", failure]]);
  });

  test("logs when order-paid handler was not registered", async () => {
    const logged: Array<[string, unknown]> = [];
    const handler = createPolarBillingAfterHandler({
      logError: (message, error) => logged.push([message, error]),
    });

    await handler.handleOrderPaid(order);

    expect(logged).toHaveLength(1);
    expect(logged[0]?.[0]).toBe("Polar order-paid handler is not registered.");
  });
});
