import { describe, expect, test } from "bun:test";

import { formatMemoryForPrompt } from "./memory-prompt";

describe("formatMemoryForPrompt", () => {
  test("returns empty string when nothing is known", () => {
    expect(
      formatMemoryForPrompt({
        facts: "",
        recentObservations: "",
        unreadInbox: "",
      }),
    ).toBe("");
  });

  test("joins facts observations and inbox", () => {
    const prompt = formatMemoryForPrompt({
      facts: "- timezone: Cairo",
      recentObservations: "- 2026-09-15: late hours",
      unreadInbox: "- Finished a reply you missed",
    });
    expect(prompt).toContain("Known facts:");
    expect(prompt).toContain("timezone: Cairo");
    expect(prompt).toContain("Recent observations:");
    expect(prompt).toContain("Unread inbox:");
  });
});
