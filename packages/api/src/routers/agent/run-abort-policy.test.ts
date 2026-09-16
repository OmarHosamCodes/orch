import { describe, expect, test } from "bun:test";

import { createRunAbortRegistry } from "./run-service";

describe("run abort policy", () => {
  test("listener abort does not abort the OpenRouter controller", () => {
    const registry = createRunAbortRegistry();
    const openRouter = new AbortController();
    registry.attach("agent-run-1", openRouter);
    const listener = new AbortController();
    listener.abort();
    expect(openRouter.signal.aborted).toBe(false);
    expect(registry.has("agent-run-1")).toBe(true);
  });

  test("cancelRun aborts the OpenRouter controller", () => {
    const registry = createRunAbortRegistry();
    const openRouter = new AbortController();
    registry.attach("agent-run-1", openRouter);
    registry.abort("agent-run-1");
    expect(openRouter.signal.aborted).toBe(true);
    expect(registry.has("agent-run-1")).toBe(false);
  });
});
