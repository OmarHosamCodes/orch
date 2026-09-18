import { describe, expect, test } from "bun:test";

import type { AgencyReportEntry } from "@/features/reports/agency-report-grouping";
import type { DisplayClientGroup } from "@/features/reports/agency-report-grouping";
import {
  AGENCY_REPORT_FIELDS,
  allAgencyReportFieldIds,
} from "@/features/reports/agency-report-fields";
import {
  buildAgencyReportExportFileName,
  exportAgencyReportXlsx,
  planAgencyReportExportJobs,
  resolveAgencyReportExportBaseName,
} from "@/features/reports/export-agency-report-xlsx";
import {
  AGENCY_REPORT_EXPORT_COLUMN_WIDTHS,
  AGENCY_REPORT_EXPORT_FONT_SIZES,
  AGENCY_REPORT_EXPORT_PALETTE,
  resolveExportColumnWidths,
} from "@/features/reports/export-agency-report-xlsx-styles";

function makeClientGroup(
  overrides: Partial<DisplayClientGroup> & Pick<DisplayClientGroup, "clientId" | "clientName">,
): DisplayClientGroup {
  return {
    projects: [],
    totalSeconds: 0,
    ...overrides,
  };
}

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
    taskTitle: "Design",
    taskIconKey: null,
    taskIsWaste: null,
    colorHueId: null,
    projectIconKey: null,
    tags: [],
    links: [],
    source: "manual",
    description: "Design review",
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

describe("agency report export planning", () => {
  test("resolves base name from report name or team id", () => {
    expect(resolveAgencyReportExportBaseName("team-1", "Q1 Acme")).toBe("Q1 Acme");
    expect(resolveAgencyReportExportBaseName("team-1")).toBe("agency-report-team-1");
  });

  test("builds combined and per-client filenames", () => {
    expect(buildAgencyReportExportFileName("Report", "2026-07-29")).toBe("Report-2026-07-29.xlsx");
    expect(buildAgencyReportExportFileName("Report", "2026-07-29", "Acme Corp")).toBe(
      "Report-Acme Corp-2026-07-29.xlsx",
    );
  });

  test("combined mode yields one job with all clients", () => {
    const clients = [
      makeClientGroup({ clientId: "c1", clientName: "Acme", totalSeconds: 100 }),
      makeClientGroup({ clientId: "c2", clientName: "Beta", totalSeconds: 200 }),
    ];
    const jobs = planAgencyReportExportJobs(clients, "combined", "Report", "2026-07-29");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.fileName).toBe("Report-2026-07-29.xlsx");
    expect(jobs[0]?.clientGroups).toHaveLength(2);
  });

  test("per-client mode yields one job per client with client in filename", () => {
    const clients = [
      makeClientGroup({ clientId: "c1", clientName: "Acme", totalSeconds: 100 }),
      makeClientGroup({ clientId: "c2", clientName: "Beta", totalSeconds: 200 }),
    ];
    const jobs = planAgencyReportExportJobs(clients, "per-client", "Report", "2026-07-29");
    expect(jobs).toHaveLength(2);
    expect(jobs.map((job) => job.fileName)).toEqual([
      "Report-Acme-2026-07-29.xlsx",
      "Report-Beta-2026-07-29.xlsx",
    ]);
    expect(jobs[0]?.clientGroups).toEqual([clients[0]]);
    expect(jobs[1]?.clientGroups).toEqual([clients[1]]);
  });

  test("per-client mode with no clients yields zero jobs", () => {
    expect(planAgencyReportExportJobs([], "per-client", "Report", "2026-07-29")).toEqual([]);
  });
});

