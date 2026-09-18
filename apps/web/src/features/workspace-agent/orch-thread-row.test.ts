import { describe, expect, test } from "bun:test";

import {
  formatOrchThreadPreset,
  formatOrchWorkingStatus,
  mapConversationToOrchThreadRow,
  stripOrchThreadPreview,
} from "./orch-thread-row";

describe("stripOrchThreadPreview", () => {
  test("strips markdown dumps into one clean line", () => {
    expect(
      stripOrchThreadPreview(
        "I remember your report preferences: - **Report format:** `nH:nM:nS` (hours : minutes : seconds) - **Waste priority:** `show_before_raw_hours`",
      ),
    ).toBe("I remember your report preferences");
  });

  test("keeps a short sentence intact", () => {
    expect(stripOrchThreadPreview("I remember your report preferences.")).toBe(
      "I remember your report preferences.",
    );
  });

  test("strips tool-call markup from previews", () => {
    expect(
      stripOrchThreadPreview(
        "<|tool_call_start|>[get_agency_reports_summary()]<|tool_call_end|> I'll check the reports.",
      ),
    ).toBe("I'll check the reports.");
  });

  test("returns empty for whitespace", () => {
    expect(stripOrchThreadPreview("   ")).toBe("");
  });
});

describe("formatOrchWorkingStatus", () => {
  test("formats seconds, minutes, and hours", () => {
    expect(
      formatOrchWorkingStatus("2026-09-17T01:00:00.000Z", Date.parse("2026-09-17T01:00:48.000Z")),
    ).toBe("Working 48s");
    expect(
      formatOrchWorkingStatus("2026-09-17T01:00:00.000Z", Date.parse("2026-09-17T01:03:00.000Z")),
    ).toBe("Working 3m");
    expect(
      formatOrchWorkingStatus("2026-09-17T01:00:00.000Z", Date.parse("2026-09-17T03:00:00.000Z")),
    ).toBe("Working 2h");
  });
});

describe("mapConversationToOrchThreadRow", () => {
  const base = {
    id: "c1",
    title: "What do you remember about how I like reports?",
    lastMessagePreview: "I remember your report preferences: - **Report format:** `nH:nM:nS`",
    activeRunId: null as string | null,
    unread: false,
    lastMessageAt: "2026-09-17T01:00:00.000Z",
    toolPreset: "agent" as const,
  };

  test("maps idle agent rows to preset status and cleaned meta", () => {
    expect(mapConversationToOrchThreadRow(base, Date.parse("2026-09-17T01:00:12.000Z"))).toEqual({
      id: "c1",
      title: "What do you remember about how I like reports?",
      status: "Agent",
      statusKind: "idle",
      meta: "I remember your report preferences",
    });
  });

  test("maps running rows to Working elapsed", () => {
    expect(
      mapConversationToOrchThreadRow(
        { ...base, activeRunId: "run-1" },
        Date.parse("2026-09-17T01:00:48.000Z"),
      ),
    ).toMatchObject({
      status: "Working 48s",
      statusKind: "running",
    });
  });

  test("maps unread and settled states", () => {
    expect(mapConversationToOrchThreadRow({ ...base, unread: true }, 0)).toMatchObject({
      status: "Needs you",
      statusKind: "unread",
    });
    expect(mapConversationToOrchThreadRow(base, 0, true)).toMatchObject({
      status: "Settled",
      statusKind: "idle",
    });
  });

  test("omits meta when it duplicates the title", () => {
    expect(
      mapConversationToOrchThreadRow({ ...base, title: "Hello", lastMessagePreview: "Hello" }, 0)
        .meta,
    ).toBe("");
  });

  test("labels tool presets", () => {
    expect(formatOrchThreadPreset("ask")).toBe("Ask");
    expect(formatOrchThreadPreset("plan")).toBe("Plan");
    expect(formatOrchThreadPreset("agent")).toBe("Agent");
  });
});
