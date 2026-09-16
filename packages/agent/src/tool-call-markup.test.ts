import { describe, expect, test } from "bun:test";

import {
  createLeakedToolMarkupFilter,
  extractLeakedToolCallNames,
  finalizeAssistantResponseText,
  isIncompleteToolPreamble,
  stripLeakedToolCallMarkup,
} from "./tool-call-markup";

describe("stripLeakedToolCallMarkup", () => {
  test("removes openrouter-style tool markup", () => {
    expect(
      stripLeakedToolCallMarkup(
        "<|tool_call_start|>[get_agency_reports_summary()]<|tool_call_end|>",
      ),
    ).toBe("");
  });

  test("keeps surrounding prose", () => {
    expect(
      stripLeakedToolCallMarkup(
        "I'll check reports.\n<|tool_call_start|>[get_agency_reports_summary()]<|tool_call_end|>\nDone.",
      ),
    ).toBe("I'll check reports.\n\nDone.");
  });

  test("removes OpenRouter calling and tool-result dumps", () => {
    expect(
      stripLeakedToolCallMarkup(
        [
          "I'll gather your profile data for August 2026 from multiple sources in parallel.",
          "[Calling get_agency_time_summary... call_id: '53820608-8679-4613-b31d-86a1229d1a64'] [Calling list_member_profile_alerts... call_id: '45866181-b6e1-4f8a-8854-8bb111c46865']",
          "[Tool result call_53820608] {'result': {'ok': true, 'data': {'member_id': 'mem-001', 'waste_hours': 23.5}}}",
          "[Tool result call_45866181] {'result': {'ok': true, 'data': [{'alert_id': 'alert-101'}]}}",
        ].join("\n"),
      ),
    ).toBe("I'll gather your profile data for August 2026 from multiple sources in parallel.");
  });

  test("keeps ordinary bracket notes", () => {
    expect(stripLeakedToolCallMarkup("See [note] before approving.")).toBe(
      "See [note] before approving.",
    );
  });
});

describe("extractLeakedToolCallNames", () => {
  test("reads the tool name from leaked markup", () => {
    expect(
      extractLeakedToolCallNames(
        "<|tool_call_start|>[get_agency_reports_summary()]<|tool_call_end|>",
      ),
    ).toEqual(["get_agency_reports_summary"]);
  });

  test("reads names from Calling dumps", () => {
    expect(
      extractLeakedToolCallNames(
        "[Calling get_agency_time_summary... call_id: '1'] [Calling list_member_profile_alerts... call_id: '2']",
      ),
    ).toEqual(["get_agency_time_summary", "list_member_profile_alerts"]);
  });
});

describe("createLeakedToolMarkupFilter", () => {
  test("holds a split open tag then drops the completed call", () => {
    const filter = createLeakedToolMarkupFilter();
    expect(filter.push("Hello ")).toBe("Hello ");
    expect(filter.push("<|tool_call_st")).toBe("");
    expect(filter.push("art|>[get_agency_reports_summary()]<|tool_call_end|> later")).toBe(
      " later",
    );
    expect(filter.flush()).toBe("");
  });

  test("drops split Calling and Tool result dumps", () => {
    const filter = createLeakedToolMarkupFilter();
    expect(filter.push("I'll gather.\n[Calling get_agency_time_sum")).toBe("I'll gather.\n");
    expect(filter.push("mary... call_id: '53820608'] later")).toBe(" later");
    expect(filter.push("\n[Tool result call_53820608] {'result': {'ok': true}}")).toBe("\n");
    expect(filter.flush()).toBe("");
  });
});

describe("finalizeAssistantResponseText", () => {
  test("does not fake a failure when leaked tool markup was the only text", () => {
    expect(
      finalizeAssistantResponseText({
        responseText: "<|tool_call_start|>[get_agency_reports_summary()]<|tool_call_end|>",
        stopped: false,
        toolCount: 0,
      }),
    ).toBe("");
  });

  test("keeps a stopped note when the user cancelled", () => {
    expect(
      finalizeAssistantResponseText({
        responseText: "",
        stopped: true,
        toolCount: 0,
      }),
    ).toBe("Stopped before a reply.");
  });

  test("does not treat a genuine empty completion as a stop", () => {
    expect(
      finalizeAssistantResponseText({
        responseText: "",
        stopped: false,
        toolCount: 0,
      }),
    ).toBe("I couldn't generate a response.");
  });

  test("keeps narration and drops Calling dumps", () => {
    expect(
      finalizeAssistantResponseText({
        responseText:
          "I'll gather your profile data.\n[Calling get_agency_time_summary... call_id: '1']",
        stopped: false,
        toolCount: 1,
      }),
    ).toBe("I'll gather your profile data.");
  });
});

describe("isIncompleteToolPreamble", () => {
  test("treats a gather-only line as unfinished", () => {
    expect(
      isIncompleteToolPreamble(
        "I'll gather your profile data for August 2026 from multiple sources in parallel.",
      ),
    ).toBe(true);
  });

  test("treats empty stripped markup as unfinished", () => {
    expect(
      isIncompleteToolPreamble(
        "[Calling get_agency_time_summary... call_id: '1'] [Tool result call_1] {'ok': true}",
      ),
    ).toBe(true);
  });

  test("keeps a short answer that already has figures", () => {
    expect(
      isIncompleteToolPreamble("August tracked 142 hours with 23.5h waste. Attendance was 87%."),
    ).toBe(false);
  });
});
