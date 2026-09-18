import { describe, expect, test } from "bun:test";

import {
  billingCreditsAddedCopy,
  billingSuccessWithoutCheckoutCopy,
} from "./billing-success-copy";

describe("billingCreditsAddedCopy", () => {
  test("paid Agency teams only confirm credits were added", () => {
    const copy = billingCreditsAddedCopy("agency");
    expect(copy.body).not.toContain("Subscribe separately");
    expect(copy.body).not.toContain("Pro");
    expect(copy.primary).toBe("Open Tracker");
    expect(copy.primaryHref).toBe("/agency");
  });

  test("leftover teams mention leftover limits and Agency subscribe", () => {
    const copy = billingCreditsAddedCopy("leftover");
    expect(copy.body).toContain("leftover");
    expect(copy.body).toContain("Agency");
    expect(copy.primaryHref).toBe("/canvas");
  });
});

describe("billingSuccessWithoutCheckoutCopy", () => {
  test("does not claim Agency is active without checkout confirm", () => {
    const leftover = billingSuccessWithoutCheckoutCopy("leftover");
    expect(leftover.title).not.toBe("Agency is active");
    expect(leftover.body).toContain("leftover");

    const agency = billingSuccessWithoutCheckoutCopy("agency");
    expect(agency.title).toBe("Billing");
    expect(agency.body).not.toContain("Agency is active");
  });
});
