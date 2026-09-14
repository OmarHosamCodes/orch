import {
  addFiscalMonths,
  fiscalQuarterLabel,
  getFiscalQuarterForDate,
  getFiscalQuarterRange,
  resolveProfilePeriodMonth,
  shiftProfilePeriodMonth,
  toFiscalCalendar,
} from "@orch/api/routers/agency-ops/resourcing/tenure-engine";

export { resolveProfilePeriodMonth, shiftProfilePeriodMonth };

export type TenurePolicyCalendar = {
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
  enabled: boolean;
};

export type TenureQuarterMonth = {
  index: 0 | 1 | 2;
  label: string;
  from: string;
  toExclusive: string;
};

export type TenurePeriodRange = {
  from: string;
  to: string;
  label: string;
  simpleLabel: string;
};

export function resolveDefaultDashboardRangePreset(
  policy: TenurePolicyCalendar | null | undefined,
): "tenure" | "last30" {
  return policy?.enabled ? "tenure" : "last30";
}

/** Current fiscal month inside the active tenure quarter (clamped to the quarter window). */
export function resolveDefaultTenureMonthIndexes(
  policy: TenurePolicyCalendar | null | undefined,
  now = new Date(),
): number[] {
  const months = getCurrentTenureQuarterMonths(policy, now);
  if (!months || months.length === 0) return [];

  const nowMs = now.getTime();
  const containing = months.find((month) => {
    const fromMs = new Date(month.from).getTime();
    const toExclusiveMs = new Date(month.toExclusive).getTime();
    return nowMs >= fromMs && nowMs < toExclusiveMs;
  });
  if (containing) return [containing.index];

  const first = months[0]!;
  const last = months[months.length - 1]!;
  if (nowMs < new Date(first.from).getTime()) return [first.index];
  return [last.index];
}

/** Short range-chooser label, e.g. "Q1 2026".
 * Uses the calendar year of the quarter's midpoint so off-calendar fiscal
 * years (e.g. Dec 26 start → FY2025 Q3 spans Jun–Sep 2026) still read as
 * the year the range mostly falls in. */
export function simpleTenurePeriodLabel(year: number, fiscalQuarter: number): string {
  return `Q${fiscalQuarter} ${year}`;
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

function monthShortLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}

function monthLongLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
}

export function formatTenureMonthSelectionLabel(
  months: TenureQuarterMonth[],
  displayYear: number,
): string {
  if (months.length === 0) return "";
  const shorts = months.map((month) => monthShortLabel(month.from));
  if (shorts.length === 1) return `${shorts[0]} ${displayYear}`;

  const indexes = months.map((month) => month.index);
  const contiguous = indexes.every(
    (index, offset) => offset === 0 || index === (indexes[offset - 1] ?? 0) + 1,
  );
  if (contiguous) {
    return `${shorts[0]}–${shorts[shorts.length - 1]} ${displayYear}`;
  }
  return `${shorts.join(", ")} ${displayYear}`;
}

export function getCurrentTenureQuarterMonths(
  policy: TenurePolicyCalendar | null | undefined,
  now = new Date(),
): TenureQuarterMonth[] | null {
  if (!policy?.enabled) return null;

  const calendar = toFiscalCalendar(policy);
  const ref = getFiscalQuarterForDate(now, calendar);
  const range = getFiscalQuarterRange(calendar, ref.fiscalYear, ref.fiscalQuarter);

  return ([0, 1, 2] as const).map((index) => {
    const start = addFiscalMonths(range.start, index, calendar.fiscalYearStartDay);
    const end = addFiscalMonths(range.start, index + 1, calendar.fiscalYearStartDay);
    return {
      index,
      label: monthLongLabel(start.toISOString()),
      from: start.toISOString(),
      toExclusive: end.toISOString(),
    };
  });
}

export function normalizeTenureMonthIndexes(monthIndexes: number[]): Array<0 | 1 | 2> {
  return [...new Set(monthIndexes)]
    .filter((index): index is 0 | 1 | 2 => index === 0 || index === 1 || index === 2)
    .sort((left, right) => left - right);
}

export function getCurrentTenurePeriodRange(
  policy: TenurePolicyCalendar | null | undefined,
  now = new Date(),
  monthIndexes: number[] = [],
): TenurePeriodRange | null {
  if (!policy?.enabled) return null;

  const calendar = toFiscalCalendar(policy);
  const ref = getFiscalQuarterForDate(now, calendar);
  const range = getFiscalQuarterRange(calendar, ref.fiscalYear, ref.fiscalQuarter);
  const todayEnd = endOfUtcDay(now);
  const midpoint = new Date((range.start.getTime() + range.end.getTime()) / 2);
  const displayYear = midpoint.getUTCFullYear();
  const quarterLabel = fiscalQuarterLabel(ref.fiscalYear, ref.fiscalQuarter);
  const quarterSimpleLabel = simpleTenurePeriodLabel(displayYear, ref.fiscalQuarter);

  const uniqueIndexes = normalizeTenureMonthIndexes(monthIndexes);

  if (uniqueIndexes.length === 0 || uniqueIndexes.length === 3) {
    return {
      from: range.start.toISOString(),
      to: todayEnd.toISOString(),
      label: quarterLabel,
      simpleLabel: quarterSimpleLabel,
    };
  }

  const months = getCurrentTenureQuarterMonths(policy, now);
  if (!months) return null;
  const selected = months.filter((month) => uniqueIndexes.includes(month.index));
  if (selected.length === 0) {
    return {
      from: range.start.toISOString(),
      to: todayEnd.toISOString(),
      label: quarterLabel,
      simpleLabel: quarterSimpleLabel,
    };
  }

  const from = selected.reduce(
    (earliest, month) => (month.from < earliest ? month.from : earliest),
    selected[0]!.from,
  );
  const latestExclusive = selected.reduce(
    (latest, month) => (month.toExclusive > latest ? month.toExclusive : latest),
    selected[0]!.toExclusive,
  );
  const monthEnd = new Date(new Date(latestExclusive).getTime() - 1);
  const selectionStartsInFuture = new Date(from).getTime() > todayEnd.getTime();
  const to = selectionStartsInFuture
    ? monthEnd
    : new Date(Math.min(todayEnd.getTime(), monthEnd.getTime()));

  return {
    from,
    to: to.toISOString(),
    label: quarterLabel,
    simpleLabel: formatTenureMonthSelectionLabel(selected, displayYear),
  };
}

/** e.g. 6 → `6h`, 6.75 → `6h 45m` */
export function formatHoursMinutes(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m <= 0) return `${h}h`;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export const FISCAL_MONTHS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
] as const;

export type FiscalMonth = (typeof FISCAL_MONTHS)[number]["value"];
