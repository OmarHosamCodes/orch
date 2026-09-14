import {
  getFiscalQuarterRange,
  getTenureMonthByStartKey,
  toFiscalCalendar,
  type FiscalQuarter,
} from "@orch/api/routers/agency-ops/resourcing/tenure-engine";

export type AlertPeriodTarget =
  | { kind: "day"; dateKey: string; from: string; to: string }
  | { kind: "month"; monthKey: string; from: string; to: string; focusDate: string }
  | { kind: "quarter"; periodKey: string; from: string; to: string; focusDate: string };

export type AlertPeriodFiscalCalendar = {
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
};

function formatUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function quarterPeriodTarget(
  periodKey: string,
  fiscalCalendar: AlertPeriodFiscalCalendar,
): AlertPeriodTarget | null {
  const match = /^(\d{4})-Q([1-4])$/.exec(periodKey);
  if (!match) return null;
  const fiscalYear = Number(match[1]);
  const fiscalQuarter = Number(match[2]) as FiscalQuarter;
  const range = getFiscalQuarterRange(toFiscalCalendar(fiscalCalendar), fiscalYear, fiscalQuarter);
  const from = formatUtcDateKey(range.start);
  const lastInclusive = new Date(range.end.getTime() - 86_400_000);
  const to = formatUtcDateKey(lastInclusive);
  return { kind: "quarter", periodKey, from, to, focusDate: from };
}

/** Last calendar day key for a YYYY-MM month key (UTC date math). */
export function lastDateKeyOfMonth(monthKey: string): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return `${monthKey}-01`;
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthKey}-${String(lastDay).padStart(2, "0")}`;
}

/**
 * Map alert context to a profile period the UI can open.
 * Day alerts focus that date; month-keyed alerts open the full month.
 */
export function resolveAlertPeriodTarget(
  context: {
    dateKey?: string;
    periodKey?: string;
  },
  fiscalCalendar?: AlertPeriodFiscalCalendar,
): AlertPeriodTarget | null {
  const dateKey = context.dateKey;
  if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { kind: "day", dateKey, from: dateKey, to: dateKey };
  }

  const periodKey = context.periodKey;
  const tenureMonthMatch = periodKey ? /^tm:(\d{4}-\d{2}-\d{2})$/.exec(periodKey) : null;
  if (tenureMonthMatch) {
    const from = tenureMonthMatch[1]!;
    if (fiscalCalendar) {
      const month = getTenureMonthByStartKey(from, toFiscalCalendar(fiscalCalendar));
      if (month) {
        return {
          kind: "month",
          monthKey: from.slice(0, 7),
          from: month.startKey,
          to: month.endKey,
          focusDate: month.startKey,
        };
      }
    }
    const monthKey = from.slice(0, 7);
    return {
      kind: "month",
      monthKey,
      from,
      to: lastDateKeyOfMonth(monthKey),
      focusDate: from,
    };
  }

  if (periodKey && /^\d{4}-\d{2}$/.test(periodKey)) {
    const from = `${periodKey}-01`;
    const to = lastDateKeyOfMonth(periodKey);
    return { kind: "month", monthKey: periodKey, from, to, focusDate: from };
  }

  if (periodKey && fiscalCalendar) {
    return quarterPeriodTarget(periodKey, fiscalCalendar);
  }

  return null;
}
