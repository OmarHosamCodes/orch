import { describe, expect, test } from "bun:test";

import { resolveEclipseMood } from "./eclipse-mood";

describe("resolveEclipseMood", () => {
  const base = {
    isStreaming: false,
    error: null,
    unreadCount: 0,
    pendingProposalCount: 0,
    lastRunSucceededAt: null,
    now: 10_000,
  };

  test("idle by default", () => {
    expect(resolveEclipseMood(base)).toBe("idle");
  });

  test("working while streaming", () => {
    expect(resolveEclipseMood({ ...base, isStreaming: true })).toBe("working");
  });

  test("error outranks streaming", () => {
    expect(resolveEclipseMood({ ...base, isStreaming: true, error: "fail" })).toBe("error");
  });

  test("needs-you for unread inbox", () => {
    expect(resolveEclipseMood({ ...base, unreadCount: 1 })).toBe("needs-you");
  });

  test("needs-you for pending agency confirm", () => {
    expect(resolveEclipseMood({ ...base, pendingProposalCount: 2 })).toBe("needs-you");
  });

  test("done shortly after a succeeded run", () => {
    expect(resolveEclipseMood({ ...base, lastRunSucceededAt: 9_000 })).toBe("done");
  });

  test("idle after done window", () => {
    expect(resolveEclipseMood({ ...base, lastRunSucceededAt: 1_000 })).toBe("idle");
  });
});
