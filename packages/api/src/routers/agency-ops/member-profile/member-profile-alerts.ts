import type { AgencyOpsMemberProfileAlertContext } from "@orch/db/schema";

import {
  getFiscalQuarterForDate,
  getFiscalQuarterRange,
  resolveProfilePeriodMonth,
  toFiscalCalendar,
  type FiscalCalendar,
} from "../resourcing/tenure-engine";
import { projectPeriodPace, type WorkSchedule } from "../resourcing/work-schedule";
import { addDaysToDateKey } from "../time-tracking/local-week-bounds";

export type DetectedAlert = {
  kind: "abnormal_day" | "month_pace" | "quarter_pace" | "waste_spike";
  fingerprint: string;
  title: string;
  body: string;
  context: AgencyOpsMemberProfileAlertContext;
  defaultSnoozeUntil: Date;
};

export type DaySeconds = {
  dateKey: string;
  totalSeconds: number;
  wasteSeconds: number;
};

export type MemberProfileAlertPolicy = {
  abnormalDayEnabled: boolean;
  abnormalDayExtraHours: number;
  monthPaceEnabled: boolean;
  monthPacePercent: number;
  quarterPaceEnabled: boolean;
  quarterPacePercent: number;
  wasteSpikeEnabled: boolean;
  wasteSpikePercent: number;
};

export const DEFAULT_ALERT_POLICY: MemberProfileAlertPolicy = {
  abnormalDayEnabled: true,
  abnormalDayExtraHours: 4,
  monthPaceEnabled: true,
  monthPacePercent: 85,
  quarterPaceEnabled: true,
  quarterPacePercent: 85,
  wasteSpikeEnabled: true,
  wasteSpikePercent: 20,
};

const ABNORMAL_DAY_LOOKBACK_DAYS = 30;
const PACE_ELAPSED_GATE = 0.5;

/** Legacy month keys alias to tm:YYYY-MM-01 fingerprints for suppress/upsert continuity. */
export function alertFingerprintAliases(fingerprint: string): readonly string[] {
  const monthLegacy = /^month_pace:(\d{4}-\d{2})$/.exec(fingerprint);
  if (monthLegacy) return [fingerprint, `month_pace:tm:${monthLegacy[1]}-01`];
  const monthTm = /^month_pace:tm:(\d{4}-\d{2})-01$/.exec(fingerprint);
  if (monthTm) return [fingerprint, `month_pace:${monthTm[1]}`];
  const wasteLegacy = /^waste_spike:(\d{4}-\d{2})$/.exec(fingerprint);
  if (wasteLegacy) return [fingerprint, `waste_spike:tm:${wasteLegacy[1]}-01`];
  const wasteTm = /^waste_spike:tm:(\d{4}-\d{2})-01$/.exec(fingerprint);
  if (wasteTm) return [fingerprint, `waste_spike:${wasteTm[1]}`];
  return [fingerprint];
}

