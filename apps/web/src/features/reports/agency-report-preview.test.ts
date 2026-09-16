import { describe, expect, test } from "bun:test";

import {
  aggregatedWasteKind,
  buildPreviewDocumentClients,
  previewOmissionCaption,
  truncatePreviewClientGroup,
  REPORT_PREVIEW_CLIENT_LIMIT,
  REPORT_PREVIEW_ROWS_PER_CLIENT,
} from "./agency-report-preview";
import type { AggregatedReportRow, DisplayClientGroup } from "./agency-report-grouping";
import { DEFAULT_AGENCY_REPORT_SHOW_WASTE } from "./agency-report-show-waste";

function row(key: string, durationSeconds = 60): AggregatedReportRow {
  return {
    key,
    projectId: "p1",
    projectName: "Site",
    taskId: key,
    taskTitle: key,
    taskIsWaste: false,
    description: key,
    links: [],
    userId: "u1",
    userName: "Ada",
    durationSeconds,
    entryCount: 1,
    entries: [],
  };
}

function group(rows: AggregatedReportRow[]): DisplayClientGroup {
  return {
    clientId: "c1",
    clientName: "Acme",
    totalSeconds: rows.reduce((sum, item) => sum + item.durationSeconds, 0),
    projects: [
      {
        projectId: "p1",
        projectName: "Site",
        colorHueId: 1,
        iconKey: null,
        rows,
        totalSeconds: rows.reduce((sum, item) => sum + item.durationSeconds, 0),
      },
    ],
  };
}

describe("truncatePreviewClientGroup", () => {
  test("keeps eight aggregated rows and counts the rest", () => {
    const rows = Array.from({ length: 10 }, (_, index) => row(`t${index}`));
    const truncated = truncatePreviewClientGroup(group(rows), 8);
    expect(truncated.shownRowCount).toBe(8);
    expect(truncated.totalRowCount).toBe(10);
    expect(truncated.omittedRowCount).toBe(2);
    expect(truncated.group.projects[0]?.rows).toHaveLength(8);
  });
});

describe("previewOmissionCaption", () => {
  test("joins omitted rows and clients", () => {
    expect(previewOmissionCaption({ omittedRowCount: 4, omittedClientCount: 2 })).toBe(
      "4 more rows · 2 clients not shown",
    );
  });

  test("returns null when nothing is omitted", () => {
    expect(previewOmissionCaption({ omittedRowCount: 0, omittedClientCount: 0 })).toBeNull();
  });
});

describe("aggregatedWasteKind", () => {
  test("marks mixed waste as partial", () => {
    const mixed: AggregatedReportRow = {
      ...row("mix"),
      entryCount: 2,
      entries: [
        {
          id: "e1",
          teamId: "t",
          userId: "u1",
          userName: "Ada",
          projectId: "p1",
          taskId: "t1",
          taskTitle: "Build",
          taskIconKey: null,
          taskIsWaste: false,
          projectName: "Site",
          colorHueId: 1,
          projectIconKey: null,
          clientId: "c1",
          clientName: "Acme",
          tags: [],
          links: [],
          source: "manual",
          description: "Build",
          isBillable: true,
          isWaste: true,
          startedAt: "2026-09-01T09:00:00.000Z",
          endedAt: "2026-09-01T10:00:00.000Z",
          durationSeconds: 3600,
          createdAt: "2026-09-01T09:00:00.000Z",
          updatedAt: "2026-09-01T10:00:00.000Z",
        },
        {
          id: "e2",
          teamId: "t",
          userId: "u1",
          userName: "Ada",
          projectId: "p1",
          taskId: "t1",
          taskTitle: "Build",
          taskIconKey: null,
          taskIsWaste: false,
          projectName: "Site",
          colorHueId: 1,
          projectIconKey: null,
          clientId: "c1",
          clientName: "Acme",
          tags: [],
          links: [],
          source: "manual",
          description: "Build",
          isBillable: true,
          isWaste: false,
          startedAt: "2026-09-01T10:00:00.000Z",
          endedAt: "2026-09-01T11:00:00.000Z",
          durationSeconds: 3600,
          createdAt: "2026-09-01T10:00:00.000Z",
          updatedAt: "2026-09-01T11:00:00.000Z",
        },
      ],
    };
    expect(aggregatedWasteKind(mixed)).toBe("partial");
  });
});

describe("buildPreviewDocumentClients", () => {
  test("uses SQL client totals rather than summing the sample rows", () => {
    const built = buildPreviewDocumentClients(
      [
        {
          clientId: "c1",
          clientName: "Acme",
          totalSeconds: 99_000,
          totalEntries: 40,
          amount: 1_000,
          amountCurrency: "USD",
          entries: [],
        },
      ],
      {
        showWaste: DEFAULT_AGENCY_REPORT_SHOW_WASTE,
        mergeSameTaskNames: true,
        excludedEntryIds: new Set(),
      },
    );
    expect(built[0]?.totalSeconds).toBe(99_000);
    expect(built[0]?.amount).toBe(1_000);
    expect(built[0]?.amountLabel).toContain("10");
  });
});

describe("preview caps", () => {
  test("keeps the API client limit and row cap aligned", () => {
    expect(REPORT_PREVIEW_CLIENT_LIMIT).toBe(3);
    expect(REPORT_PREVIEW_ROWS_PER_CLIENT).toBe(8);
  });
});
