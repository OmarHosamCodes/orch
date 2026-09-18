import { describe, expect, test } from "bun:test";

import { buildCanvasScopedPatchNote } from "./canvas-scope-instructions";

describe("buildCanvasScopedPatchNote", () => {
  test("tells the model to patch the scoped node", () => {
    const note = buildCanvasScopedPatchNote({
      scopeNodes: [{ id: "node-1", title: "Launch" }],
    });
    expect(note).toContain("node-1");
    expect(note).toContain("Launch");
    expect(note).toContain("node.update");
    expect(note).toContain("Do not create a new node unless the user explicitly asks for one.");
  });

  test("is empty when nothing is scoped", () => {
    expect(buildCanvasScopedPatchNote({ scopeNodes: [] })).toBe("");
  });
});
