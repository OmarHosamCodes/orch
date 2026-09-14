import { describe, expect, test } from "bun:test";

import { legacyAgencyRedirectFromHref } from "./agency-legacy-redirects";
import { agencyManagementHref } from "./agency-management-sections";
import { buildAgencyMoneyPeriodHref, buildAgencyReportsPeriodHref } from "./agency-period-query";
import {
  agencyClientHref,
  agencyProjectHref,
  agencyReportHref,
  agencySegmentHref,
  type AgencySegmentId,
} from "./agency-segments";

const QUERY_PAGE_MARKERS = ["section=", "manage=", "?project=", "?client=", "?report="];

function assertCanonicalPath(href: string) {
  for (const marker of QUERY_PAGE_MARKERS) {
    expect(href.includes(marker)).toBe(false);
  }
}

describe("agency href builders", () => {
  test("segment hrefs are paths, not query pages", () => {
    const segments: AgencySegmentId[] = [
      "work",
      "dashboard",
      "clients",
      "projects",
      "reports",
      "management",
    ];
    const hrefs = Object.fromEntries(segments.map((id) => [id, agencySegmentHref(id)]));
    expect(hrefs).toEqual({
      work: "/agency",
      dashboard: "/agency/dashboard",
      clients: "/agency/clients",
      projects: "/agency/projects",
      reports: "/agency/reports",
      management: "/agency/management/resourcing",
    });
    for (const href of Object.values(hrefs)) assertCanonicalPath(href);
  });

  test("management People slug is /people with tenure pane id", () => {
    expect(agencyManagementHref("resourcing")).toBe("/agency/management/resourcing");
    expect(agencyManagementHref("tenure")).toBe("/agency/management/people");
    expect(agencyManagementHref("money")).toBe("/agency/management/money");
    assertCanonicalPath(agencyManagementHref("tenure"));
  });

  test("detail hrefs are path segments", () => {
    expect(agencyClientHref("cli_1")).toBe("/agency/clients/cli_1");
    expect(agencyProjectHref("prj_1")).toBe("/agency/projects/prj_1");
    expect(agencyReportHref("rep_1")).toBe("/agency/reports/rep_1");
  });

  test("period handoff hrefs keep from/to as search", () => {
    expect(buildAgencyReportsPeriodHref({ from: "2026-08-01", to: "2026-08-31" })).toBe(
      "/agency/reports?from=2026-08-01&to=2026-08-31",
    );
    expect(buildAgencyMoneyPeriodHref({ from: "2026-08-01", to: "2026-08-31" })).toBe(
      "/agency/management/money?from=2026-08-01&to=2026-08-31",
    );
  });
});

const AGENCY_LEGACY_REDIRECT_CASES: ReadonlyArray<{ from: string; to: string }> = [
  { from: "/agency?section=settings", to: "/agency/management/resourcing" },
  { from: "/agency?section=resourcing", to: "/agency/management/resourcing" },
  { from: "/agency?section=billing", to: "/agency/management/money" },
  { from: "/agency?section=management&manage=invoices", to: "/agency/management/money" },
  { from: "/agency?section=management&manage=billing", to: "/agency/management/money" },
  { from: "/agency?section=management&manage=tenure", to: "/agency/management/people" },
  { from: "/agency?section=management&manage=rates", to: "/agency/management/people" },
  { from: "/agency?manage=rates", to: "/agency/management/people" },
  { from: "/agency?section=management&manage=tags", to: "/agency" },
  { from: "/agency?manage=tags", to: "/agency" },
  { from: "/agency?section=management&manage=money", to: "/agency/management/money" },
  { from: "/agency?section=management", to: "/agency/management/resourcing" },
  { from: "/agency?section=work", to: "/agency" },
  { from: "/agency?section=", to: "/agency" },
  { from: "/agency?section=dashboard", to: "/agency/dashboard" },
  { from: "/agency?section=clients", to: "/agency/clients" },
  { from: "/agency?section=projects", to: "/agency/projects" },
  { from: "/agency?section=reports", to: "/agency/reports" },
  { from: "/agency?section=projects&project=prj_1", to: "/agency/projects/prj_1" },
  { from: "/agency?section=clients&client=cli_1", to: "/agency/clients/cli_1" },
  { from: "/agency?section=reports&report=rep_1", to: "/agency/reports/rep_1" },
  {
    from: "/agency?section=reports&from=2026-08-01&to=2026-08-31",
    to: "/agency/reports?from=2026-08-01&to=2026-08-31",
  },
  { from: "/agency?tab=foo&task=t1&filter=bar", to: "/agency?task=t1" },
  { from: "/agency/reports?report=rep_1", to: "/agency/reports/rep_1" },
  { from: "/agency/projects?project=prj_1", to: "/agency/projects/prj_1" },
  { from: "/agency/clients?client=cli_1", to: "/agency/clients/cli_1" },
  {
    from: "/agency/reports?from=2026-08-01&to=2026-08-31&report=rep_1",
    to: "/agency/reports/rep_1?from=2026-08-01&to=2026-08-31",
  },
  { from: "/agency/management/tenure", to: "/agency/management/people" },
  { from: "/agency/management", to: "/agency/management/resourcing" },
  { from: "/agency/members/u1?section=dashboard", to: "/agency/members/u1" },
];

describe("legacy agency redirects", () => {
  test("maps query-page bookmarks onto canonical paths", () => {
    for (const { from, to } of AGENCY_LEGACY_REDIRECT_CASES) {
      expect(legacyAgencyRedirectFromHref(from)).toBe(to);
      assertCanonicalPath(to);
    }
  });

  test("leaves filter-only search on new paths alone", () => {
    expect(
      legacyAgencyRedirectFromHref("/agency/reports?from=2026-08-01&to=2026-08-31"),
    ).toBeNull();
    expect(legacyAgencyRedirectFromHref("/agency/members/u1?focus=alerts&alertId=a1")).toBeNull();
  });

  test("strips leftover section on an already-canonical path", () => {
    expect(legacyAgencyRedirectFromHref("/agency/dashboard?section=dashboard")).toBe(
      "/agency/dashboard",
    );
    expect(legacyAgencyRedirectFromHref("/agency/projects/prj_1?section=projects")).toBe(
      "/agency/projects/prj_1",
    );
  });
});
