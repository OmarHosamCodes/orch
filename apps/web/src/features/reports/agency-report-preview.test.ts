import { describe, expect, test } from "bun:test";

import {
  aggregatedWasteKind,
  buildPreviewDocumentClients,
  countPreviewClientRows,
} from "./agency-report-preview";
import type { AggregatedReportRow, AgencyReportEntry } from "./agency-report-grouping";
import { DEFAULT_AGENCY_REPORT_SHOW_WASTE } from "./agency-report-show-waste";

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

describe("countPreviewClientRows", () => {
  test("counts every aggregated row across projects", () => {
    expect(
      countPreviewClientRows({
        group: {
          clientId: "c1",
          clientName: "Acme",
          totalSeconds: 600,
          projects: [
            {
              projectId: "p1",
              projectName: "Site",
              colorHueId: 1,
              iconKey: null,
              rows: [row("a"), row("b")],
              totalSeconds: 120,
            },
            {
              projectId: "p2",
              projectName: "App",
              colorHueId: 2,
              iconKey: null,
              rows: [row("c")],
              totalSeconds: 60,
            },
          ],
        },
      }),
    ).toBe(3);
  });
});

describe("aggregatedWasteKind", () => {
  test("marks mixed waste as partial", () => {
    const mixed: AggregatedReportRow = {
      ...row("mix"),
      entryCount: 2,
      entries: [
        makeEntry({ id: "e1", isWaste: true, durationSeconds: 3600 }),
        makeEntry({
          id: "e2",
          isWaste: false,
          startedAt: "2026-01-01T11:00:00.000Z",
          endedAt: "2026-01-01T12:00:00.000Z",
        }),
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
          entries: [makeEntry({ id: "e1" })],
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
    expect(built[0]?.rowCount).toBe(1);
  });

  test("keeps every client chapter and every grouped row", () => {
    const names = ["Acme", "Delta", "North", "Zebra"] as const;
    const samples = names.map((clientName, clientIndex) => ({
      clientId: `c${clientIndex}`,
      clientName,
      totalSeconds: 3_600 * (clientIndex + 1),
      totalEntries: 10,
      amount: null,
      amountCurrency: null,
      entries: Array.from({ length: 10 }, (_, rowIndex) =>
        makeEntry({
          id: `c${clientIndex}-e${rowIndex}`,
          clientId: `c${clientIndex}`,
          clientName,
          taskId: `t${rowIndex}`,
          taskTitle: `Task ${rowIndex}`,
          description: `Task ${rowIndex}`,
          durationSeconds: 60,
        }),
      ),
    }));

    const built = buildPreviewDocumentClients(samples, {
      showWaste: DEFAULT_AGENCY_REPORT_SHOW_WASTE,
      mergeSameTaskNames: true,
      excludedEntryIds: new Set(),
    });

    expect(built.map((client) => client.clientName)).toEqual([...names]);
    expect(built.every((client) => client.rowCount === 10)).toBe(true);
  });

  test("drops chapters with no visible rows after exclude", () => {
    const built = buildPreviewDocumentClients(
      [
        {
          clientId: "c1",
          clientName: "Acme",
          totalSeconds: 3_600,
          totalEntries: 1,
          amount: null,
          amountCurrency: null,
          entries: [makeEntry({ id: "keep" })],
        },
        {
          clientId: "c2",
          clientName: "Delta",
          totalSeconds: 1_800,
          totalEntries: 1,
          amount: null,
          amountCurrency: null,
          entries: [makeEntry({ id: "drop", clientId: "c2", clientName: "Delta" })],
        },
      ],
      {
        showWaste: DEFAULT_AGENCY_REPORT_SHOW_WASTE,
        mergeSameTaskNames: true,
        excludedEntryIds: new Set(["drop"]),
      },
    );

    expect(built.map((client) => client.clientName)).toEqual(["Acme"]);
  });
});