export function abnormalDayThresholdHours(
  requiredDailyHours: number,
  extraHours: number = DEFAULT_ALERT_POLICY.abnormalDayExtraHours,
): number {
  return requiredDailyHours + extraHours;
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function secondsInRange(days: DaySeconds[], fromKey: string, toKey: string) {
  let total = 0;
  let waste = 0;
  for (const day of days) {
    if (day.dateKey < fromKey || day.dateKey > toKey) continue;
    total += day.totalSeconds;
    waste += day.wasteSeconds;
  }
  return { total, waste };
}

export function detectAbnormalDays(input: {
  days: DaySeconds[];
  requiredDailyHours: number;
  todayKey: string;
  now?: Date;
  policy?: MemberProfileAlertPolicy;
}): DetectedAlert[] {
  const policy = input.policy ?? DEFAULT_ALERT_POLICY;
  if (!policy.abnormalDayEnabled) return [];
  const threshold = abnormalDayThresholdHours(
    input.requiredDailyHours,
    policy.abnormalDayExtraHours,
  );
  const thresholdSeconds = threshold * 3600;
  const now = input.now ?? new Date();
  const windowStart = addDaysToDateKey(input.todayKey, -ABNORMAL_DAY_LOOKBACK_DAYS);

  const alerts: DetectedAlert[] = [];
  for (const day of input.days) {
    if (day.dateKey < windowStart || day.dateKey > input.todayKey) continue;
    if (day.totalSeconds <= thresholdSeconds) continue;
    const hours = Math.round((day.totalSeconds / 3600) * 10) / 10;
    alerts.push({
      kind: "abnormal_day",
      fingerprint: `abnormal_day:${day.dateKey}`,
      title: "Abnormal hours in a day",
      body: `${hours}h logged on ${day.dateKey} (threshold ${threshold}h).`,
      context: {
        dateKey: day.dateKey,
        hours,
        requiredHours: input.requiredDailyHours,
        defaultSnoozeUntil: addUtcDays(now, 7).toISOString(),
      },
      defaultSnoozeUntil: addUtcDays(now, 7),
    });
  }
  return alerts;
}

export function detectMonthPace(input: {
  days: DaySeconds[];
  schedule: WorkSchedule;
  monthlyMinHours: number;
  offDayReduceHours: number;
  leaveByDate?: ReadonlyMap<string, unknown>;
  todayKey: string;
  tenureEnabled?: boolean;
  fiscalCalendar?: FiscalCalendar;
  policy?: MemberProfileAlertPolicy;
}): DetectedAlert | null {
  const policy = input.policy ?? DEFAULT_ALERT_POLICY;
  if (!policy.monthPaceEnabled) return null;
  const fiscalCalendar =
    input.fiscalCalendar ??
    toFiscalCalendar({
      fiscalYearStartMonth: 1,
      fiscalYearStartDay: 1,
    });
  const period = resolveProfilePeriodMonth({
    tenureEnabled: input.tenureEnabled ?? false,
    calendar: fiscalCalendar,
    anchorDateKey: input.todayKey,
  });
  const offDayKeys = new Set((input.leaveByDate ?? new Map()).keys());
  const projection = projectPeriodPace({
    startKey: period.startKey,
    endKey: period.endKey,
    todayKey: input.todayKey,
    daySeconds: input.days.map((day) => ({
      dateKey: day.dateKey,
      totalSeconds: day.totalSeconds,
    })),
    schedule: input.schedule,
    baseMinHours: input.monthlyMinHours,
    offDayReduceHours: input.offDayReduceHours,
    offDayKeys,
  });
  if (
    !projection ||
    projection.elapsedWorkingDays / projection.monthWorkingDays < PACE_ELAPSED_GATE
  ) {
    return null;
  }
  if (projection.projectedHours >= projection.monthMinHours * (policy.monthPacePercent / 100)) {
    return null;
  }

  const defaultSnoozeUntil = new Date(`${period.endKey}T23:59:59.999Z`);
  return {
    kind: "month_pace",
    fingerprint: `month_pace:${period.fingerprint}`,
    title: "At risk of missing month minimum",
    body: `Projected ${Math.round(projection.projectedHours)}h vs ${projection.monthMinHours}h month minimum.`,
    context: {
      periodKey: period.fingerprint,
      loggedHours: Math.round(projection.loggedHours * 10) / 10,
      projectedHours: Math.round(projection.projectedHours * 10) / 10,
      requiredHours: projection.monthMinHours,
      defaultSnoozeUntil: defaultSnoozeUntil.toISOString(),
    },
    defaultSnoozeUntil,
  };
}

export function detectQuarterPace(input: {
  days: DaySeconds[];
  schedule: WorkSchedule;
  calendar: FiscalCalendar;
  quarterlyMinHours: number;
  offDayReduceHours: number;
  leaveByDate?: ReadonlyMap<string, unknown>;
  todayKey: string;
  policy?: MemberProfileAlertPolicy;
}): DetectedAlert | null {
  const policy = input.policy ?? DEFAULT_ALERT_POLICY;
  if (!policy.quarterPaceEnabled) return null;
  const refDate = new Date(`${input.todayKey}T12:00:00.000Z`);
  const ref = getFiscalQuarterForDate(refDate, input.calendar);
  const range = getFiscalQuarterRange(input.calendar, ref.fiscalYear, ref.fiscalQuarter);
  const startKey = range.start.toISOString().slice(0, 10);
  const endKey = addDaysToDateKey(range.end.toISOString().slice(0, 10), -1);
  const offDayKeys = new Set((input.leaveByDate ?? new Map()).keys());
  const projection = projectPeriodPace({
    startKey,
    endKey,
    todayKey: input.todayKey,
    daySeconds: input.days.map((day) => ({
      dateKey: day.dateKey,
      totalSeconds: day.totalSeconds,
    })),
    schedule: input.schedule,
    baseMinHours: input.quarterlyMinHours,
    offDayReduceHours: input.offDayReduceHours,
    offDayKeys,
  });
  if (
    !projection ||
    projection.elapsedWorkingDays / projection.monthWorkingDays < PACE_ELAPSED_GATE
  ) {
    return null;
  }
  if (projection.projectedHours >= projection.monthMinHours * (policy.quarterPacePercent / 100)) {
    return null;
  }

  const periodKey = `${ref.fiscalYear}-Q${ref.fiscalQuarter}`;
  const defaultSnoozeUntil = new Date(range.end.getTime() - 1);
  return {
    kind: "quarter_pace",
    fingerprint: `quarter_pace:${periodKey}`,
    title: "At risk of missing quarter minimum",
    body: `Projected ${Math.round(projection.projectedHours)}h vs ${projection.monthMinHours}h quarter minimum.`,
    context: {
      periodKey,
      loggedHours: Math.round(projection.loggedHours * 10) / 10,
      projectedHours: Math.round(projection.projectedHours * 10) / 10,
      requiredHours: projection.monthMinHours,
      defaultSnoozeUntil: defaultSnoozeUntil.toISOString(),
    },
    defaultSnoozeUntil,
  };
}

export function detectWasteSpike(input: {
  days: DaySeconds[];
  schedule: WorkSchedule;
  todayKey: string;
  tenureEnabled?: boolean;
  fiscalCalendar?: FiscalCalendar;
  policy?: MemberProfileAlertPolicy;
}): DetectedAlert | null {
  const policy = input.policy ?? DEFAULT_ALERT_POLICY;
  if (!policy.wasteSpikeEnabled) return null;
  const fiscalCalendar =
    input.fiscalCalendar ??
    toFiscalCalendar({
      fiscalYearStartMonth: 1,
      fiscalYearStartDay: 1,
    });
  const period = resolveProfilePeriodMonth({
    tenureEnabled: input.tenureEnabled ?? false,
    calendar: fiscalCalendar,
    anchorDateKey: input.todayKey,
  });
  const elapsedEnd = input.todayKey < period.endKey ? input.todayKey : period.endKey;
  const { total, waste } = secondsInRange(input.days, period.startKey, elapsedEnd);
  if (total <= 0) return null;
  const wasteRatio = waste / total;
  if (wasteRatio <= policy.wasteSpikePercent / 100) return null;

  const defaultSnoozeUntil = new Date(`${period.endKey}T23:59:59.999Z`);
  return {
    kind: "waste_spike",
    fingerprint: `waste_spike:${period.fingerprint}`,
    title: "High waste this month",
    body: `${Math.round(wasteRatio * 100)}% of logged time marked waste.`,
    context: {
      periodKey: period.fingerprint,
      wasteRatio: Math.round(wasteRatio * 1000) / 1000,
      loggedHours: Math.round((total / 3600) * 10) / 10,
      defaultSnoozeUntil: defaultSnoozeUntil.toISOString(),
    },
    defaultSnoozeUntil,
  };
}

export function detectSystemAlerts(input: {
  days: DaySeconds[];
  schedule: WorkSchedule;
  calendar: FiscalCalendar;
  monthlyMinHours: number;
  quarterlyMinHours: number;
  offDayReduceHours: number;
  leaveByDate?: ReadonlyMap<string, unknown>;
  tenureEnabled?: boolean;
  suppressedFingerprints: ReadonlySet<string>;
  todayKey: string;
  now?: Date;
  policy?: MemberProfileAlertPolicy;
}): DetectedAlert[] {
  const policy = input.policy ?? DEFAULT_ALERT_POLICY;
  const out: DetectedAlert[] = [];
  for (const alert of detectAbnormalDays({
    days: input.days,
    requiredDailyHours: input.schedule.requiredDailyHours,
    todayKey: input.todayKey,
    now: input.now,
    policy,
  })) {
    if (!input.suppressedFingerprints.has(alert.fingerprint)) out.push(alert);
  }
  const month = detectMonthPace({
    days: input.days,
    schedule: input.schedule,
    monthlyMinHours: input.monthlyMinHours,
    offDayReduceHours: input.offDayReduceHours,
    leaveByDate: input.leaveByDate,
    todayKey: input.todayKey,
    tenureEnabled: input.tenureEnabled,
    fiscalCalendar: input.calendar,
    policy,
  });
  if (month && !input.suppressedFingerprints.has(month.fingerprint)) out.push(month);

  const quarter = detectQuarterPace({
    days: input.days,
    schedule: input.schedule,
    calendar: input.calendar,
    quarterlyMinHours: input.quarterlyMinHours,
    offDayReduceHours: input.offDayReduceHours,
    leaveByDate: input.leaveByDate,
    todayKey: input.todayKey,
    policy,
  });
  if (quarter && !input.suppressedFingerprints.has(quarter.fingerprint)) out.push(quarter);

  const waste = detectWasteSpike({
    days: input.days,
    schedule: input.schedule,
    todayKey: input.todayKey,
    tenureEnabled: input.tenureEnabled,
    fiscalCalendar: input.calendar,
    policy,
  });
  if (waste && !input.suppressedFingerprints.has(waste.fingerprint)) out.push(waste);

  return out;
}

export { toFiscalCalendar };
