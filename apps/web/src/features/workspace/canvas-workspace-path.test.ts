import { describe, expect, test } from "bun:test";

import {
  canvasWorkspaceHref,
  canvasWorkspaceIdFromPath,
  orchCanvasWorkspaceIdFromPath,
} from "@/features/workspace/canvas-workspace-path";

describe("canvas workspace path", () => {
  test("builds and parses brain hrefs", () => {
    expect(canvasWorkspaceHref("cws-1")).toBe("/canvas/cws-1");
    expect(canvasWorkspaceIdFromPath("/canvas")).toBeNull();
    expect(canvasWorkspaceIdFromPath("/canvas/cws-1")).toBe("cws-1");
    expect(canvasWorkspaceIdFromPath("/agency")).toBeNull();
  });

  test("scopes Orch to CNS on /canvas and a brain on /canvas/:id", () => {
    expect(orchCanvasWorkspaceIdFromPath("/canvas")).toBeNull();
    expect(orchCanvasWorkspaceIdFromPath("/canvas/cws-1")).toBe("cws-1");
    expect(orchCanvasWorkspaceIdFromPath("/agency")).toBeUndefined();
    expect(orchCanvasWorkspaceIdFromPath("/node/n1")).toBeUndefined();
  });
});
