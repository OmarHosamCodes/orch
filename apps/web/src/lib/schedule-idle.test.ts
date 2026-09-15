import { describe, expect, test } from "bun:test";

import { scheduleIdle } from "./schedule-idle";

describe("scheduleIdle", () => {
  test("returns a no-op cancel when window is undefined", () => {
    const cancel = scheduleIdle(() => {
      throw new Error("must not run");
    });
    expect(typeof cancel).toBe("function");
    cancel();
  });

  test("uses requestIdleCallback with a timeout so FX is not delayed indefinitely", () => {
    const optionsSeen: IdleRequestOptions[] = [];
    const originalWindow = globalThis.window;
    const idleWindow = {
      requestIdleCallback: (_cb: IdleRequestCallback, options?: IdleRequestOptions) => {
        if (options) optionsSeen.push(options);
        return 7;
      },
      cancelIdleCallback: () => undefined,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: idleWindow,
    });

    const cancel = scheduleIdle(() => undefined);
    cancel();
    expect(optionsSeen).toEqual([{ timeout: 250 }]);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  });

  test("uses requestIdleCallback when present and cancel stops the callback", () => {
    const handles: number[] = [];
    const cancelled: number[] = [];
    const originalWindow = globalThis.window;
    const idleWindow = {
      requestIdleCallback: (cb: IdleRequestCallback) => {
        const id = 7;
        handles.push(id);
        queueMicrotask(() =>
          cb({ didTimeout: false, timeRemaining: () => 10 } as IdleDeadline),
        );
        return id;
      },
      cancelIdleCallback: (id: number) => {
        cancelled.push(id);
      },
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: idleWindow,
    });

    let ran = 0;
    const cancel = scheduleIdle(() => {
      ran += 1;
    });
    cancel();
    expect(handles).toEqual([7]);
    expect(cancelled).toEqual([7]);
    expect(ran).toBe(0);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  });
});
