export type FiscalQuarter = 1 | 2 | 3 | 4;

import { addDaysToDateKey } from "../time-tracking/local-week-bounds";

export type TenureExemptionType =
  | "team_holiday"
  | "member_waiver"
  | "member_reduced_min"
  | "member_frozen_month";

export type TenureQuarterStatus =
  | "intern"
  | "waived"
  | "met"
  | "missed"
  | "on-track"
  | "at-risk"
  | "in-progress"
  | "skipped";

export type FiscalQuarterRef = {
  fiscalYear: number;
  fiscalQuarter: FiscalQuarter;
};

export type DateRange = {
  start: Date;
  end: Date;
};

export type FiscalCalendar = {
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
};

export type TenurePolicyInput = {
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
  quarterlyMinHours: number;
  monthlyMinHours: number;
  penaltyMonths: number;
  internDurationMonths: number;
  internDurationWeeks: number;
  requiredDailyHours: number;
  weekStartsOn: number;
  weekendDurationDays: number;
  offDayReduceHours: number;
  policyEffectiveFrom: Date;
  enabled: boolean;
};

export function toFiscalCalendar(
  policy: Pick<TenurePolicyInput, "fiscalYearStartMonth" | "fiscalYearStartDay">,
): FiscalCalendar {
  return {
    fiscalYearStartMonth: policy.fiscalYearStartMonth,
    fiscalYearStartDay: policy.fiscalYearStartDay,
  };
}

function clampFiscalStartDay(year: number, month: number, day: number): number {
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.min(Math.max(day, 1), maxDay);
}

export function getFiscalYearStartDate(fiscalYear: number, calendar: FiscalCalendar): Date {
  const day = clampFiscalStartDay(
    fiscalYear,
    calendar.fiscalYearStartMonth,
    calendar.fiscalYearStartDay,
  );
  return new Date(Date.UTC(fiscalYear, calendar.fiscalYearStartMonth - 1, day));
}

export function addFiscalMonths(anchor: Date, count: number, startDay: number): Date {
  const totalMonths = anchor.getUTCFullYear() * 12 + anchor.getUTCMonth() + count;
  const year = Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  const day = clampFiscalStartDay(year, month + 1, startDay);
  return new Date(Date.UTC(year, month, day));
}

export function getFiscalQuarterRange(
  calendar: FiscalCalendar,
  fiscalYear: number,
  quarter: FiscalQuarter,
): DateRange {
  const fiscalYearStart = getFiscalYearStartDate(fiscalYear, calendar);
  const start = addFiscalMonths(fiscalYearStart, (quarter - 1) * 3, calendar.fiscalYearStartDay);
  const end = addFiscalMonths(fiscalYearStart, quarter * 3, calendar.fiscalYearStartDay);
  return { start, end };
}

export function getFiscalYearEndDate(fiscalYear: number, calendar: FiscalCalendar): Date {
  return addFiscalMonths(
    getFiscalYearStartDate(fiscalYear, calendar),
    12,
    calendar.fiscalYearStartDay,
  );
}

export function getFiscalQuarterForDate(date: Date, calendar: FiscalCalendar): FiscalQuarterRef {
  const anchorYear = date.getUTCFullYear();

  for (const fiscalYear of [anchorYear - 1, anchorYear, anchorYear + 1]) {
    const fiscalYearStart = getFiscalYearStartDate(fiscalYear, calendar);
    const fiscalYearEnd = getFiscalYearEndDate(fiscalYear, calendar);

    if (date.getTime() < fiscalYearStart.getTime() || date.getTime() >= fiscalYearEnd.getTime()) {
      continue;
    }

    for (let quarter = 1; quarter <= 4; quarter++) {
      const range = getFiscalQuarterRange(calendar, fiscalYear, quarter as FiscalQuarter);
      if (date.getTime() >= range.start.getTime() && date.getTime() < range.end.getTime()) {
        return { fiscalYear, fiscalQuarter: quarter as FiscalQuarter };
      }
    }
  }

  const fallbackYear =
    date.getUTCMonth() + 1 > calendar.fiscalYearStartMonth ||
    (date.getUTCMonth() + 1 === calendar.fiscalYearStartMonth &&
      date.getUTCDate() >= calendar.fiscalYearStartDay)
      ? anchorYear
      : anchorYear - 1;

  return { fiscalYear: fallbackYear, fiscalQuarter: 1 };
}

