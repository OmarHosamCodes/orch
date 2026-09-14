import {
  formatAgencyWeekLabel,
  getLocalWeekStartKey,
  localDateKeyFromIso,
} from "@/features/time-tracking/format-agency-day-label";

export type TimeEntryRecord = {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  taskIsWaste?: boolean | null;
  isWaste?: boolean | null;
  projectName: string;
  clientId: string;
  clientName: string;
  tags?: Array<{ id: string; name: string }>;
  links?: Array<{ id: string; url: string }>;
  source: "timer" | "manual";
  description: string;
  isBillable?: boolean;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type CollapsedEntryGroup = {
  collapseKey: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string;
  projectName: string;
  clientName: string;
  description: string;
  totalSeconds: number;
  entries: TimeEntryRecord[];
};

export type TimeEntryDayGroup = {
  dateKey: string;
  totalSeconds: number;
  groups: CollapsedEntryGroup[];
};

export type TimeEntryWeekGroup = {
  weekStartKey: string;
  label: string;
  totalSeconds: number;
  days: TimeEntryDayGroup[];
};

export type VirtualTimeEntryDay = {
  key: string;
  day: TimeEntryDayGroup;
  week: Pick<TimeEntryWeekGroup, "weekStartKey" | "label" | "totalSeconds"> | null;
};

export function flattenTimeEntryWeeksForVirtualization(
  weeks: TimeEntryWeekGroup[],
): VirtualTimeEntryDay[] {
  return weeks.flatMap((week) =>
    week.days.map((day, index) => ({
      key: `${week.weekStartKey}:${day.dateKey}`,
      day,
      week:
        index === 0
          ? {
              weekStartKey: week.weekStartKey,
              label: week.label,
              totalSeconds: week.totalSeconds,
            }
          : null,
    })),
  );
}

function collapseKeyFor(entry: TimeEntryRecord): string {
  const taskKey = entry.taskId ?? `project-only:${entry.projectId}`;
  return `${taskKey}||${entry.description ?? ""}`;
}

function collapseDuplicatesWithinDay(entries: TimeEntryRecord[]): CollapsedEntryGroup[] {
  const map = new Map<string, CollapsedEntryGroup>();

  for (const entry of entries) {
    const key = collapseKeyFor(entry);
    const existing = map.get(key);

    if (existing) {
      existing.totalSeconds += entry.durationSeconds;
      existing.entries.push(entry);
    } else {
      map.set(key, {
        collapseKey: key,
        projectId: entry.projectId,
        taskId: entry.taskId,
        taskTitle: entry.taskTitle ?? "",
        projectName: entry.projectName,
        clientName: entry.clientName,
        description: entry.description,
        totalSeconds: entry.durationSeconds,
        entries: [entry],
      });
    }
  }

  return [...map.values()].sort(
    (left, right) =>
      new Date(right.entries[0]!.startedAt).getTime() -
      new Date(left.entries[0]!.startedAt).getTime(),
  );
}

/**
 * Bulk edit selects entries, not collapsed groups. Expand multi-entry
 * groups into one selectable row per entry so every row gets a checkbox.
 */
export function flattenCollapsedGroupsForBulkEdit(
  groups: CollapsedEntryGroup[],
): CollapsedEntryGroup[] {
  return groups.flatMap((group) => {
    if (group.entries.length <= 1) return [group];
    return group.entries.map((entry) => ({
      collapseKey: `${group.collapseKey}||${entry.id}`,
      projectId: entry.projectId,
      taskId: entry.taskId,
      taskTitle: entry.taskTitle ?? group.taskTitle,
      projectName: entry.projectName,
      clientName: entry.clientName,
      description: entry.description,
      totalSeconds: entry.durationSeconds,
      entries: [entry],
    }));
  });
}

function groupEntriesByDay(entries: TimeEntryRecord[]): TimeEntryDayGroup[] {
  const byDay = new Map<string, TimeEntryRecord[]>();

  for (const entry of entries) {
    const dateKey = localDateKeyFromIso(entry.startedAt);
    if (!dateKey) continue;
    const bucket = byDay.get(dateKey) ?? [];
    bucket.push(entry);
    byDay.set(dateKey, bucket);
  }

  return [...byDay.entries()]
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
    .map(([dateKey, dayEntries]) => {
      const sorted = [...dayEntries].sort(
        (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
      );
      const groups = collapseDuplicatesWithinDay(sorted);
      return {
        dateKey,
        totalSeconds: sorted.reduce((sum, entry) => sum + entry.durationSeconds, 0),
        groups,
      };
    });
}

export function groupEntriesByWeek(
  entries: TimeEntryRecord[],
  referenceDate = new Date(),
  weekStartsOn = 1,
): TimeEntryWeekGroup[] {
  const dayGroups = groupEntriesByDay(entries);
  const byWeek = new Map<string, TimeEntryDayGroup[]>();

  for (const day of dayGroups) {
    const weekStartKey = getLocalWeekStartKey(day.dateKey, weekStartsOn);
    const bucket = byWeek.get(weekStartKey) ?? [];
    bucket.push(day);
    byWeek.set(weekStartKey, bucket);
  }

  return [...byWeek.entries()]
    .sort(([leftWeek], [rightWeek]) => rightWeek.localeCompare(leftWeek))
    .map(([weekStartKey, days]) => ({
      weekStartKey,
      label: formatAgencyWeekLabel(weekStartKey, referenceDate, weekStartsOn),
      totalSeconds: days.reduce((sum, day) => sum + day.totalSeconds, 0),
      days,
    }));
}
