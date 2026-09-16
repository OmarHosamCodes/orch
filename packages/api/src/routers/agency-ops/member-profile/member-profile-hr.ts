import {
  DEFAULT_WORK_SCHEDULE,
  isWeekendDateKey,
  rotateWeekdayLabels,
} from "../resourcing/work-schedule";
import {
  addDaysToDateKey,
  getLocalWeekStartKeyFromDateKey,
} from "../time-tracking/local-week-bounds";
import { expandLeaveDays, type LeaveRangeInput } from "./member-profile-heat";

export const DEFAULT_OFF_ALLOWANCE_DAYS = 15;

export type LeaveAllowancePeriod = "year" | "quarter" | "month";

export type LeaveBalanceBucket = {
  usedDays: number;
  allowanceDays: number;
};

export type LeaveBalances = {
  year: number;
  period: {
    kind: LeaveAllowancePeriod;
    start: string;
    end: string;
    label: string;
  };
  all: LeaveBalanceBucket;
};

export type WeekHourDay = {
  date: string;
  weekdayLabel: string;
  totalSeconds: number;
};

export type CalendarDayStatus = "present" | "leave" | "holiday" | "weekend" | "empty";

export type CalendarMonthDay = {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
  status: CalendarDayStatus;
  leaveId: string | null;
  totalSeconds: number;
};

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function countInclusiveDays(startDate: string, endDate: string): number {
  if (endDate < startDate) return 0;
  let count = 0;
  let cursor = startDate;
  while (cursor <= endDate) {
    count += 1;
    cursor = addDaysToDateKey(cursor, 1);
  }
  return count;
}

function parseDateKeyParts(dateKey: string): { year: number; month: number; day: number } {
  const [yearStr, monthStr, dayStr] = dateKey.split("-");
  return {
    year: Number(yearStr),
    month: Number(monthStr),
    day: Number(dayStr),
  };
}

/** Inclusive allowance window for the period containing `anchorDate`. */
export function leaveAllowancePeriodWindow(
  period: LeaveAllowancePeriod,
  anchorDate: string,
): LeaveBalances["period"] {
  const { year, month } = parseDateKeyParts(anchorDate);

  switch (period) {
    case "year": {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      return {
        kind: "year",
        start,
        end,
        label: String(year),
      };
    }
    case "quarter": {
      const quarter = Math.floor((month - 1) / 3) + 1;
      const startMonth = (quarter - 1) * 3 + 1;
      const endMonth = startMonth + 2;
      const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
      const nextMonth =
        endMonth === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(endMonth + 1).padStart(2, "0")}-01`;
      const end = addDaysToDateKey(nextMonth, -1);
      return {
        kind: "quarter",
        start,
        end,
        label: `Q${quarter} ${year}`,
      };
    }
    case "month": {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const nextMonth =
        month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const end = addDaysToDateKey(nextMonth, -1);
      const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
      return {
        kind: "month",
        start,
        end,
        label,
      };
    }
    default: {
      const _exhaustive: never = period;
      return _exhaustive;
    }
  }
}

/** Count all leave days in the allowance period window against the Off days pool. */
export function buildLeaveBalances(input: {
  period: LeaveAllowancePeriod;
  anchorDate: string;
  leave: Array<{
    startDate: string;
    endDate: string;
    type: LeaveRangeInput["type"];
  }>;
  offAllowanceDays: number;
}): LeaveBalances {
  const window = leaveAllowancePeriodWindow(input.period, input.anchorDate);
  let usedDays = 0;

  for (const row of input.leave) {
    if (row.endDate < window.start || row.startDate > window.end) continue;
    const start = row.startDate < window.start ? window.start : row.startDate;
    const end = row.endDate > window.end ? window.end : row.endDate;
    usedDays += countInclusiveDays(start, end);
  }

  return {
    year: Number(window.start.slice(0, 4)),
    period: window,
    all: { usedDays, allowanceDays: input.offAllowanceDays },
  };
}

/** Seven days for the week containing `anchorDate`, with seconds from the map. */
export function buildWeekHours(
  anchorDate: string,
  secondsByDate: Map<string, number>,
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
): WeekHourDay[] {
  const weekStart = getLocalWeekStartKeyFromDateKey(anchorDate, weekStartsOn);
  const labels = rotateWeekdayLabels(WEEKDAY_LABELS, weekStartsOn);
  return labels.map((weekdayLabel, index) => {
    const date = addDaysToDateKey(weekStart, index);
    return {
      date,
      weekdayLabel,
      totalSeconds: secondsByDate.get(date) ?? 0,
    };
  });
}

/** Month grid aligned to team week start, with derived present/leave/holiday/weekend/empty. */
export function buildCalendarMonth(input: {
  periodStartKey: string;
  periodEndKey: string;
  label: string;
  isTenureMonth?: boolean;
  secondsByDate: Map<string, number>;
  leave: LeaveRangeInput[];
  weekStartsOn?: number;
  weekendDurationDays?: number;
}): {
  year: number;
  month: number;
  label: string;
  periodStart: string;
  periodEnd: string;
  isTenureMonth: boolean;
  weekdayLabels: string[];
  days: CalendarMonthDay[];
} {
  const weekStartsOn = input.weekStartsOn ?? DEFAULT_WORK_SCHEDULE.weekStartsOn;
  const weekendDurationDays =
    input.weekendDurationDays ?? DEFAULT_WORK_SCHEDULE.weekendDurationDays;
  const weekdayLabels = [...rotateWeekdayLabels(WEEKDAY_LABELS, weekStartsOn)];
  const monthStart = input.periodStartKey;
  const monthEnd = input.periodEndKey;
  const { year, month } = parseDateKeyParts(monthStart);

  const leaveByDate = expandLeaveDays(input.leave, monthStart, monthEnd);
  const gridStart = getLocalWeekStartKeyFromDateKey(monthStart, weekStartsOn);
  const monthEndWeekStart = getLocalWeekStartKeyFromDateKey(monthEnd, weekStartsOn);
  const gridEnd = addDaysToDateKey(monthEndWeekStart, 6);

  const days: CalendarMonthDay[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const inMonth = cursor >= monthStart && cursor <= monthEnd;
    const leave = leaveByDate.get(cursor);
    const seconds = input.secondsByDate.get(cursor) ?? 0;
    const weekend = isWeekendDateKey(cursor, weekStartsOn, weekendDurationDays);
    let status: CalendarDayStatus = "empty";
    if (leave) status = leave.type === "team_holiday" ? "holiday" : "leave";
    else if (seconds > 0) status = "present";
    else if (weekend) status = "weekend";

    days.push({
      date: cursor,
      dayOfMonth: Number(cursor.slice(8, 10)),
      inMonth,
      status,
      leaveId: leave?.id ?? null,
      totalSeconds: seconds,
    });
    cursor = addDaysToDateKey(cursor, 1);
  }

  return {
    year,
    month,
    label: input.label,
    periodStart: monthStart,
    periodEnd: monthEnd,
    isTenureMonth: input.isTenureMonth ?? false,
    weekdayLabels,
    days,
  };
}