export type TenureMonthRange = {
  startKey: string;
  endKey: string;
  label: string;
  fingerprint: string;
  fiscalYear: number;
  fiscalQuarter: FiscalQuarter;
  monthIndex: 0 | 1 | 2;
};

export type ProfilePeriodMonth = {
  startKey: string;
  endKey: string;
  label: string;
  fingerprint: string;
  isTenureMonth: boolean;
};

function dateKeyFromUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatCalendarMonthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTenureMonthRangeLabel(startKey: string, endKey: string): string {
  const start = new Date(`${startKey}T12:00:00.000Z`);
  const end = new Date(`${endKey}T12:00:00.000Z`);
  const startPart = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const endPart = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${startPart} – ${endPart}`;
}

function buildTenureMonthRange(
  start: Date,
  endExclusive: Date,
  fiscalYear: number,
  fiscalQuarter: FiscalQuarter,
  monthIndex: 0 | 1 | 2,
  calendar: FiscalCalendar,
): TenureMonthRange {
  const startKey = dateKeyFromUtcDate(start);
  const endKey = addDaysToDateKey(dateKeyFromUtcDate(endExclusive), -1);
  const label =
    calendar.fiscalYearStartDay === 1 && start.getUTCDate() === 1
      ? formatCalendarMonthLabel(start.getUTCFullYear(), start.getUTCMonth() + 1)
      : formatTenureMonthRangeLabel(startKey, endKey);

  return {
    startKey,
    endKey,
    label,
    fingerprint: `tm:${startKey}`,
    fiscalYear,
    fiscalQuarter,
    monthIndex,
  };
}

function calendarMonthFromDateKey(dateKey: string): ProfilePeriodMonth {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const startKey = `${dateKey.slice(0, 7)}-01`;
  const nextMonth =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endKey = addDaysToDateKey(nextMonth, -1);
  return {
    startKey,
    endKey,
    label: formatCalendarMonthLabel(year, month),
    fingerprint: `tm:${startKey}`,
    isTenureMonth: false,
  };
}

function tenureMonthAtIndex(
  calendar: FiscalCalendar,
  fiscalYear: number,
  fiscalQuarter: FiscalQuarter,
  monthIndex: 0 | 1 | 2,
): TenureMonthRange {
  const quarterRange = getFiscalQuarterRange(calendar, fiscalYear, fiscalQuarter);
  const start = addFiscalMonths(quarterRange.start, monthIndex, calendar.fiscalYearStartDay);
  const endExclusive = addFiscalMonths(
    quarterRange.start,
    monthIndex + 1,
    calendar.fiscalYearStartDay,
  );
  return buildTenureMonthRange(
    start,
    endExclusive,
    fiscalYear,
    fiscalQuarter,
    monthIndex,
    calendar,
  );
}

export function getTenureMonthForDate(date: Date, calendar: FiscalCalendar): TenureMonthRange {
  const ref = getFiscalQuarterForDate(date, calendar);
  const quarterRange = getFiscalQuarterRange(calendar, ref.fiscalYear, ref.fiscalQuarter);

  for (const monthIndex of [0, 1, 2] as const) {
    const start = addFiscalMonths(quarterRange.start, monthIndex, calendar.fiscalYearStartDay);
    const endExclusive = addFiscalMonths(
      quarterRange.start,
      monthIndex + 1,
      calendar.fiscalYearStartDay,
    );
    if (date.getTime() >= start.getTime() && date.getTime() < endExclusive.getTime()) {
      return buildTenureMonthRange(
        start,
        endExclusive,
        ref.fiscalYear,
        ref.fiscalQuarter,
        monthIndex,
        calendar,
      );
    }
  }

  return tenureMonthAtIndex(calendar, ref.fiscalYear, ref.fiscalQuarter, 0);
}

export function getTenureMonthByStartKey(
  startKey: string,
  calendar: FiscalCalendar,
): TenureMonthRange | null {
  const ref = getFiscalQuarterForDate(new Date(`${startKey}T12:00:00.000Z`), calendar);
  for (const monthIndex of [0, 1, 2] as const) {
    const month = tenureMonthAtIndex(calendar, ref.fiscalYear, ref.fiscalQuarter, monthIndex);
    if (month.startKey === startKey) return month;
  }
  return null;
}

export function shiftTenureMonthStart(
  startKey: string,
  delta: -1 | 1,
  calendar: FiscalCalendar,
): TenureMonthRange {
  const current =
    getTenureMonthByStartKey(startKey, calendar) ??
    getTenureMonthForDate(new Date(`${startKey}T12:00:00.000Z`), calendar);
  const nextIndex = current.monthIndex + delta;

  if (nextIndex >= 0 && nextIndex <= 2) {
    return tenureMonthAtIndex(
      calendar,
      current.fiscalYear,
      current.fiscalQuarter,
      nextIndex as 0 | 1 | 2,
    );
  }

  let fiscalYear = current.fiscalYear;
  let fiscalQuarter = current.fiscalQuarter + delta;
  if (fiscalQuarter > 4) {
    fiscalQuarter = 1;
    fiscalYear += 1;
  } else if (fiscalQuarter < 1) {
    fiscalQuarter = 4;
    fiscalYear -= 1;
  }

  return tenureMonthAtIndex(
    calendar,
    fiscalYear,
    fiscalQuarter as FiscalQuarter,
    delta === 1 ? 0 : 2,
  );
}

export function resolveProfilePeriodMonth(input: {
  tenureEnabled: boolean;
  calendar: FiscalCalendar;
  anchorDateKey: string;
  requestedStartKey?: string;
}): ProfilePeriodMonth {
  if (!input.tenureEnabled) {
    const startKey = input.requestedStartKey ?? `${input.anchorDateKey.slice(0, 7)}-01`;
    return calendarMonthFromDateKey(startKey);
  }

  if (input.requestedStartKey) {
    const requested = getTenureMonthByStartKey(input.requestedStartKey, input.calendar);
    if (requested) {
      return {
        startKey: requested.startKey,
        endKey: requested.endKey,
        label: requested.label,
        fingerprint: requested.fingerprint,
        isTenureMonth: true,
      };
    }
    const containing = getTenureMonthForDate(
      new Date(`${input.requestedStartKey}T12:00:00.000Z`),
      input.calendar,
    );
    return {
      startKey: containing.startKey,
      endKey: containing.endKey,
      label: containing.label,
      fingerprint: containing.fingerprint,
      isTenureMonth: true,
    };
  }

  const month = getTenureMonthForDate(
    new Date(`${input.anchorDateKey}T12:00:00.000Z`),
    input.calendar,
  );
  return {
    startKey: month.startKey,
    endKey: month.endKey,
    label: month.label,
    fingerprint: month.fingerprint,
    isTenureMonth: true,
  };
}

function shiftCalendarMonthStart(startKey: string, delta: -1 | 1): string {
  const year = Number(startKey.slice(0, 4));
  const month = Number(startKey.slice(5, 7));
  let nextMonth = month + delta;
  let nextYear = year;
  if (nextMonth < 1) {
    nextMonth = 12;
    nextYear -= 1;
  } else if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

export function shiftProfilePeriodMonth(
  startKey: string,
  delta: -1 | 1,
  input: { tenureEnabled: boolean; calendar: FiscalCalendar },
): ProfilePeriodMonth {
  if (!input.tenureEnabled) {
    return calendarMonthFromDateKey(shiftCalendarMonthStart(startKey, delta));
  }
  const shifted = shiftTenureMonthStart(startKey, delta, input.calendar);
  return {
    startKey: shifted.startKey,
    endKey: shifted.endKey,
    label: shifted.label,
    fingerprint: shifted.fingerprint,
    isTenureMonth: true,
  };
}

export type MemberTenureProfileInput = {
  internStartOverride: Date | null;
  internEndOverride: Date | null;
  internCountsTowardTenure: boolean;
  internExemptFromQuarterMin: boolean;
};

export type TenureExemptionInput = {
  type: TenureExemptionType;
  fiscalYear: number;
  fiscalQuarter: FiscalQuarter;
  userId: string | null;
  reducedMinHours: number | null;
  frozenMonth: number | null;
};

export type QuarterEvaluation = {
  fiscalYear: number;
  fiscalQuarter: FiscalQuarter;
  range: DateRange;
  requiredHours: number;
  loggedHours: number;
  status: TenureQuarterStatus;
  penaltyMonthsApplied: number;
  prorated: boolean;
};

export type MemberTenureResult = {
  internStart: Date | null;
  internEnd: Date | null;
  internDerived: boolean;
  rawTenureMonths: number;
  penaltyMonths: number;
  netTenureMonths: number;
  failedQuarterCount: number;
  awaitingFirstEntry: boolean;
  quarters: QuarterEvaluation[];
  currentQuarter: QuarterEvaluation | null;
};

const MS_PER_DAY = 86_400_000;

function getCompletionQuarterEnd(internEnd: Date | null, calendar: FiscalCalendar): Date | null {
  if (!internEnd) {
    return null;
  }
  const completionQuarter = getFiscalQuarterForDate(internEnd, calendar);
  return getFiscalQuarterRange(
    calendar,
    completionQuarter.fiscalYear,
    completionQuarter.fiscalQuarter,
  ).end;
}

export function addInternDuration(start: Date, months: number, weeks: number): Date {
  const result = new Date(start);
  result.setUTCMonth(result.getUTCMonth() + months);
  result.setUTCDate(result.getUTCDate() + weeks * 7);
  return result;
}

export function computeInternWindow(input: {
  firstTrackedAt: Date | null;
  profile: MemberTenureProfileInput;
  policy: Pick<TenurePolicyInput, "internDurationMonths" | "internDurationWeeks">;
}): { internStart: Date | null; internEnd: Date | null; derived: boolean } {
  const internStart = input.profile.internStartOverride ?? input.firstTrackedAt ?? null;

  if (!internStart) {
    return { internStart: null, internEnd: null, derived: false };
  }

  if (input.profile.internEndOverride) {
    return {
      internStart,
      internEnd: input.profile.internEndOverride,
      derived: !input.profile.internStartOverride,
    };
  }

  return {
    internStart,
    internEnd: addInternDuration(
      internStart,
      input.policy.internDurationMonths,
      input.policy.internDurationWeeks,
    ),
    derived: !input.profile.internStartOverride,
  };
}

export function quarterOverlapsIntern(
  range: DateRange,
  internStart: Date,
  internEnd: Date,
): boolean {
  const internStartMs = internStart.getTime();
  const internEndMs = internEnd.getTime();
  const rangeStartMs = range.start.getTime();
  const rangeEndMs = range.end.getTime();

  if (internEndMs >= rangeStartMs && internEndMs < rangeEndMs) {
    return true;
  }

  for (let dayMs = rangeStartMs; dayMs < rangeEndMs; dayMs += MS_PER_DAY) {
    if (dayMs >= internStartMs && dayMs <= internEndMs) {
      return true;
    }
  }

  return false;
}

export function isInternQuarter(
  range: DateRange,
  internStart: Date | null,
  internEnd: Date | null,
): boolean {
  if (!internStart || !internEnd) {
    return false;
  }
  return quarterOverlapsIntern(range, internStart, internEnd);
}

function daysInRange(range: DateRange): number {
  return Math.round((range.end.getTime() - range.start.getTime()) / MS_PER_DAY);
}

function daysOverlap(range: DateRange, activeFrom: Date, activeTo: Date): number {
  const start = Math.max(range.start.getTime(), activeFrom.getTime());
  const end = Math.min(range.end.getTime(), activeTo.getTime());
  if (end <= start) {
    return 0;
  }
  return Math.round((end - start) / MS_PER_DAY);
}

export function enumerateFiscalQuarters(input: {
  calendar: FiscalCalendar;
  from: Date;
  to: Date;
}): Array<FiscalQuarterRef & { range: DateRange }> {
  const quarters: Array<FiscalQuarterRef & { range: DateRange }> = [];
  const seen = new Set<string>();

  let cursor = new Date(input.from);
  const endMs = input.to.getTime();

  while (cursor.getTime() <= endMs) {
    const ref = getFiscalQuarterForDate(cursor, input.calendar);
    const key = `${ref.fiscalYear}-${ref.fiscalQuarter}`;
    if (!seen.has(key)) {
      seen.add(key);
      quarters.push({
        ...ref,
        range: getFiscalQuarterRange(input.calendar, ref.fiscalYear, ref.fiscalQuarter),
      });
    }
    cursor = new Date(cursor.getTime() + 32 * MS_PER_DAY);
  }

  return quarters.sort((a, b) => {
    if (a.fiscalYear !== b.fiscalYear) {
      return a.fiscalYear - b.fiscalYear;
    }
    return a.fiscalQuarter - b.fiscalQuarter;
  });
}

function findExemptionsForQuarter(
  exemptions: TenureExemptionInput[],
  userId: string,
  fiscalYear: number,
  fiscalQuarter: FiscalQuarter,
): TenureExemptionInput[] {
  return exemptions.filter(
    (exemption) =>
      exemption.fiscalYear === fiscalYear &&
      exemption.fiscalQuarter === fiscalQuarter &&
      (exemption.type === "team_holiday" || exemption.userId === userId),
  );
}

export function quarterCountsForRawTenure(input: {
  range: DateRange;
  now: Date;
  policyEffectiveFrom: Date;
  internStart: Date | null;
  internEnd: Date | null;
  internCountsTowardTenure: boolean;
  calendar: FiscalCalendar;
}): boolean {
  if (input.range.start.getTime() >= input.now.getTime()) {
    return false;
  }

  if (input.range.end.getTime() <= input.policyEffectiveFrom.getTime()) {
    return false;
  }

  const internQ = isInternQuarter(input.range, input.internStart, input.internEnd);

  if (internQ && !input.internCountsTowardTenure) {
    return false;
  }

  const completionQuarterEnd = getCompletionQuarterEnd(input.internEnd, input.calendar);
  if (
    completionQuarterEnd &&
    !input.internCountsTowardTenure &&
    input.range.end.getTime() <= completionQuarterEnd.getTime()
  ) {
    return false;
  }

  return true;
}

export function evaluateRequiredHours(input: {
  policy: TenurePolicyInput;
  profile: MemberTenureProfileInput;
  range: DateRange;
  fiscalYear: number;
  fiscalQuarter: FiscalQuarter;
  userId: string;
  internStart: Date | null;
  internEnd: Date | null;
  teamJoinDate: Date;
  exemptions: TenureExemptionInput[];
  now: Date;
}): { requiredHours: number; status: TenureQuarterStatus; prorated: boolean } {
  const { policy, range, now } = input;

  if (!policy.enabled) {
    return { requiredHours: 0, status: "skipped", prorated: false };
  }

  if (range.end.getTime() <= policy.policyEffectiveFrom.getTime()) {
    return { requiredHours: 0, status: "skipped", prorated: false };
  }

  const calendar = toFiscalCalendar(policy);
  const completionQuarterEnd = getCompletionQuarterEnd(input.internEnd, calendar);
  if (
    completionQuarterEnd &&
    range.end.getTime() <= completionQuarterEnd.getTime() &&
    input.profile.internExemptFromQuarterMin
  ) {
    return { requiredHours: 0, status: "intern", prorated: false };
  }

  if (
    isInternQuarter(range, input.internStart, input.internEnd) &&
    input.profile.internExemptFromQuarterMin
  ) {
    return { requiredHours: 0, status: "intern", prorated: false };
  }

  const quarterExemptions = findExemptionsForQuarter(
    input.exemptions,
    input.userId,
    input.fiscalYear,
    input.fiscalQuarter,
  );

  if (quarterExemptions.some((exemption) => exemption.type === "team_holiday")) {
    return { requiredHours: 0, status: "waived", prorated: false };
  }

  const memberWaiver = quarterExemptions.find((exemption) => exemption.type === "member_waiver");
  if (memberWaiver) {
    return { requiredHours: 0, status: "waived", prorated: false };
  }

  let requiredHours = policy.quarterlyMinHours;
  const reduced = quarterExemptions.find((exemption) => exemption.type === "member_reduced_min");
  if (reduced?.reducedMinHours != null) {
    requiredHours = reduced.reducedMinHours;
  }

  const frozen = quarterExemptions.find((exemption) => exemption.type === "member_frozen_month");
  if (frozen) {
    requiredHours = Math.round((requiredHours * 2) / 3);
  }

  const postInternFrom = input.internEnd
    ? new Date(input.internEnd.getTime() + MS_PER_DAY)
    : input.teamJoinDate;
  const activeFrom = new Date(
    Math.max(
      postInternFrom.getTime(),
      input.teamJoinDate.getTime(),
      policy.policyEffectiveFrom.getTime(),
    ),
  );

  const quarterDays = daysInRange(range);
  const activeDays = daysOverlap(range, activeFrom, now);
  let prorated = false;

  if (activeDays > 0 && activeDays < quarterDays) {
    requiredHours = Math.round((requiredHours * activeDays) / quarterDays);
    prorated = true;
  } else if (activeDays === 0) {
    return { requiredHours: 0, status: "skipped", prorated: false };
  }

  return { requiredHours, status: "in-progress", prorated };
}

export function resolveQuarterStatus(input: {
  requiredHours: number;
  loggedHours: number;
  baseStatus: TenureQuarterStatus;
  range: DateRange;
  now: Date;
}): TenureQuarterStatus {
  if (
    input.baseStatus === "intern" ||
    input.baseStatus === "waived" ||
    input.baseStatus === "skipped"
  ) {
    return input.baseStatus;
  }

  const isClosed = input.range.end.getTime() <= input.now.getTime();

  if (!isClosed) {
    if (input.requiredHours <= 0) {
      return "in-progress";
    }
    const progress = input.loggedHours / input.requiredHours;
    if (progress >= 0.8) {
      return "on-track";
    }
    return "at-risk";
  }

  if (input.requiredHours <= 0) {
    return "waived";
  }

  if (input.loggedHours >= input.requiredHours) {
    return "met";
  }

  return "missed";
}

export function computeMemberTenure(input: {
  policy: TenurePolicyInput;
  profile: MemberTenureProfileInput;
  userId: string;
  teamJoinDate: Date;
  firstTrackedAt: Date | null;
  loggedHoursByQuarterKey: Map<string, number>;
  exemptions: TenureExemptionInput[];
  now: Date;
}): MemberTenureResult {
  const internWindow = computeInternWindow({
    firstTrackedAt: input.firstTrackedAt,
    profile: input.profile,
    policy: input.policy,
  });

  if (!input.policy.enabled) {
    return {
      internStart: internWindow.internStart,
      internEnd: internWindow.internEnd,
      internDerived: internWindow.derived,
      rawTenureMonths: 0,
      penaltyMonths: 0,
      netTenureMonths: 0,
      failedQuarterCount: 0,
      awaitingFirstEntry: !input.firstTrackedAt,
      quarters: [],
      currentQuarter: null,
    };
  }

  const calendar = toFiscalCalendar(input.policy);

  const quarters = enumerateFiscalQuarters({
    calendar,
    from: input.policy.policyEffectiveFrom,
    to: input.now,
  });

  const evaluations: QuarterEvaluation[] = [];
  let rawTenureMonths = 0;
  let failedQuarterCount = 0;

  for (const quarter of quarters) {
    const key = `${quarter.fiscalYear}-${quarter.fiscalQuarter}`;
    const loggedHours = input.loggedHoursByQuarterKey.get(key) ?? 0;

    if (
      quarterCountsForRawTenure({
        range: quarter.range,
        now: input.now,
        policyEffectiveFrom: input.policy.policyEffectiveFrom,
        internStart: internWindow.internStart,
        internEnd: internWindow.internEnd,
        internCountsTowardTenure: input.profile.internCountsTowardTenure,
        calendar,
      })
    ) {
      rawTenureMonths += 3;
    }

    const {
      requiredHours,
      status: baseStatus,
      prorated,
    } = evaluateRequiredHours({
      policy: input.policy,
      profile: input.profile,
      range: quarter.range,
      fiscalYear: quarter.fiscalYear,
      fiscalQuarter: quarter.fiscalQuarter,
      userId: input.userId,
      internStart: internWindow.internStart,
      internEnd: internWindow.internEnd,
      teamJoinDate: input.teamJoinDate,
      exemptions: input.exemptions,
      now: input.now,
    });

    const status = resolveQuarterStatus({
      requiredHours,
      loggedHours,
      baseStatus,
      range: quarter.range,
      now: input.now,
    });

    const isClosed = quarter.range.end.getTime() <= input.now.getTime();
    const penaltyMonthsApplied = isClosed && status === "missed" ? input.policy.penaltyMonths : 0;

    if (penaltyMonthsApplied > 0) {
      failedQuarterCount += 1;
    }

    evaluations.push({
      fiscalYear: quarter.fiscalYear,
      fiscalQuarter: quarter.fiscalQuarter,
      range: quarter.range,
      requiredHours,
      loggedHours,
      status,
      penaltyMonthsApplied,
      prorated,
    });
  }

  const penaltyMonths = failedQuarterCount * input.policy.penaltyMonths;
  const netTenureMonths = Math.max(0, rawTenureMonths - penaltyMonths);

  const currentQuarter =
    evaluations.find(
      (quarter) =>
        quarter.range.start.getTime() <= input.now.getTime() &&
        quarter.range.end.getTime() > input.now.getTime(),
    ) ?? null;

  return {
    internStart: internWindow.internStart,
    internEnd: internWindow.internEnd,
    internDerived: internWindow.derived,
    rawTenureMonths,
    penaltyMonths,
    netTenureMonths,
    failedQuarterCount,
    awaitingFirstEntry: !input.firstTrackedAt,
    quarters: evaluations,
    currentQuarter,
  };
}

export function formatTenureMonths(months: number): string {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (years === 0) {
    return `${remainder}m`;
  }
  if (remainder === 0) {
    return `${years}y`;
  }
  return `${years}y ${remainder}m`;
}

export function fiscalQuarterLabel(fiscalYear: number, fiscalQuarter: FiscalQuarter): string {
  return `FY${String(fiscalYear).slice(-2)} Q${fiscalQuarter}`;
}
