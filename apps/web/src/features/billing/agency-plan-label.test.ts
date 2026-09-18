import { describe, expect, test } from "bun:test";

import { agencyPlanLabel } from "./agency-plan-label";

describe("agencyPlanLabel", () => {
  test("leftover is Leftover, not Free or Pro", () => {
    expect(agencyPlanLabel("leftover")).toBe("Leftover");
    expect(agencyPlanLabel("agency_unlimited")).toBe("Agency Unlimited");
  });

  test("maps trial and agency without Pro or Free", () => {
    expect(agencyPlanLabel("trial")).toBe("Trial");
    expect(agencyPlanLabel("agency")).toBe("Agency");
  });

  test("undefined plan is Leftover while billing is loading", () => {
    expect(agencyPlanLabel(undefined)).toBe("Leftover");
  });
});
