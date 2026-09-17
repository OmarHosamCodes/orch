import { describe, expect, test } from "bun:test";

import {
  agencyPaywallCopy,
  agencySeatInviteCopy,
  AGENCY_SEAT_REQUIRED_INVITE_BODY,
} from "./agency-paywall-copy";

describe("agencyPaywallCopy", () => {
  test("returns the locked trial-ended copy for leftover agencies", () => {
    const copy = agencyPaywallCopy("leftover");

    expect(copy.eyebrow).toBe("Agency");
    expect(copy.title).toBe("Trial ended");
    expect(copy.body).toBe(
      "Subscribe to keep Tracker, projects, money, and people for this agency. Canvas stays available on the leftover limits.",
    );
    expect(copy.primary).toBe("Subscribe — 1 seat");
    expect(copy.secondary).toBe("Open Canvas");
  });
});

describe("agencySeatInviteCopy", () => {
  test("returns trial invite copy for trial and leftover teams", () => {
    for (const plan of ["trial", "leftover"] as const) {
      const copy = agencySeatInviteCopy(plan);
      expect(copy.title).toBe("Add a seat");
      expect(copy.body).toBe("Trial is solo. Adding someone starts Agency billing for this team.");
      expect(copy.primary).toBe("Continue to checkout");
      expect(copy.secondary).toBe("Cancel");
    }
  });

  test("paid Agency teams use the seat-required sentence", () => {
    for (const plan of ["agency", "agency_unlimited"] as const) {
      const copy = agencySeatInviteCopy(plan);
      expect(copy.title).toBe("Add a seat");
      expect(copy.body).toBe(AGENCY_SEAT_REQUIRED_INVITE_BODY);
      expect(copy.body).not.toContain("Trial is solo");
    }
  });
});
