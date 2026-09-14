/** Legacy Agency query-page → path redirects (bookmarks + notification emails). */

import {
  agencyManagementHref,
  isAgencyManagementPaneId,
  type AgencyManagementPaneId,
} from "@/features/shared/agency-management-sections";
import {
  agencyClientHref,
  agencyProjectHref,
  agencyReportHref,
  agencySegmentHref,
  isAgencySegmentId,
  isLegacyAgencySegmentId,
  LEGACY_AGENCY_SEGMENT_MAP,
} from "@/features/shared/agency-segments";

const AGENCY_PRESERVED_SEARCH_KEYS = [
  "from",
  "to",
  "fields",
  "showWaste",
  "mergeTasks",
  "focus",
  "alertId",
  "day",
  "period",
  "redirect",
  "error",
  "checkout_id",
  "mode",
  "task",
] as const;

const LEGACY_PAGE_KEYS = [
  "section",
  "manage",
  "project",
  "client",
  "report",
  "tab",
  "filter",
  "pane",
] as const;

function isAgencyRoot(pathname: string): boolean {
  return pathname === "/agency" || pathname === "/agency/";
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function splitHref(href: string): { pathname: string; search: string } {
  const queryIndex = href.indexOf("?");
  if (queryIndex === -1) return { pathname: href, search: "" };
  return { pathname: href.slice(0, queryIndex), search: href.slice(queryIndex + 1) };
}

function preservedSearch(params: URLSearchParams): string {
  const next = new URLSearchParams();
  for (const key of AGENCY_PRESERVED_SEARCH_KEYS) {
    const value = params.get(key);
    if (value) next.set(key, value);
  }
  return next.toString();
}

function withSearch(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

function isProfilePath(pathname: string): boolean {
  return pathname === "/agency/me" || pathname.startsWith("/agency/members/");
}

function onProjectsPath(pathname: string): boolean {
  return pathname === "/agency/projects" || pathname.startsWith("/agency/projects/");
}

function onClientsPath(pathname: string): boolean {
  return pathname === "/agency/clients" || pathname.startsWith("/agency/clients/");
}

function onReportsPath(pathname: string): boolean {
  return pathname === "/agency/reports" || pathname.startsWith("/agency/reports/");
}

function resolveManagementPane(
  section: string | null,
  manage: string | null,
): AgencyManagementPaneId {
  if (manage === "invoices" || manage === "billing") return "money";
  if (manage === "rates") return "tenure";
  if (isAgencyManagementPaneId(manage)) return manage;
  if (section === "billing") return "money";
  if (section === "resourcing" || section === "settings") return "resourcing";
  return "resourcing";
}

function resolveLegacyTargetPath(pathname: string, params: URLSearchParams): string {
  const section = params.get("section");
  const manage = params.get("manage");
  const project = params.get("project");
  const client = params.get("client");
  const report = params.get("report");
  const currentPath = normalizePathname(pathname);

  if (
    project &&
    (section === "projects" || isAgencyRoot(pathname) || onProjectsPath(currentPath))
  ) {
    return agencyProjectHref(project);
  }
  if (client && (section === "clients" || isAgencyRoot(pathname) || onClientsPath(currentPath))) {
    return agencyClientHref(client);
  }
  if (report && (section === "reports" || isAgencyRoot(pathname) || onReportsPath(currentPath))) {
    return agencyReportHref(report);
  }

  if (manage === "tags") {
    return "/agency";
  }

  const isManagementQuery =
    section === "settings" ||
    section === "resourcing" ||
    section === "billing" ||
    section === "management" ||
    manage === "invoices" ||
    manage === "billing" ||
    isAgencyManagementPaneId(manage);

  if (isManagementQuery) {
    return agencyManagementHref(resolveManagementPane(section, manage));
  }

  if (section === "" || section === "work") {
    return agencySegmentHref("work");
  }

  if (isAgencySegmentId(section)) {
    const listHref = agencySegmentHref(section);
    const listPath = section === "management" ? "/agency/management" : listHref;
    if (currentPath === listPath || currentPath.startsWith(`${listPath}/`)) {
      return currentPath;
    }
    return listHref;
  }

  if (section && isLegacyAgencySegmentId(section)) {
    const mapped = LEGACY_AGENCY_SEGMENT_MAP[section];
    if (mapped === "management") {
      return agencyManagementHref(resolveManagementPane(section, manage));
    }
    return agencySegmentHref(mapped);
  }

  return isAgencyRoot(pathname) ? agencySegmentHref("work") : currentPath;
}

export function resolveLegacyAgencyRedirect(pathname: string, search: string): string | null {
  if (!pathname.startsWith("/agency")) return null;

  const currentPath = normalizePathname(pathname);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  if (currentPath === "/agency/management/tenure") {
    return withSearch(agencyManagementHref("tenure"), preservedSearch(params));
  }
  if (currentPath === "/agency/management") {
    return withSearch(agencyManagementHref("resourcing"), preservedSearch(params));
  }

  if (isProfilePath(currentPath)) {
    const hasLegacyKey = LEGACY_PAGE_KEYS.some((key) => params.has(key));
    if (!hasLegacyKey) return null;
    const href = withSearch(currentPath, preservedSearch(params));
    const current = withSearch(currentPath, params.toString());
    return href === current ? null : href;
  }

  const hasLegacyKey = LEGACY_PAGE_KEYS.some((key) => params.has(key));
  if (!hasLegacyKey) return null;

  const targetPath = resolveLegacyTargetPath(pathname, params);
  const href = withSearch(targetPath, preservedSearch(params));
  const current = withSearch(currentPath, params.toString());
  return href === current ? null : href;
}

export function legacyAgencyRedirectFromHref(href: string): string | null {
  const { pathname, search } = splitHref(href);
  return resolveLegacyAgencyRedirect(pathname, search);
}
