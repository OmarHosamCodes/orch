import {
  DEFAULT_WORK_SCHEDULE,
  monthGridPad,
  rotateWeekdayLabels,
} from "@orch/api/routers/agency-ops/resourcing/work-schedule";

import type { MemberProfileHeatMapData } from "@/features/shared/heat/member-profile-heat-map";

export type PresenceMember = {
  userId: string;
  userName: string;
  heatMap: MemberProfileHeatMapData;
};

export type PresencePerson = {
  userId: string;
  userName: string;
  shortName: string;
  colorIndex: number;
};

export type PresenceDayCell = {
  date: string | null;
  dayOfMonth: number | null;
  working: PresencePerson[];
  out: PresencePerson[];
};

export type PresenceMonthSegment = {
  startDay: number;
  endDay: number;
  fullMonth: boolean;
  kind: "working" | "out";
};

type PresenceOverviewCell = {
  monthKey: string;
  segments: PresenceMonthSegment[];
};

export type PresenceOverviewRow = {
  member: PresencePerson;
  months: PresenceOverviewCell[];
};

const PRESENCE_WEEKDAY_LABELS_MON_FIRST = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export function presenceWeekdayLabels(
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
): string[] {
  return rotateWeekdayLabels(PRESENCE_WEEKDAY_LABELS_MON_FIRST, weekStartsOn);
}

/** Soft member tints from theme charts / state — cycled by stable index. */
const PRESENCE_MEMBER_TINT_CLASS = [
  "bg-chart-1/30 text-foreground",
  "bg-chart-2/30 text-foreground",
  "bg-chart-3/30 text-foreground",
  "bg-chart-4/30 text-foreground",
  "bg-chart-5/30 text-foreground",
  "bg-success/25 text-foreground",
  "bg-info/25 text-foreground",
  "bg-warning/25 text-foreground",
] as const;

export function shortDisplayName(userName: string): string {
  const trimmed = userName.trim();
  if (!trimmed) return "?";
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first.length > 12 ? `${first.slice(0, 11)}…` : first;
}

function stableColorIndex(userId: string, modulo = PRESENCE_MEMBER_TINT_CLASS.length): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

