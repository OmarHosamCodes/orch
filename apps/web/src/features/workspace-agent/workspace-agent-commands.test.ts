import { describe, expect, test } from "bun:test";

import {
  getOrchSlashCommandSuggestions,
  parseSubmittedSlashCommand,
} from "./workspace-agent-commands";

describe("workspace-agent-commands", () => {
  test("parses a submitted slash verb and ignores @ nouns", () => {
    expect(parseSubmittedSlashCommand("/new")).toBe("new");
    expect(parseSubmittedSlashCommand("/settle")).toBe("settle");
    expect(parseSubmittedSlashCommand("/task")).toBe("task");
    expect(parseSubmittedSlashCommand("/new please")).toBeNull();
    expect(parseSubmittedSlashCommand("@task")).toBeNull();
  });

  test("slash suggestions match verb prefixes", () => {
    expect(getOrchSlashCommandSuggestions("se").map((item) => item.verb)).toEqual(["settle"]);
    expect(getOrchSlashCommandSuggestions("").map((item) => item.verb)).toContain("memory");
  });
});
