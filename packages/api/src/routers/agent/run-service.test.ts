import { describe, expect, test } from "bun:test";

import { createTokenCoalescer } from "./run-service";

describe("createTokenCoalescer", () => {
  test("coalesces tokens until 32 chars", async () => {
    const flushed: string[] = [];
    const coalescer = createTokenCoalescer({
      flushMs: 60_000,
      flushChars: 32,
      onFlush: async (delta) => {
        flushed.push(delta);
      },
    });
    coalescer.push("hello ");
    coalescer.push("world");
    expect(flushed).toEqual([]);
    coalescer.push(" and a longer piece of text");
    await Promise.resolve();
    expect(flushed.join("")).toContain("hello world");
    await coalescer.flush();
  });

  test("flush emits leftover buffer", async () => {
    const flushed: string[] = [];
    const coalescer = createTokenCoalescer({
      flushMs: 60_000,
      flushChars: 32,
      onFlush: async (delta) => {
        flushed.push(delta);
      },
    });
    coalescer.push("short");
    expect(flushed).toEqual([]);
    await coalescer.flush();
    expect(flushed).toEqual(["short"]);
  });
});
