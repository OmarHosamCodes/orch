import { describe, expect, test } from "bun:test";

import {
  agencyQuestionRetryNote,
  agencyToolRetryNote,
  agencyUiPresentRetryNote,
  buildAgencyMonthHoursArtifact,
  shouldBootstrapAgencyMonthReports,
} from "./agency-reports-canvas";

describe("buildAgencyMonthHoursArtifact", () => {
  test("builds a schema canvas with composition and tables", () => {
    const artifact = buildAgencyMonthHoursArtifact(
      {
        totalSeconds: 10_800,
        composition: {
          paidSeconds: 7_200,
          wasteSeconds: 1_800,
          internalSeconds: 1_800,
          totalSeconds: 10_800,
        },
        byClient: [],
        byProject: [
          {
            projectId: "p1",
            projectName: "Alpha",
            clientName: "Acme",
            seconds: 7_200,
            wasteSeconds: 1_800,
            nonWasteSeconds: 5_400,
          },
        ],
        byMember: [
          {
            userId: "u1",
            userName: "Omar",
            seconds: 10_800,
            wasteSeconds: 1_800,
            nonWasteSeconds: 9_000,
          },
        ],
      },
      "2026-08-01",
      "2026-08-04",
    );

    expect(artifact.kind).toBe("schema");
    expect(artifact.title).toContain("2026-08-01");
    if (artifact.kind !== "schema") throw new Error("expected schema artifact");
    expect(artifact.schema.root.type).toBe("stack");
  });
});

describe("agency month-reports bootstrap gates", () => {
  test("bootstraps Ask only", () => {
    expect(shouldBootstrapAgencyMonthReports("ask")).toBe(true);
    expect(shouldBootstrapAgencyMonthReports("plan")).toBe(false);
    expect(shouldBootstrapAgencyMonthReports("agent")).toBe(false);
  });

  test("retry notes ask for Agency tools without ui_present", () => {
    expect(agencyToolRetryNote("ask")).toContain("get_agency_reports_summary");
    expect(agencyToolRetryNote("ask")).not.toContain("ui_present");
    expect(agencyToolRetryNote("agent")).toContain("get_agency_reports_summary");
  });

  test("ui_present retry notes are retired", () => {
    expect(agencyUiPresentRetryNote("ask")).not.toContain("ui_present");
  });

  test("question retry note is retired", () => {
    expect(agencyQuestionRetryNote("ask")).toBeNull();
    expect(agencyQuestionRetryNote("agent")).toBeNull();
    expect(agencyQuestionRetryNote("plan")).toBeNull();
  });
});
