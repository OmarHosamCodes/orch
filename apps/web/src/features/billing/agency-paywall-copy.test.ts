import { describe, expect, test } from "bun:test";

import { agencyPaywallCopy, agencySeatInviteCopy } from "./agency-paywall-copy";

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
  test("returns the locked trial invite seat dialog copy", () => {
    const copy = agencySeatInviteCopy();

    expect(copy.title).toBe("Add a seat");
    expect(copy.body).toBe("Trial is solo. Adding someone starts Agency billing for this team.");
    expect(copy.primary).toBe("Continue to checkout");
    expect(copy.secondary).toBe("Cancel");
  });
});
