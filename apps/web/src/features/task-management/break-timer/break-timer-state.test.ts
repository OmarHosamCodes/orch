import { describe, expect, test } from "bun:test";

import {
  createBreakTimerFields,
  formatBreakCountdown,
  formatBreakDurationMinutes,
  parseBreakDurationInput,
  pauseBreakTimer,
  resetBreakTimer,
  sanitizeBreakDurationInput,
  setBreakDuration,
  startBreakTimer,
  syncBreakRemaining,
} from "./break-timer-state";

describe("break-timer-state", () => {
  test("start pause and sync countdown", () => {
    const base = createBreakTimerFields(60);
    const started = startBreakTimer(base, 1_000);
    expect(started.startedAt).toBe(1_000);
    expect(started.remainingSeconds).toBe(60);

    const mid = syncBreakRemaining(started, 31_000);
    expect(mid.remainingSeconds).toBe(30);

    const paused = pauseBreakTimer(mid, 31_000);
    expect(paused.pausedAt).toBe(31_000);
    expect(paused.remainingSeconds).toBe(30);

    const resumed = startBreakTimer(paused, 41_000);
    expect(resumed.pausedAt).toBeNull();
    expect(resumed.startedAt).toBe(11_000);
  });

  test("set duration only before start", () => {
    const base = createBreakTimerFields(900);
    expect(setBreakDuration(base, 600).durationSeconds).toBe(600);
    const running = startBreakTimer(base, 0);
    expect(setBreakDuration(running, 600).durationSeconds).toBe(900);
  });

  test("reset restores idle timer", () => {
    const running = startBreakTimer(createBreakTimerFields(120), 0);
    const reset = resetBreakTimer(running, 300);
    expect(reset.startedAt).toBeNull();
    expect(reset.remainingSeconds).toBe(300);
  });

  test("formatBreakCountdown", () => {
    expect(formatBreakCountdown(125)).toBe("02:05");
    expect(formatBreakCountdown(0)).toBe("00:00");
  });

  test("parseBreakDurationInput accepts h/m tokens and plain minutes", () => {
    expect(parseBreakDurationInput("10m")).toEqual({ ok: true, minutes: 10 });
    expect(parseBreakDurationInput("1h 3m")).toEqual({ ok: true, minutes: 63 });
    expect(parseBreakDurationInput("1h3m")).toEqual({ ok: true, minutes: 63 });
    expect(parseBreakDurationInput("1h")).toEqual({ ok: true, minutes: 60 });
    expect(parseBreakDurationInput("90")).toEqual({ ok: true, minutes: 90 });
    expect(parseBreakDurationInput("2h")).toEqual({ ok: true, minutes: 120 });
    expect(parseBreakDurationInput("bad")).toEqual({ ok: false, reason: "invalid" });
  });

  test("formatBreakDurationMinutes", () => {
    expect(formatBreakDurationMinutes(63)).toBe("1h 3m");
    expect(formatBreakDurationMinutes(60)).toBe("1h");
    expect(formatBreakDurationMinutes(15)).toBe("15m");
  });

  test("sanitizeBreakDurationInput", () => {
    expect(sanitizeBreakDurationInput("1H 3M!")).toBe("1h 3m");
  });
});
