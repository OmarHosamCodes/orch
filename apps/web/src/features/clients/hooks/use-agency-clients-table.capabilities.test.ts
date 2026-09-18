import { describe, expect, test } from "bun:test";

import { agencyTeamCapabilities } from "@/features/shared/agency-team-capabilities";

describe("agency team capabilities for clients table", () => {
  test("editor can edit records but not rates", () => {
    const caps = agencyTeamCapabilities("editor");
    expect(caps.canEditRecords).toBe(true);
    expect(caps.canEditRates).toBe(false);
    expect(caps.isOwner).toBe(false);
  });

  test("owner can edit records and rates", () => {
    const caps = agencyTeamCapabilities("owner");
    expect(caps.canEditRecords).toBe(true);
    expect(caps.canEditRates).toBe(true);
    expect(caps.isOwner).toBe(true);
  });

  test("viewer cannot edit records or rates", () => {
    const caps = agencyTeamCapabilities("viewer");
    expect(caps.canEditRecords).toBe(false);
    expect(caps.canEditRates).toBe(false);
    expect(caps.isOwner).toBe(false);
  });
});
