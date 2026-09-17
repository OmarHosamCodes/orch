import { DEFAULT_WORK_SCHEDULE, getWeekStartKey } from "../resourcing/work-schedule";

/** Local calendar date (YYYY-MM-DD) for an instant using JS getTimezoneOffset() semantics. */
export function localDateKeyFromInstant(instant: Date, utcOffsetMinutes: number): string {
  const localMs = instant.getTime() - utcOffsetMinutes * 60_000;
  const local = new Date(localMs);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + days));
  const nextYear = next.getUTCFullYear();
  const nextMonth = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(next.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function getLocalWeekStartKeyFromDateKey(
  dateKey: string,
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
): string {
  return getWeekStartKey(dateKey, weekStartsOn);
}

export function applyDailyDurationTotals(
  summaries: Map<string, { daily: Map<string, number>; totalSeconds: number }>,
  rows: Array<{ dateKey: string; totalSeconds: number }>,
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
): void {
  for (const row of rows) {
    const summary = summaries.get(getLocalWeekStartKeyFromDateKey(row.dateKey, weekStartsOn));
    if (!summary) continue;
    summary.daily.set(row.dateKey, (summary.daily.get(row.dateKey) ?? 0) + row.totalSeconds);
    summary.totalSeconds += row.totalSeconds;
  }
}

export function localInstantFromDateKey(
  dateKey: string,
  utcOffsetMinutes: number,
  endOfDay = false,
): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const ms =
    Date.UTC(
      year!,
      month! - 1,
      day!,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ) +
    utcOffsetMinutes * 60_000;
  return new Date(ms);
}

export function getLocalWeekBounds(
  anchor: Date,
  utcOffsetMinutes: number,
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
) {
  const anchorDateKey = localDateKeyFromInstant(anchor, utcOffsetMinutes);
  const weekStartKey = getLocalWeekStartKeyFromDateKey(anchorDateKey, weekStartsOn);
  const weekEndKey = addDaysToDateKey(weekStartKey, 6);
  return {
    weekStartKey,
    weekStart: localInstantFromDateKey(weekStartKey, utcOffsetMinutes),
    weekEnd: localInstantFromDateKey(weekEndKey, utcOffsetMinutes, true),
  };
}