/** Month key aligned with period chrome (week-anchor + mid-week nudge). */
export function focusMonthKeyFromAnchor(anchor: Date): string {
  const ref = new Date(anchor);
  ref.setUTCDate(ref.getUTCDate() + 3);
  return `${ref.getUTCFullYear()}-${String(ref.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabelFromKey(monthKey: string): string {
  const date = new Date(`${monthKey}-01T00:00:00Z`);
  return date.toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Calendar month step — avoids week-anchor month keys that can repeat (e.g. Aug 2026). */
export function shiftMonthKey(monthKey: string, delta: -1 | 1): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1 + delta, 1));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function monthsInRange(fromDate: string, toDate: string): string[] {
  if (fromDate > toDate) return [];
  const months: string[] = [];
  let cursor = `${fromDate.slice(0, 7)}-01`;
  const endMonth = toDate.slice(0, 7);
  while (cursor.slice(0, 7) <= endMonth) {
    months.push(cursor.slice(0, 7));
    const [year, month] = cursor.split("-").map(Number);
    const next = new Date(Date.UTC(year!, month!, 1));
    cursor = next.toISOString().slice(0, 10);
  }
  return months;
}

function toPerson(member: PresenceMember): PresencePerson {
  return {
    userId: member.userId,
    userName: member.userName,
    shortName: shortDisplayName(member.userName),
    colorIndex: stableColorIndex(member.userId),
  };
}

function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year!, month!, 0)).getUTCDate();
}

/** Week-start-aligned month grid including leading/trailing pads (date null). */
export function buildPresenceCalendarDays(
  members: readonly PresenceMember[],
  monthKey: string,
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
): PresenceDayCell[] {
  const people = members.map(toPerson);
  const byUserDate = new Map<string, Map<string, { out: boolean }>>();
  for (const member of members) {
    const map = new Map<string, { out: boolean }>();
    for (const day of member.heatMap.days) {
      map.set(day.date, { out: Boolean(day.off) });
    }
    byUserDate.set(member.userId, map);
  }

  const monthStart = `${monthKey}-01`;
  const first = new Date(`${monthStart}T00:00:00Z`);
  const pad = monthGridPad(first.getUTCDay(), weekStartsOn);
  const totalDays = daysInMonth(monthKey);
  const cells: PresenceDayCell[] = [];

  for (let i = 0; i < pad; i++) {
    cells.push({ date: null, dayOfMonth: null, working: [], out: [] });
  }

  for (let day = 1; day <= totalDays; day++) {
    const date = `${monthKey}-${String(day).padStart(2, "0")}`;
    const working: PresencePerson[] = [];
    const out: PresencePerson[] = [];
    for (const person of people) {
      const status = byUserDate.get(person.userId)?.get(date);
      if (status?.out) out.push(person);
      else working.push(person);
    }
    cells.push({ date, dayOfMonth: day, working, out });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, dayOfMonth: null, working: [], out: [] });
  }

  return cells;
}

function segmentsForKind(
  monthKey: string,
  isActive: (day: number) => boolean,
  kind: "working" | "out",
): PresenceMonthSegment[] {
  const total = daysInMonth(monthKey);
  const segments: PresenceMonthSegment[] = [];
  let start: number | null = null;

  for (let day = 1; day <= total; day++) {
    const active = isActive(day);
    if (active) {
      if (start == null) start = day;
      continue;
    }
    if (start != null) {
      const end = day - 1;
      segments.push({
        startDay: start,
        endDay: end,
        fullMonth: start === 1 && end === total,
        kind,
      });
      start = null;
    }
  }
  if (start != null) {
    segments.push({
      startDay: start,
      endDay: total,
      fullMonth: start === 1,
      kind,
    });
  }
  return segments;
}

export function buildPresenceOverview(
  members: readonly PresenceMember[],
  fromDate: string,
  toDate: string,
): { months: string[]; rows: PresenceOverviewRow[] } {
  const months = monthsInRange(fromDate, toDate);
  const rows: PresenceOverviewRow[] = members.map((member) => {
    const person = toPerson(member);
    const offByDate = new Map(member.heatMap.days.map((day) => [day.date, Boolean(day.off)]));
    return {
      member: person,
      months: months.map((monthKey) => {
        const inWindow = (day: number) => {
          const date = `${monthKey}-${String(day).padStart(2, "0")}`;
          return date >= fromDate && date <= toDate;
        };
        const working = segmentsForKind(
          monthKey,
          (day) => inWindow(day) && !offByDate.get(`${monthKey}-${String(day).padStart(2, "0")}`),
          "working",
        );
        if (working.length > 0) {
          return { monthKey, segments: working };
        }
        const out = segmentsForKind(
          monthKey,
          (day) =>
            inWindow(day) && Boolean(offByDate.get(`${monthKey}-${String(day).padStart(2, "0")}`)),
          "out",
        );
        return { monthKey, segments: out };
      }),
    };
  });
  return { months, rows };
}

export function presenceModeForGrain(
  grain: "week" | "month" | "quarter" | "year",
): "calendar" | "overview" {
  switch (grain) {
    case "week":
    case "month":
      return "calendar";
    case "quarter":
    case "year":
      return "overview";
    default: {
      const _exhaustive: never = grain;
      return _exhaustive;
    }
  }
}

/** Compact label for overview pills. */
export function formatPresenceSegmentLabel(segment: PresenceMonthSegment): string {
  if (segment.fullMonth) return "Full month";
  if (segment.startDay === segment.endDay) return String(segment.startDay);
  return `${segment.startDay}–${segment.endDay}`;
}

export function monthWindowDateKeys(monthKey: string): { fromDate: string; toDate: string } {
  const total = daysInMonth(monthKey);
  return { fromDate: `${monthKey}-01`, toDate: `${monthKey}-${String(total).padStart(2, "0")}` };
}
