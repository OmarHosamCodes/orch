import { describe, expect, test } from "bun:test";

import { resolveFirstRunStatus } from "./first-run-status";

describe("resolveFirstRunStatus", () => {
  test("completed users are done even with no membership", () => {
    expect(
      resolveFirstRunStatus({
        completedAt: new Date("2026-09-18T00:00:00.000Z"),
        membershipCount: 0,
      }),
    ).toBe("done");
  });

  test("incomplete members join instead of creating a second agency", () => {
    expect(resolveFirstRunStatus({ completedAt: null, membershipCount: 1 })).toBe("join");
  });

  test("incomplete accounts with zero memberships create", () => {
    expect(resolveFirstRunStatus({ completedAt: null, membershipCount: 0 })).toBe("create");
  });
});
