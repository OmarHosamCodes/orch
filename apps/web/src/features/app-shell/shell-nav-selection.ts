/** Stable ids for shell destination rows and context-bar selection targets. */

import { agencyManagementPaneFromPathname } from "@/features/shared/agency-management-sections";
import { agencySegmentFromPathname } from "@/features/shared/agency-segments";

export type ShellRailNavItemId =
  | "canvas"
  | "agency-tracker"
  | "agency-dashboard"
  | "agency-clients"
  | "agency-projects"
  | "agency-reports"
  | "agency-management"
  | "agency-resourcing"
  | "agency-tenure"
  | "agency-money";

export type ShellContextNavItemId = "context-location-title";

export type ShellNavItemId = ShellRailNavItemId | ShellContextNavItemId;

/** Which rail row owns the traveling selection blob for the current route. */
export function resolveShellRailNavItemId(pathname: string): ShellRailNavItemId {
  if (pathname.startsWith("/canvas") || pathname.startsWith("/node/")) {
    return "canvas";
  }

  const managementPane = agencyManagementPaneFromPathname(pathname);
  if (managementPane) {
    return `agency-${managementPane}` as ShellRailNavItemId;
  }

  const segment = agencySegmentFromPathname(pathname);
  if (segment === "management") {
    return "agency-management";
  }

  switch (segment) {
    case "dashboard":
      return "agency-dashboard";
    case "clients":
      return "agency-clients";
    case "projects":
      return "agency-projects";
    case "reports":
      return "agency-reports";
    case "work":
    default:
      return "agency-tracker";
  }
}

/** Context-bar Current Title that morphs in sync with the rail selection. */
export function resolveShellContextNavItemId(pathname: string): ShellContextNavItemId | null {
  if (
    pathname.startsWith("/canvas") ||
    pathname.startsWith("/node/") ||
    pathname.startsWith("/agency") ||
    pathname === "/profile"
  ) {
    return "context-location-title";
  }

  return null;
}
