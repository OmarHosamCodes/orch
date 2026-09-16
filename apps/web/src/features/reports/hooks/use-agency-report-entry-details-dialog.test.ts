import { describe, expect, test } from "bun:test";

import {
  reportRowAggregationKey,
  type AgencyReportEntry,
} from "@/features/reports/agency-report-grouping";
import {
  reportEntryDetailsDialogCopy,
  selectEntriesForDetailsRow,
} from "@/features/reports/hooks/use-agency-report-entry-details-dialog";
import { groupEntriesByWeek } from "@/features/time-tracking/group-time-entries";

function makeEntry(
  overrides: Partial<AgencyReportEntry> & Pick<AgencyReportEntry, "id">,
): AgencyReportEntry {
  return {
    teamId: "team-1",
    userId: "user-1",
    userName: "Alex",
    projectId: "project-1",
    projectName: "Portal",
    clientId: "client-1",
    clientName: "Acme",
    taskId: "task-1",
    taskTitle: "Peeling",
    taskIconKey: null,
    taskIsWaste: null,
    colorHueId: null,
    projectIconKey: null,
    tags: [],
    links: [],
    source: "manual",
    description: "new peeling",
    isBillable: true,
    isWaste: false,
    startedAt: "2026-01-01T10:00:00.000Z",
    endedAt: "2026-01-01T11:00:00.000Z",
    durationSeconds: 3_600,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T11:00:00.000Z",
    ...overrides,
  };
}

describe("selectEntriesForDetailsRow", () => {
  test("returns empty when row key is null", () => {
    expect(selectEntriesForDetailsRow([makeEntry({ id: "e1" })], null)).toEqual([]);
  });

  test("filters to the aggregated row key and groups multi-entry rows by week", () => {
    const matching = [
      makeEntry({
        id: "e1",
        startedAt: "2026-01-05T10:00:00.000Z",
        endedAt: "2026-01-05T11:00:00.000Z",
      }),
      makeEntry({
        id: "e2",
        startedAt: "2026-01-06T10:00:00.000Z",
        endedAt: "2026-01-06T11:00:00.000Z",
      }),
    ];
    const other = makeEntry({ id: "e3", description: "other work" });
    const rowKey = reportRowAggregationKey(matching[0]!);

    const selected = selectEntriesForDetailsRow([...matching, other], rowKey);
    expect(selected.map((entry) => entry.id).sort()).toEqual(["e1", "e2"]);

    const weeks = groupEntriesByWeek(selected);
    expect(weeks.length).toBeGreaterThanOrEqual(1);
    const dayCount = weeks.reduce((sum, week) => sum + week.days.length, 0);
    expect(dayCount).toBe(2);
  });

  test("honors mergeSameTaskNames when selecting details for a merged row", () => {
    const matching = [
      makeEntry({ id: "e1", taskId: "task-a", taskTitle: "Peeling", description: "a" }),
      makeEntry({ id: "e2", taskId: "task-b", taskTitle: "Peeling", description: "b" }),
    ];
    const other = makeEntry({ id: "e3", taskId: "task-c", taskTitle: "QA", description: "c" });
    const rowKey = reportRowAggregationKey(matching[0]!, { mergeSameTaskNames: true });

    const selected = selectEntriesForDetailsRow([...matching, other], rowKey, {
      mergeSameTaskNames: true,
    });
    expect(selected.map((entry) => entry.id).sort()).toEqual(["e1", "e2"]);
  });
});

describe("reportEntryDetailsDialogCopy", () => {
  test("labels singular and plural entry counts", () => {
    expect(reportEntryDetailsDialogCopy("Peeling", 1)).toEqual({
      title: "Peeling",
      description: "1 time entry",
    });
    expect(reportEntryDetailsDialogCopy("Peeling", 3)).toEqual({
      title: "Peeling",
      description: "3 time entries",
    });
  });
});
