import { describe, expect, test } from "bun:test";

import { shouldRunBillingCheckoutConfirm } from "./billing-checkout-confirm";

describe("shouldRunBillingCheckoutConfirm", () => {
  test("runs when checkout id is new", () => {
    expect(shouldRunBillingCheckoutConfirm("chk_1", null)).toBe(true);
    expect(shouldRunBillingCheckoutConfirm("chk_2", "chk_1")).toBe(true);
  });

  test("skips when the same checkout id was already confirmed", () => {
    expect(shouldRunBillingCheckoutConfirm("chk_1", "chk_1")).toBe(false);
  });

  test("skips when checkout id is missing", () => {
    expect(shouldRunBillingCheckoutConfirm(undefined, null)).toBe(false);
  });
});
