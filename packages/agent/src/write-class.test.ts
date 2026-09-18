import { describe, expect, test } from "bun:test";

import { classifyAgentWrite } from "./write-class";

describe("classifyAgentWrite", () => {
  test("agency data writes confirm", () => {
    expect(classifyAgentWrite({ domain: "agency" })).toBe("confirm");
  });

  test("canvas knowledge memory and nav apply immediately", () => {
    expect(classifyAgentWrite({ domain: "canvas" })).toBe("immediate");
    expect(classifyAgentWrite({ domain: "knowledge" })).toBe("immediate");
    expect(classifyAgentWrite({ domain: "memory" })).toBe("immediate");
    expect(classifyAgentWrite({ domain: "nav" })).toBe("immediate");
  });
});
