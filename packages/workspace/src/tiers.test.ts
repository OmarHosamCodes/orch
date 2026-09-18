import { describe, expect, test } from "bun:test";
import { AGENCY_PLAN_LIMITS, agencyEnabled, legacyTier, resolvePlanAt } from "./tiers";

describe("agency plans", () => {
  test("trial and paid enable Agency; leftover does not", () => {
    expect(agencyEnabled("trial")).toBe(true);
    expect(agencyEnabled("agency")).toBe(true);
    expect(agencyEnabled("agency_unlimited")).toBe(true);
    expect(agencyEnabled("leftover")).toBe(false);
  });

  test("after trialEndsAt the plan is leftover unless paid", () => {
    const trialEndsAt = new Date("2026-10-01T00:00:00.000Z");
    expect(
      resolvePlanAt({
        storedPlan: "trial",
        trialEndsAt,
        now: new Date("2026-09-30T23:59:59.000Z"),
      }),
    ).toBe("trial");
    expect(
      resolvePlanAt({
        storedPlan: "trial",
        trialEndsAt,
        now: new Date("2026-10-01T00:00:01.000Z"),
      }),
    ).toBe("leftover");
    expect(
      resolvePlanAt({
        storedPlan: "agency",
        trialEndsAt,
        now: new Date("2026-10-01T00:00:01.000Z"),
      }),
    ).toBe("agency");
  });

  test("legacy tier is pro for trial and paid, free for leftover", () => {
    expect(legacyTier("trial")).toBe("pro");
    expect(legacyTier("leftover")).toBe("free");
    expect(legacyTier("agency")).toBe("pro");
  });

  test("trial client cap is 10", () => {
    expect(AGENCY_PLAN_LIMITS.trial.clients).toBe(10);
    expect(AGENCY_PLAN_LIMITS.agency.clients).toBe(100);
  });
});
