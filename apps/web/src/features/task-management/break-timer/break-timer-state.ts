export const BREAK_PRESET_SECONDS = {
  "10m": 10 * 60,
  "15m": 15 * 60,
  "30m": 30 * 60,
  "1h": 60 * 60,
} as const;

export type BreakPresetKey = keyof typeof BREAK_PRESET_SECONDS;

export const BREAK_CUSTOM_MIN_MINUTES = 1;
export const BREAK_CUSTOM_MAX_MINUTES = 180;

export const DEFAULT_BREAK_DURATION_SECONDS = BREAK_PRESET_SECONDS["15m"];

export type BreakTimerFields = {
  durationSeconds: number;
  startedAt: number | null;
  pausedAt: number | null;
  remainingSeconds: number;
};

export function createBreakTimerFields(
  durationSeconds: number = DEFAULT_BREAK_DURATION_SECONDS,
): BreakTimerFields {
  return {
    durationSeconds,
    startedAt: null,
    pausedAt: null,
    remainingSeconds: durationSeconds,
  };
}

export function isBreakRunning(fields: BreakTimerFields): boolean {
  return fields.startedAt != null && fields.pausedAt == null && fields.remainingSeconds > 0;
}

export function isBreakPaused(fields: BreakTimerFields): boolean {
  return fields.startedAt != null && fields.pausedAt != null;
}

export function isBreakComplete(fields: BreakTimerFields): boolean {
  return fields.remainingSeconds <= 0;
}

export function syncBreakRemaining(fields: BreakTimerFields, now = Date.now()): BreakTimerFields {
  if (fields.startedAt == null || fields.pausedAt != null) return fields;
  const elapsedMs = now - fields.startedAt;
  const remainingSeconds = Math.max(0, fields.durationSeconds - Math.floor(elapsedMs / 1000));
  return { ...fields, remainingSeconds };
}

export function startBreakTimer(fields: BreakTimerFields, now = Date.now()): BreakTimerFields {
  if (fields.remainingSeconds <= 0) {
    return {
      ...fields,
      startedAt: now,
      pausedAt: null,
      remainingSeconds: fields.durationSeconds,
    };
  }
  if (fields.pausedAt != null && fields.startedAt != null) {
    const pausedForMs = now - fields.pausedAt;
    return {
      ...fields,
      startedAt: fields.startedAt + pausedForMs,
      pausedAt: null,
    };
  }
  return {
    ...fields,
    startedAt: now,
    pausedAt: null,
    remainingSeconds: fields.durationSeconds,
  };
}

export function pauseBreakTimer(fields: BreakTimerFields, now = Date.now()): BreakTimerFields {
  const synced = syncBreakRemaining(fields, now);
  if (synced.startedAt == null || synced.pausedAt != null) return synced;
  return {
    ...synced,
    pausedAt: now,
    remainingSeconds: synced.remainingSeconds,
  };
}

export function resetBreakTimer(
  fields: BreakTimerFields,
  durationSeconds?: number,
): BreakTimerFields {
  const nextDuration = durationSeconds ?? fields.durationSeconds;
  return createBreakTimerFields(nextDuration);
}

export function setBreakDuration(fields: BreakTimerFields, durationSeconds: number): BreakTimerFields {
  if (fields.startedAt != null) return fields;
  return {
    ...fields,
    durationSeconds,
    remainingSeconds: durationSeconds,
  };
}

export function formatBreakCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function clampCustomBreakMinutes(minutes: number): number {
  return Math.min(BREAK_CUSTOM_MAX_MINUTES, Math.max(BREAK_CUSTOM_MIN_MINUTES, Math.round(minutes)));
}

export type ParseBreakDurationResult =
  | { ok: true; minutes: number }
  | { ok: false; reason: "empty" | "invalid" };

export function parseBreakDurationInput(raw: string): ParseBreakDurationResult {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized) return { ok: false, reason: "empty" };

  if (/^\d+$/.test(normalized)) {
    return { ok: true, minutes: clampCustomBreakMinutes(Number(normalized)) };
  }

  if (!/^(\d+h)?(\d+m?)?$/.test(normalized) || !/\d/.test(normalized)) {
    return { ok: false, reason: "invalid" };
  }

  let totalMinutes = 0;
  let index = 0;

  const hourMatch = normalized.slice(index).match(/^(\d+)h/);
  if (hourMatch) {
    totalMinutes += Number(hourMatch[1]) * 60;
    index += hourMatch[0].length;
  }

  const minuteMatch = normalized.slice(index).match(/^(\d+)m?$/);
  if (minuteMatch) {
    totalMinutes += Number(minuteMatch[1]);
    index += minuteMatch[0].length;
  }

  if (index !== normalized.length || totalMinutes === 0) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, minutes: clampCustomBreakMinutes(totalMinutes) };
}

export function formatBreakDurationMinutes(minutes: number): string {
  const clamped = clampCustomBreakMinutes(minutes);
  const hours = Math.floor(clamped / 60);
  const remainder = clamped % 60;
  if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`;
  if (hours > 0) return `${hours}h`;
  return `${remainder}m`;
}

export function sanitizeBreakDurationInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^0-9hm\s]/g, "")
    .replace(/\s+/g, " ");
}
