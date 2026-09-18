/** Team work-schedule helpers. weekStartsOn uses JS getDay(): 0=Sun … 6=Sat. */

import { addDaysToDateKey } from "../time-tracking/local-week-bounds";

export type WorkSchedule = {
  requiredDailyHours: number;
  weekStartsOn: number;
  weekendDurationDays: number;
};

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  requiredDailyHours: 8,
  weekStartsOn: 1,
  weekendDurationDays: 2,
};

export function resolveWorkSchedule(
  partial: Partial<WorkSchedule> | null | undefined,
): WorkSchedule {
  return {
    requiredDailyHours: partial?.requiredDailyHours ?? DEFAULT_WORK_SCHEDULE.requiredDailyHours,
    weekStartsOn: partial?.weekStartsOn ?? DEFAULT_WORK_SCHEDULE.weekStartsOn,
    weekendDurationDays: partial?.weekendDurationDays ?? DEFAULT_WORK_SCHEDULE.weekendDurationDays,
  };
}

/** Offset of `dayOfWeek` from week start (0 = first day of team week). */
export function offsetFromWeekStart(dayOfWeek: number, weekStartsOn: number): number {
  return (dayOfWeek - weekStartsOn + 7) % 7;
}

export function getWeekStartKey(dateKey: string, weekStartsOn: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  const diff = offsetFromWeekStart(date.getUTCDay(), weekStartsOn);
  date.setUTCDate(date.getUTCDate() - diff);
  const weekYear = date.getUTCFullYear();
  const weekMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const weekDay = String(date.getUTCDate()).padStart(2, "0");
  return `${weekYear}-${weekMonth}-${weekDay}`;
}

/** Weekend = last `weekendDurationDays` days of the team week. */
export function isWeekendDateKey(
  dateKey: string,
  weekStartsOn: number,
  weekendDurationDays: number,
): boolean {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  const offset = offsetFromWeekStart(date.getUTCDay(), weekStartsOn);
  return offset >= 7 - weekendDurationDays;
}

/** Rotate a Mon-first label array so index 0 is the team week start. */
export function rotateWeekdayLabels<T>(labelsMonFirst: readonly T[], weekStartsOn: number): T[] {
  const monFirstIndex = weekStartsOn === 0 ? 6 : weekStartsOn - 1;
  return [...labelsMonFirst.slice(monFirstIndex), ...labelsMonFirst.slice(0, monFirstIndex)];
}

export function standardWeekHours(requiredDailyHours: number, weekendDurationDays: number): number {
  return requiredDailyHours * (7 - weekendDurationDays);
}

export function standardWeekCapacitySeconds(
  requiredDailyHours: number,
  weekendDurationDays: number,
): number {
  return standardWeekHours(requiredDailyHours, weekendDurationDays) * 3600;
}

/** UTC calendar date snapped to the team's week start. */
export function startOfWeekUtc(date: Date, weekStartsOn: number): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diff = offsetFromWeekStart(d.getUTCDay(), weekStartsOn);
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

/** Leading empty cells before the 1st of the month in a weekStartsOn-aligned grid. */
export function monthGridPad(utcDayOfWeek: number, weekStartsOn: number): number {
  return offsetFromWeekStart(utcDayOfWeek, weekStartsOn);
}

function isWeekdayDateKey(
  dateKey: string,
  weekStartsOn: number,
  weekendDurationDays: number,
): boolean {
  return !isWeekendDateKey(dateKey, weekStartsOn, weekendDurationDays);
}

function iterateDateKeys(fromKey: string, toKey: string): string[] {
  const keys: string[] = [];
  let cursor = fromKey;
  while (cursor <= toKey) {
    keys.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }
  return keys;
}

/** Non-weekend days in an inclusive YYYY-MM-DD range. */
export function countWeekdaysInRange(
  fromKey: string,
  toKey: string,
  schedule: Pick<WorkSchedule, "weekStartsOn" | "weekendDurationDays">,
): number {
  let count = 0;
  for (const dateKey of iterateDateKeys(fromKey, toKey)) {
    if (isWeekdayDateKey(dateKey, schedule.weekStartsOn, schedule.weekendDurationDays)) {
      count += 1;
    }
  }
  return count;
}