describe("agency report export styles", () => {
  test("column width map covers every report field", () => {
    for (const field of AGENCY_REPORT_FIELDS) {
      expect(AGENCY_REPORT_EXPORT_COLUMN_WIDTHS[field]).toBeGreaterThan(0);
    }
  });

  test("resolveExportColumnWidths follows active field order", () => {
    const widths = resolveExportColumnWidths(["duration", "task"]);
    expect(widths).toEqual([
      { width: AGENCY_REPORT_EXPORT_COLUMN_WIDTHS.duration },
      { width: AGENCY_REPORT_EXPORT_COLUMN_WIDTHS.task },
    ]);
  });

  test("palette and font sizes stay in the large-type readable range", () => {
    expect(AGENCY_REPORT_EXPORT_FONT_SIZES.client).toBeGreaterThanOrEqual(14);
    expect(AGENCY_REPORT_EXPORT_FONT_SIZES.project).toBeGreaterThanOrEqual(14);
    expect(AGENCY_REPORT_EXPORT_FONT_SIZES.body).toBeGreaterThanOrEqual(11);
    expect(AGENCY_REPORT_EXPORT_PALETTE.clientBanner).toMatch(/^FF[0-9A-F]{6}$/i);
    expect(AGENCY_REPORT_EXPORT_PALETTE.headerFill).toMatch(/^FF[0-9A-F]{6}$/i);
  });
});

describe("agency report export workbook smoke", () => {
  test("writes client banner fill, larger project type, and skips cover meta", async () => {
    const file = await exportAgencyReportXlsx({
      teamId: "team-1",
      reportName: "Q1 Acme",
      entries: [
        makeEntry({ id: "e1", projectId: "p1", projectName: "Portal" }),
        makeEntry({
          id: "e2",
          projectId: "p2",
          projectName: "Mobile",
          taskId: "task-2",
          taskTitle: "Ship",
        }),
      ],
      excludedEntryIds: new Set(),
      entryOverrides: new Map(),
      visibleFields: allAgencyReportFieldIds(),
    });

    expect(file.blob.size).toBeGreaterThan(0);

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.blob.arrayBuffer();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Report");
    expect(sheet).toBeDefined();

    // No cover: sheet starts with the client banner.
    const clientCell = sheet!.getCell(1, 1);
    expect(clientCell.value).toBe("Acme");
    expect(clientCell.fill).toMatchObject({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: AGENCY_REPORT_EXPORT_PALETTE.clientBanner },
    });
    expect(clientCell.font?.size).toBe(AGENCY_REPORT_EXPORT_FONT_SIZES.client);

    const headerCell = sheet!.getCell(2, 1);
    expect(headerCell.value).toBe("Project");
    expect(headerCell.font?.size).toBe(AGENCY_REPORT_EXPORT_FONT_SIZES.header);
    expect(headerCell.fill).toMatchObject({
      fgColor: { argb: AGENCY_REPORT_EXPORT_PALETTE.headerFill },
    });

    const projectCell = sheet!.getCell(3, 1);
    expect(projectCell.value).toBe("Mobile");
    expect(projectCell.font?.size).toBe(AGENCY_REPORT_EXPORT_FONT_SIZES.project);
    expect(projectCell.font?.bold).toBe(true);

    // Blank spacer between projects, then Portal on the next data row.
    expect(sheet!.getCell(4, 1).value).toBeNull();
    expect(sheet!.getCell(5, 1).value).toBe("Portal");
  });

  test("writes period from/to columns when selected", async () => {
    const file = await exportAgencyReportXlsx({
      teamId: "team-1",
      reportName: "Tenure month",
      entries: [
        makeEntry({ id: "e1", projectId: "p1", projectName: "Designs" }),
        makeEntry({
          id: "e2",
          projectId: "p1",
          projectName: "Designs",
          taskId: "task-2",
          taskTitle: "Ship",
          description: "other",
        }),
      ],
      excludedEntryIds: new Set(),
      entryOverrides: new Map(),
      visibleFields: ["from", "to", "project", "task", "description", "duration"],
      mergeSameTaskNames: true,
      rangeFrom: "2026-05-26T00:00:00.000Z",
      rangeTo: "2026-06-25T23:59:59.999Z",
    });

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.blob.arrayBuffer());
    const sheet = workbook.getWorksheet("Report");
    expect(sheet).toBeDefined();

    expect(sheet!.getCell(2, 1).value).toBe("From");
    expect(sheet!.getCell(2, 2).value).toBe("To");
    expect(sheet!.getCell(3, 1).value).toBe("26 May");
    expect(sheet!.getCell(3, 2).value).toBe("25 Jun");
  });
});
