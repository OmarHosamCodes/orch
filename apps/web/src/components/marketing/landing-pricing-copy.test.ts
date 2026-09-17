import { describe, expect, test } from "bun:test";

import {
  LANDING_PRICING_COLUMNS,
  LANDING_PRICING_FEATURES,
  LANDING_PRICING_HEADLINE,
  landingAgencyCta,
} from "./landing-pricing-copy";

describe("landing pricing copy", () => {
  test("headline is the locked sentence", () => {
    expect(LANDING_PRICING_HEADLINE).toBe("Free to try. Agency when the trial ends.");
  });

  test("a leftover owner gets Subscribe — 1 seat, not Manage billing", () => {
    expect(landingAgencyCta({ isAuthenticated: true, plan: "leftover" })).toEqual({
      label: "Subscribe — 1 seat",
      kind: "checkout-agency",
    });
  });

  test("a trial owner is not treated as paid", () => {
    expect(landingAgencyCta({ isAuthenticated: true, plan: "trial" }).kind).toBe("checkout-agency");
  });

  test("no feature string equals Pro", () => {
    for (const feature of LANDING_PRICING_FEATURES) {
      expect(feature.label).not.toBe("Pro");
      expect(feature.trial).not.toBe("Pro");
      expect(feature.agency).not.toBe("Pro");
      expect(feature.unlimited).not.toBe("Pro");
    }
  });

  test("columns include Agency Unlimited", () => {
    expect(LANDING_PRICING_COLUMNS.some((column) => column.title === "Agency Unlimited")).toBe(
      true,
    );
  });
});