/** Weekday off days (any recorded leave) in an inclusive range. */
export function countOffDaysOnWeekdaysInRange(
  fromKey: string,
  toKey: string,
  schedule: Pick<WorkSchedule, "weekStartsOn" | "weekendDurationDays">,
  offDayKeys: ReadonlySet<string>,
): number {
  let count = 0;
  for (const dateKey of iterateDateKeys(fromKey, toKey)) {
    if (
      isWeekdayDateKey(dateKey, schedule.weekStartsOn, schedule.weekendDurationDays) &&
      offDayKeys.has(dateKey)
    ) {
      count += 1;
    }
  }
  return count;
}

/** Weekdays minus weekday off days in an inclusive range. */
export function countWorkingDaysInRange(
  fromKey: string,
  toKey: string,
  schedule: Pick<WorkSchedule, "weekStartsOn" | "weekendDurationDays">,
  offDayKeys: ReadonlySet<string>,
): number {
  return (
    countWeekdaysInRange(fromKey, toKey, schedule) -
    countOffDaysOnWeekdaysInRange(fromKey, toKey, schedule, offDayKeys)
  );
}

export function computeAdjustedExpectations(input: {
  weekdaysInRange: number;
  offDaysOnWeekdays: number;
  baseMinHours: number;
  requiredDailyHours: number;
  offDayReduceHours: number;
}): { adjustedMinHours: number; adjustedTargetHours: number } {
  const reduction = input.offDaysOnWeekdays * input.offDayReduceHours;
  return {
    adjustedMinHours: Math.max(0, input.baseMinHours - reduction),
    adjustedTargetHours: Math.max(0, input.weekdaysInRange * input.requiredDailyHours - reduction),
  };
}

export type PeriodPaceProjection = {
  startKey: string;
  endKey: string;
  elapsedEndKey: string;
  monthWorkingDays: number;
  elapsedWorkingDays: number;
  remainingWorkingDays: number;
  loggedHours: number;
  projectedHours: number;
  monthMinHours: number;
  monthTargetHours: number;
  offDaysInMonth: number;
};

export function projectPeriodPace(input: {
  startKey: string;
  endKey: string;
  todayKey: string;
  daySeconds: ReadonlyArray<{ dateKey: string; totalSeconds: number }>;
  schedule: Pick<WorkSchedule, "weekStartsOn" | "weekendDurationDays" | "requiredDailyHours">;
  baseMinHours: number;
  offDayReduceHours: number;
  offDayKeys: ReadonlySet<string>;
}): PeriodPaceProjection | null {
  const elapsedEndKey = input.todayKey < input.endKey ? input.todayKey : input.endKey;
  const monthWorkingDays = countWorkingDaysInRange(
    input.startKey,
    input.endKey,
    input.schedule,
    input.offDayKeys,
  );
  const elapsedWorkingDays = countWorkingDaysInRange(
    input.startKey,
    elapsedEndKey,
    input.schedule,
    input.offDayKeys,
  );
  if (monthWorkingDays <= 0 || elapsedWorkingDays <= 0) return null;

  const remainingStartKey =
    input.todayKey >= input.endKey ? input.endKey : addDaysToDateKey(input.todayKey, 1);
  const remainingWorkingDays =
    input.todayKey >= input.endKey
      ? 0
      : countWorkingDaysInRange(remainingStartKey, input.endKey, input.schedule, input.offDayKeys);

  let loggedSeconds = 0;
  for (const day of input.daySeconds) {
    if (day.dateKey < input.startKey || day.dateKey > elapsedEndKey) continue;
    loggedSeconds += day.totalSeconds;
  }
  const loggedHours = loggedSeconds / 3600;
  const pacePerDay = loggedHours / elapsedWorkingDays;
  const projectedHours = pacePerDay * monthWorkingDays;

  const weekdaysInMonth = countWeekdaysInRange(input.startKey, input.endKey, input.schedule);
  const offDaysInMonth = countOffDaysOnWeekdaysInRange(
    input.startKey,
    input.endKey,
    input.schedule,
    input.offDayKeys,
  );
  const { adjustedMinHours: monthMinHours, adjustedTargetHours: monthTargetHours } =
    computeAdjustedExpectations({
      weekdaysInRange: weekdaysInMonth,
      offDaysOnWeekdays: offDaysInMonth,
      baseMinHours: input.baseMinHours,
      requiredDailyHours: input.schedule.requiredDailyHours,
      offDayReduceHours: input.offDayReduceHours,
    });

  return {
    startKey: input.startKey,
    endKey: input.endKey,
    elapsedEndKey,
    monthWorkingDays,
    elapsedWorkingDays,
    remainingWorkingDays,
    loggedHours,
    projectedHours,
    monthMinHours,
    monthTargetHours,
    offDaysInMonth,
  };
}
