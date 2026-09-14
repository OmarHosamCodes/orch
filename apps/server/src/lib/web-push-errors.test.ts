import { describe, expect, test } from "bun:test";

import { shouldDropPushSubscription } from "./web-push-errors";

describe("shouldDropPushSubscription", () => {
  test("drops gone and bad-request endpoints", () => {
    expect(shouldDropPushSubscription({ statusCode: 404 })).toBe(true);
    expect(shouldDropPushSubscription({ statusCode: 410 })).toBe(true);
    expect(shouldDropPushSubscription({ statusCode: 400 })).toBe(true);
  });

  test("drops FCM permanent 500s and keeps transient ones", () => {
    expect(
      shouldDropPushSubscription({
        statusCode: 500,
        body: "permanent internal error encountered, do not retry the request.\n",
      }),
    ).toBe(true);
    expect(shouldDropPushSubscription({ statusCode: 500, body: "try again later" })).toBe(false);
  });

  test("keeps unknown errors", () => {
    expect(shouldDropPushSubscription(new Error("timeout"))).toBe(false);
    expect(shouldDropPushSubscription(null)).toBe(false);
  });
});
