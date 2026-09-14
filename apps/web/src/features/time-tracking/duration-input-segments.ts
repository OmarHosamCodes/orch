export type DurationSegmentIndex = 0 | 1 | 2;

const SEGMENT_STARTS: readonly [number, number, number] = [0, 3, 6];

/** Fixed-width HH:MM:SS for segment editing — colons always at 2 and 5. */
export function normalizeDurationShape(value: string): string {
  const parts = value.trim().split(":");
  const digits = (index: number) =>
    (parts[index] ?? "").replace(/\D/g, "").padStart(2, "0").slice(-2);
  return `${digits(0)}:${digits(1)}:${digits(2)}`;
}

export function segmentIndexFromCaret(caret: number): DurationSegmentIndex {
  if (caret <= 2) return 0;
  if (caret <= 5) return 1;
  return 2;
}

export function durationSegmentSelection(segmentIndex: DurationSegmentIndex): {
  start: number;
  end: number;
} {
  const start = SEGMENT_STARTS[segmentIndex];
  return { start, end: start + 2 };
}

export function moveDurationSegment(
  segmentIndex: DurationSegmentIndex,
  delta: -1 | 1,
): DurationSegmentIndex {
  return Math.max(0, Math.min(2, segmentIndex + delta)) as DurationSegmentIndex;
}

function segmentDigits(value: string): [string[], string[], string[]] {
  const shape = normalizeDurationShape(value);
  return [shape.slice(0, 2).split(""), shape.slice(3, 5).split(""), shape.slice(6, 8).split("")];
}

function digitsToDuration(segments: [string[], string[], string[]]): string {
  return `${segments[0].join("")}:${segments[1].join("")}:${segments[2].join("")}`;
}

export function applyDurationDigit(
  value: string,
  segmentIndex: DurationSegmentIndex,
  slotIndex: 0 | 1,
  digit: string,
  resetSegment: boolean,
): {
  value: string;
  segmentIndex: DurationSegmentIndex;
  slotIndex: 0 | 1;
  resetSegment: boolean;
} {
  const segments = segmentDigits(value);
  let nextSegment = segmentIndex;
  let nextSlot: 0 | 1 = slotIndex;
  let nextReset = false;

  if (resetSegment) {
    segments[segmentIndex][0] = digit;
    segments[segmentIndex][1] = "0";
    nextSlot = 1;
  } else {
    segments[segmentIndex][slotIndex] = digit;
    if (slotIndex === 0) {
      nextSlot = 1;
    } else {
      nextSlot = 0;
      nextSegment = moveDurationSegment(segmentIndex, 1);
    }
  }

  return {
    value: digitsToDuration(segments),
    segmentIndex: nextSegment,
    slotIndex: nextSlot,
    resetSegment: nextReset,
  };
}

export function applyDurationBackspace(
  value: string,
  segmentIndex: DurationSegmentIndex,
  slotIndex: 0 | 1,
): {
  value: string;
  segmentIndex: DurationSegmentIndex;
  slotIndex: 0 | 1;
  resetSegment: boolean;
} {
  const segments = segmentDigits(value);
  let nextSegment = segmentIndex;
  let nextSlot = slotIndex;

  if (slotIndex === 1) {
    segments[segmentIndex][1] = "0";
    nextSlot = 0;
  } else {
    segments[segmentIndex][0] = "0";
    if (segmentIndex > 0) {
      nextSegment = moveDurationSegment(segmentIndex, -1);
      nextSlot = 1;
    } else {
      nextSlot = 0;
    }
  }

  return {
    value: digitsToDuration(segments),
    segmentIndex: nextSegment,
    slotIndex: nextSlot,
    resetSegment: false,
  };
}

export function isDurationDigitKey(key: string): boolean {
  return key.length === 1 && key >= "0" && key <= "9";
}

/** ↑/↓ step in total seconds for the focused HH / MM / SS segment. */
export function durationSegmentNudgeSeconds(
  segmentIndex: DurationSegmentIndex,
  event: { key: string; shiftKey: boolean },
): number | null {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return null;
  const sign = event.key === "ArrowUp" ? 1 : -1;
  let unit: number;
  switch (segmentIndex) {
    case 0:
      unit = 3_600;
      break;
    case 1:
      unit = 60;
      break;
    case 2:
      unit = 1;
      break;
    default: {
      const _exhaustive: never = segmentIndex;
      return _exhaustive;
    }
  }
  const step = event.shiftKey ? (segmentIndex === 2 ? 60 : unit * 5) : unit;
  return sign * step;
}

export function selectDurationSegmentInInput(
  input: HTMLInputElement,
  segmentIndex: DurationSegmentIndex,
  slotIndex: 0 | 1,
  selectWholeSegment: boolean,
): void {
  const { start, end } = durationSegmentSelection(segmentIndex);
  if (selectWholeSegment) {
    input.setSelectionRange(start, end);
    return;
  }
  const caret = start + slotIndex;
  input.setSelectionRange(caret, caret);
}
