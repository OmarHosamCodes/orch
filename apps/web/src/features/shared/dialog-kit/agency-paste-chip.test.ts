import { describe, expect, test } from "bun:test";

import {
  extractPastedUrls,
  pasteChipHostHue,
  pasteChipHostHueId,
  pasteChipHostLabel,
} from "./agency-paste-chip";

describe("extractPastedUrls", () => {
  test("pulls http urls from a blob of text", () => {
    expect(extractPastedUrls("see https://linear.app/issue/ABC and http://example.com/x.")).toEqual(
      ["https://linear.app/issue/ABC", "http://example.com/x"],
    );
  });

  test("promotes a bare host to https", () => {
    expect(extractPastedUrls("github.com/orch/brainiac")).toEqual([
      "https://github.com/orch/brainiac",
    ]);
  });

  test("returns empty for plain sentences", () => {
    expect(extractPastedUrls("not a link")).toEqual([]);
  });
});

describe("pasteChipHostLabel", () => {
  test("strips www", () => {
    expect(pasteChipHostLabel("https://www.notion.so/page")).toBe("notion.so");
  });
});

describe("pasteChipHostHueId", () => {
  test("maps known hosts to palette slots", () => {
    expect(pasteChipHostHueId("linear.app")).toBe(1);
    expect(pasteChipHostHueId("github.com")).toBe(12);
    expect(pasteChipHostHueId("www.notion.so")).toBe(2);
    expect(pasteChipHostHueId("figma.com")).toBe(10);
  });

  test("returns null for unknown hosts", () => {
    expect(pasteChipHostHueId("example.com")).toBeNull();
  });
});

describe("pasteChipHostHue", () => {
  test("returns host and hue id together", () => {
    expect(pasteChipHostHue("linear.app")).toEqual({ host: "linear.app", hueId: 1 });
    expect(pasteChipHostHue("unknown.dev")).toEqual({ host: "unknown.dev", hueId: null });
  });
});
