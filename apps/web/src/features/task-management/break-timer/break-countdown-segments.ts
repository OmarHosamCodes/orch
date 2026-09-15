import {
  BREAK_CUSTOM_MAX_MINUTES,
  BREAK_CUSTOM_MIN_MINUTES,
} from "@/features/task-management/break-timer/break-timer-state";

export type BreakCountdownSegmentIndex = 0 | 1;

const MINUTE_START = 0;
const SECOND_START = 4;

export function clampBreakTotalSeconds(totalSeconds: number): number {
  const minSeconds = BREAK_CUSTOM_MIN_MINUTES * 60;
  const maxSeconds = BREAK_CUSTOM_MAX_MINUTES * 60;
  return Math.min(maxSeconds, Math.max(minSeconds, Math.round(totalSeconds)));
}

/** Fixed-width MMM:SS for segment editing — colon at index 3. */
export function normalizeBreakCountdownShape(value: string): string {
  const [minutePart = "", secondPart = ""] = value.split(":");
  const minutes = minutePart.replace(/\D/g, "").slice(0, 3).padStart(3, "0");
  const seconds = secondPart.replace(/\D/g, "").padStart(2, "0").slice(-2);
  return `${minutes}:${seconds}`;
}

export function breakCountdownShapeToSeconds(value: string): number {
  const shape = normalizeBreakCountdownShape(value);
  const minutes = Number(shape.slice(0, 3));
  const seconds = Number(shape.slice(4, 6));
  return clampBreakTotalSeconds(minutes * 60 + seconds);
}

