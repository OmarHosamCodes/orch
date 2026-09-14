/** Workload heat helpers — week capacity cells colored like a planning heatmap. */

import {
  DEFAULT_WORK_SCHEDULE,
  standardWeekHours,
  startOfWeekUtc as startOfWeekUtcShared,
} from "@orch/api/routers/agency-ops/resourcing/work-schedule";

const STANDARD_WEEK_HOURS = standardWeekHours(
  DEFAULT_WORK_SCHEDULE.requiredDailyHours,
  DEFAULT_WORK_SCHEDULE.weekendDurationDays,
);
const CAPACITY_WEEKS_MAX = 12;

export type ResourcingPeriodGrain = "week" | "month" | "quarter" | "year";

export type WorkloadHeatTone = "empty" | "low" | "mid" | "high" | "full";

function startOfWeekUtc(
  date: Date,
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
): Date {
  return startOfWeekUtcShared(date, weekStartsOn);
}

function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfQuarterUtc(date: Date): Date {
  const month = date.getUTCMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1));
}

function startOfYearUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

export function periodAnchorUtc(
  date: Date,
  grain: ResourcingPeriodGrain,
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
): Date {
  switch (grain) {
    case "week":
      return startOfWeekUtc(date, weekStartsOn);
    case "month":
      return startOfWeekUtc(startOfMonthUtc(date), weekStartsOn);
    case "quarter":
      return startOfWeekUtc(startOfQuarterUtc(date), weekStartsOn);
    case "year":
      return startOfWeekUtc(startOfYearUtc(date), weekStartsOn);
    default: {
      const _exhaustive: never = grain;
      return _exhaustive;
    }
  }
}

export function weeksForGrain(grain: ResourcingPeriodGrain): number {
  switch (grain) {
    case "week":
      return 4;
    case "month":
      return 5;
    case "quarter":
      return CAPACITY_WEEKS_MAX;
    case "year":
      return CAPACITY_WEEKS_MAX;
    default: {
      const _exhaustive: never = grain;
      return _exhaustive;
    }
  }
}

/** Week-aligned anchors can sit in the prior month; nudge mid-week for calendar math. */
function calendarRefFromWeekAnchor(anchor: Date): Date {
  const ref = new Date(anchor);
  ref.setUTCDate(ref.getUTCDate() + 3);
  return ref;
}

export function shiftPeriodAnchor(
  anchor: Date,
  grain: ResourcingPeriodGrain,
  direction: -1 | 1,
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
): Date {
  switch (grain) {
    case "week": {
      const next = new Date(anchor);
      next.setUTCDate(next.getUTCDate() + direction * 7 * weeksForGrain("week"));
      return startOfWeekUtc(next, weekStartsOn);
    }
    case "month": {
      const ref = calendarRefFromWeekAnchor(anchor);
      const monthStart = startOfMonthUtc(ref);
      monthStart.setUTCMonth(monthStart.getUTCMonth() + direction);
      return periodAnchorUtc(monthStart, "month", weekStartsOn);
    }
    case "quarter": {
      const ref = calendarRefFromWeekAnchor(anchor);
      const quarterStart = startOfQuarterUtc(ref);
      quarterStart.setUTCMonth(quarterStart.getUTCMonth() + direction * 3);
      return periodAnchorUtc(quarterStart, "quarter", weekStartsOn);
    }
    case "year": {
      const ref = calendarRefFromWeekAnchor(anchor);
      const yearStart = startOfYearUtc(ref);
      yearStart.setUTCFullYear(yearStart.getUTCFullYear() + direction);
      return periodAnchorUtc(yearStart, "year", weekStartsOn);
    }
    default: {
      const _exhaustive: never = grain;
      return _exhaustive;
    }
  }
}

function hoursFromSeconds(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round(seconds / 3600);
}

/** Display hours for a planning cell: capacity when set, else logged (+ booked). */
export function workloadDisplayHours(input: {
  capacitySeconds: number;
  loggedSeconds: number;
  bookedSeconds: number;
}): number {
  if (input.capacitySeconds > 0) return hoursFromSeconds(input.capacitySeconds);
  return hoursFromSeconds(input.loggedSeconds + input.bookedSeconds);
}

/**
 * Tone ramp inspired by workload planners: low hours read warm/available,
 * full weeks read success/booked. Buckets scale with the team standard week.
 */
export function workloadHeatTone(
  hours: number,
  standardWeekHoursValue: number = STANDARD_WEEK_HOURS,
): WorkloadHeatTone {
  if (hours <= 0) return "empty";
  const scale = standardWeekHoursValue / STANDARD_WEEK_HOURS;
  if (hours < 15 * scale) return "low";
  if (hours < 28 * scale) return "mid";
  if (hours < 36 * scale) return "high";
  return "full";
}

export type MonthWeekGroup = {
  key: string;
  label: string;
  weekStarts: string[];
};

export function groupWeekStartsByMonth(weekStarts: string[]): MonthWeekGroup[] {
  const groups: MonthWeekGroup[] = [];
  for (const weekStart of weekStarts) {
    const date = new Date(weekStart);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.weekStarts.push(weekStart);
      continue;
    }
    groups.push({ key, label, weekStarts: [weekStart] });
  }
  return groups;
}

export function teamWeekUtilizationPct(
  members: Array<{ capacitySeconds: number; loggedSeconds: number; bookedSeconds: number }>,
): number | null {
  let capacity = 0;
  let load = 0;
  for (const member of members) {
    capacity += member.capacitySeconds;
    load += member.loggedSeconds + member.bookedSeconds;
  }
  if (capacity <= 0) return null;
  return Math.round((load / capacity) * 100);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
