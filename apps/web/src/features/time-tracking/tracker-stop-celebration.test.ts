import { beforeEach, describe, expect, test } from "bun:test";

import {
  celebrationBurstForDuration,
  isTrackerStopCelebrationEnabled,
  originFromStopButtonElement,
  resolveStopCelebrationBurst,
} from "./tracker-stop-celebration";

function installWindowStub() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
  const stub = { innerWidth: 1280, innerHeight: 800, localStorage };
  const current = globalThis.window;
  if (current) {
    Object.defineProperties(current, {
      innerWidth: { configurable: true, enumerable: true, writable: true, value: 1280 },
      innerHeight: { configurable: true, enumerable: true, writable: true, value: 800 },
      localStorage: { configurable: true, enumerable: true, value: localStorage },
    });
  } else {
    Object.defineProperty(globalThis, "window", { configurable: true, value: stub });
  }
  return store;
}

describe("originFromStopButtonElement", () => {
  test("maps button center to normalized viewport origin", () => {
    installWindowStub();
    const origin = originFromStopButtonElement({
      getBoundingClientRect: () => ({ left: 100, top: 50, width: 76, height: 36 }),
    } as Element);
    expect(origin?.x).toBeCloseTo((100 + 76 / 2) / 1280);
    expect(origin?.y).toBeCloseTo((50 + 36 / 2) / 800);
  });

  test("returns undefined for non-elements", () => {
    installWindowStub();
    expect(originFromStopButtonElement(null)).toBeUndefined();
    expect(originFromStopButtonElement(undefined)).toBeUndefined();
    expect(originFromStopButtonElement({})).toBeUndefined();
  });
});

describe("isTrackerStopCelebrationEnabled", () => {
  beforeEach(() => {
    installWindowStub();
  });

  test("defaults on when no key is stored", () => {
    expect(isTrackerStopCelebrationEnabled()).toBe(true);
  });

  test("reads the stored toggle", () => {
    window.localStorage.setItem("orch.agency.tracker-stop-celebration.v1", "0");
    expect(isTrackerStopCelebrationEnabled()).toBe(false);
    window.localStorage.setItem("orch.agency.tracker-stop-celebration.v1", "1");
    expect(isTrackerStopCelebrationEnabled()).toBe(true);
  });
});

describe("celebrationBurstForDuration", () => {
  test("suppresses sub-minute sessions and bad clocks", () => {
    expect(celebrationBurstForDuration(30)).toBeNull();
    expect(celebrationBurstForDuration(0)).toBeNull();
    expect(celebrationBurstForDuration(Number.NaN)).toBeNull();
  });

  test("scales the burst with session length", () => {
    expect(celebrationBurstForDuration(120)).toEqual({ particleCount: 20, ticks: 90 });
    expect(celebrationBurstForDuration(1800)).toEqual({ particleCount: 48, ticks: 120 });
    expect(celebrationBurstForDuration(5400)).toEqual({ particleCount: 90, ticks: 150 });
  });
});

describe("resolveStopCelebrationBurst", () => {
  const base = { durationSeconds: 1800, taskTitle: "Deep work", projectName: "Website" };

  test("celebrates ordinary sessions", () => {
    expect(resolveStopCelebrationBurst(base)).toEqual({ particleCount: 48, ticks: 120 });
  });

  test("never celebrates waste", () => {
    expect(resolveStopCelebrationBurst({ ...base, taskIsWaste: true })).toBeNull();
    expect(
      resolveStopCelebrationBurst({ ...base, taskTitle: "waste: context switching" }),
    ).toBeNull();
    expect(resolveStopCelebrationBurst({ ...base, projectName: "Waste audit" })).toBeNull();
  });

  test("stays quiet on trivial sessions", () => {
    expect(resolveStopCelebrationBurst({ ...base, durationSeconds: 12 })).toBeNull();
  });
});