export function secondsToBreakCountdownShape(totalSeconds: number): string {
  const clamped = clampBreakTotalSeconds(totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(3, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function breakCountdownSegmentIndexFromCaret(caret: number): BreakCountdownSegmentIndex {
  return caret <= 3 ? 0 : 1;
}

export function breakCountdownSegmentSelection(segmentIndex: BreakCountdownSegmentIndex): {
  start: number;
  end: number;
} {
  if (segmentIndex === 0) return { start: MINUTE_START, end: 3 };
  return { start: SECOND_START, end: 6 };
}

export function moveBreakCountdownSegment(
  segmentIndex: BreakCountdownSegmentIndex,
  delta: -1 | 1,
): BreakCountdownSegmentIndex {
  return Math.max(0, Math.min(1, segmentIndex + delta)) as BreakCountdownSegmentIndex;
}

type BreakSegmentDigits = [string[], string[]];

function segmentDigits(value: string): BreakSegmentDigits {
  const shape = normalizeBreakCountdownShape(value);
  return [shape.slice(0, 3).split(""), shape.slice(4, 6).split("")];
}

function digitsToBreakCountdown(segments: BreakSegmentDigits): string {
  return `${segments[0].join("")}:${segments[1].join("")}`;
}

type BreakMinuteSlotIndex = 0 | 1 | 2;
type BreakSecondSlotIndex = 0 | 1;
export type BreakCountdownSlotIndex = BreakMinuteSlotIndex | BreakSecondSlotIndex;

export function applyBreakCountdownDigit(
  value: string,
  segmentIndex: BreakCountdownSegmentIndex,
  slotIndex: BreakCountdownSlotIndex,
  digit: string,
  resetSegment: boolean,
): {
  value: string;
  segmentIndex: BreakCountdownSegmentIndex;
  slotIndex: BreakCountdownSlotIndex;
  resetSegment: boolean;
} {
  const segments = segmentDigits(value);
  let nextSegment = segmentIndex;
  let nextSlot: BreakCountdownSlotIndex = slotIndex;
  let nextReset = false;

  if (segmentIndex === 0) {
    const minuteSlot = slotIndex as BreakMinuteSlotIndex;
    if (resetSegment) {
      segments[0][0] = digit;
      segments[0][1] = "0";
      segments[0][2] = "0";
      nextSlot = 1;
    } else {
      segments[0][minuteSlot] = digit;
      if (minuteSlot < 2) {
        nextSlot = (minuteSlot + 1) as BreakMinuteSlotIndex;
      } else {
        nextSlot = 0;
        nextSegment = 1;
      }
    }
  } else {
    const secondSlot = slotIndex as BreakSecondSlotIndex;
    if (resetSegment) {
      segments[1][0] = digit;
      segments[1][1] = "0";
      nextSlot = 1;
    } else {
      segments[1][secondSlot] = digit;
      if (secondSlot === 0) {
        nextSlot = 1;
      } else {
        nextSlot = 0;
        nextSegment = 0;
      }
    }
  }

  return {
    value: digitsToBreakCountdown(segments),
    segmentIndex: nextSegment,
    slotIndex: nextSlot,
    resetSegment: nextReset,
  };
}

export function applyBreakCountdownBackspace(
  value: string,
  segmentIndex: BreakCountdownSegmentIndex,
  slotIndex: BreakCountdownSlotIndex,
): {
  value: string;
  segmentIndex: BreakCountdownSegmentIndex;
  slotIndex: BreakCountdownSlotIndex;
  resetSegment: boolean;
} {
  const segments = segmentDigits(value);
  let nextSegment = segmentIndex;
  let nextSlot = slotIndex;

  if (segmentIndex === 0) {
    const minuteSlot = slotIndex as BreakMinuteSlotIndex;
    if (minuteSlot > 0) {
      segments[0][minuteSlot] = "0";
      nextSlot = (minuteSlot - 1) as BreakMinuteSlotIndex;
    } else {
      segments[0][0] = "0";
      nextSlot = 0;
    }
  } else {
    const secondSlot = slotIndex as BreakSecondSlotIndex;
    if (secondSlot === 1) {
      segments[1][1] = "0";
      nextSlot = 0;
    } else {
      segments[1][0] = "0";
      nextSegment = 0;
      nextSlot = 2;
    }
  }

  return {
    value: digitsToBreakCountdown(segments),
    segmentIndex: nextSegment,
    slotIndex: nextSlot,
    resetSegment: false,
  };
}

export function isBreakCountdownDigitKey(key: string): boolean {
  return key.length === 1 && key >= "0" && key <= "9";
}

export function breakCountdownSegmentNudgeSeconds(
  segmentIndex: BreakCountdownSegmentIndex,
  event: { key: string; shiftKey: boolean },
): number | null {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return null;
  const sign = event.key === "ArrowUp" ? 1 : -1;
  const unit = segmentIndex === 0 ? 60 : 1;
  const step = event.shiftKey ? unit * 5 : unit;
  return sign * step;
}

export function selectBreakCountdownSegmentInInput(
  input: HTMLInputElement,
  segmentIndex: BreakCountdownSegmentIndex,
  slotIndex: BreakCountdownSlotIndex,
  selectWholeSegment: boolean,
): void {
  const { start, end } = breakCountdownSegmentSelection(segmentIndex);
  if (selectWholeSegment) {
    input.setSelectionRange(start, end);
    return;
  }
  const caret = segmentIndex === 0 ? start + (slotIndex as BreakMinuteSlotIndex) : start + slotIndex;
  input.setSelectionRange(caret, caret);
}

/** Display minutes without leading zeros for the idle hero (NumberFlow parity). */
export function breakCountdownDisplayMinutes(totalSeconds: number): number {
  return Math.floor(clampBreakTotalSeconds(totalSeconds) / 60);
}

export function breakCountdownDisplaySeconds(totalSeconds: number): number {
  return clampBreakTotalSeconds(totalSeconds) % 60;
}

export function formatBreakCountdownDisplay(value: string): string {
  const shape = normalizeBreakCountdownShape(value);
  const minutes = Number(shape.slice(0, 3));
  const seconds = shape.slice(4, 6);
  return `${minutes}:${seconds}`;
}
