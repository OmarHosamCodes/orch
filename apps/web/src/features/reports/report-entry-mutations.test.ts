import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

import {
  removeReportEntriesFromCache,
  restoreReportsEntrySnapshots,
  snapshotReportsEntryQueries,
  type ReportEntryPatch,
} from "@/features/reports/report-entry-mutations";
import type { AgencyReportEntry } from "@/features/reports/agency-report-grouping";

function makeEntry(id: string): AgencyReportEntry {
  return {
    id,
    teamId: "team-1",
    userId: "user-1",
    userName: "Alex",
    projectId: "project-1",
    projectName: "Portal",
    clientId: "client-1",
    clientName: "Acme",
    taskId: "task-1",
    taskTitle: "Task",
    taskIconKey: null,
    taskIsWaste: null,
    colorHueId: null,
    projectIconKey: null,
    tags: [],
    links: [],
    source: "manual",
    description: "Work",
    isBillable: true,
    isWaste: false,
    startedAt: "2026-08-01T09:00:00.000Z",
    endedAt: "2026-08-01T10:00:00.000Z",
    durationSeconds: 3600,
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
  };
}

describe("report-entry-mutations cache helpers", () => {
  test("removeReportEntriesFromCache drops targeted ids only", () => {
    const queryClient = new QueryClient();
    const queryKey = ["agency-reports", "entries", "team-1", "from", "to"];
    queryClient.setQueryData(queryKey, [makeEntry("a"), makeEntry("b")]);

    removeReportEntriesFromCache(queryClient, "team-1", new Set(["a"]));

    expect(
      queryClient.getQueryData<AgencyReportEntry[]>(queryKey)?.map((entry) => entry.id),
    ).toEqual(["b"]);
  });

  test("restoreReportsEntrySnapshots rolls back optimistic delete", () => {
    const queryClient = new QueryClient();
    const queryKey = ["agency-reports", "entries", "team-1", "from", "to"];
    const original = [makeEntry("a"), makeEntry("b")];
    queryClient.setQueryData(queryKey, original);
    const snapshots = snapshotReportsEntryQueries(queryClient, "team-1");

    removeReportEntriesFromCache(queryClient, "team-1", new Set(["a"]));
    restoreReportsEntrySnapshots(queryClient, snapshots);

    expect(queryClient.getQueryData<AgencyReportEntry[]>(queryKey)).toEqual(original);
  });
});

describe("ReportEntryPatch", () => {
  test("accepts full edit payload shape", () => {
    const patch: ReportEntryPatch = {
      startAt: "2026-08-01T09:00:00.000Z",
      endAt: "2026-08-01T10:00:00.000Z",
      description: "Updated",
      projectId: "project-1",
      taskId: "task-1",
      tagIds: ["tag-1"],
      isBillable: false,
      isWaste: true,
    };
    expect(patch.description).toBe("Updated");
  });
});
