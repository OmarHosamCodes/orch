/**
 * Agency segments — single source of truth for the IA.
 *
 * Order is execution-first: Tracker leads because it is the default surface.
 * The shortcut key is the second letter of the `g X` chord
 * (Tracker = `g t`, Dashboard = `g d`, Clients = `g c`, …).
 */
export type AgencySegmentId =
  | "work"
  | "dashboard"
  | "clients"
  | "projects"
  | "reports"
  | "management";

export type LegacyAgencySegmentId = "projects" | "resourcing" | "billing";

export type AgencySegment = {
  id: AgencySegmentId;
  path: string;
  label: string;
  icon: string;
  shortcutKey: string;
  subtitle: string;
};

export const AGENCY_SEGMENTS: readonly AgencySegment[] = [
  {
    id: "work",
    path: "/agency",
    label: "Tracker",
    icon: "i-lucide-timer",
    shortcutKey: "t",
    subtitle: "Track time as you work — start, edit, and log entries.",
  },
  {
    id: "dashboard",
    path: "/agency/dashboard",
    label: "Dashboard",
    icon: "i-lucide-layout-dashboard",
    shortcutKey: "d",
    subtitle: "Live pulse: team activity and project share.",
  },
  {
    id: "clients",
    path: "/agency/clients",
    label: "Clients",
    icon: "i-lucide-building-2",
    shortcutKey: "c",
    subtitle: "Clients and the projects you're delivering for them.",
  },
  {
    id: "projects",
    path: "/agency/projects",
    label: "Projects",
    icon: "i-lucide-folder-kanban",
    shortcutKey: "p",
    subtitle: "Project pipeline, journey, tasks, and delivery activity.",
  },
  {
    id: "reports",
    path: "/agency/reports",
    label: "Reports",
    icon: "i-lucide-bar-chart-3",
    shortcutKey: "r",
    subtitle: "Inspect hours, edit rows, and create exports.",
  },
  {
    id: "management",
    path: "/agency/management/resourcing",
    label: "Management",
    icon: "i-lucide-sliders-horizontal",
    shortcutKey: "m",
    subtitle: "Capacity, people, and money.",
  },
] as const;

export const LEGACY_AGENCY_SEGMENT_MAP = {
  projects: "projects",
  resourcing: "management",
  billing: "management",
} as const satisfies Record<LegacyAgencySegmentId, AgencySegmentId>;

const SEGMENT_BY_ID = Object.fromEntries(
  AGENCY_SEGMENTS.map((entry) => [entry.id, entry]),
) as Record<AgencySegmentId, AgencySegment>;

export function isLegacyAgencySegmentId(value: string | null): value is LegacyAgencySegmentId {
  return value === "projects" || value === "resourcing" || value === "billing";
}

export function isAgencySegmentId(value: string | null): value is AgencySegmentId {
  return value !== null && value in SEGMENT_BY_ID;
}

function normalizeAgencyPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function agencySegmentFromPathname(pathname: string): AgencySegmentId | null {
  const path = normalizeAgencyPath(pathname);
  if (!path.startsWith("/agency")) return null;
  if (path === "/agency/me" || path.startsWith("/agency/members")) return null;
  if (path === "/agency") return "work";
  if (path === "/agency/dashboard" || path.startsWith("/agency/dashboard/")) return "dashboard";
  if (path === "/agency/clients" || path.startsWith("/agency/clients/")) return "clients";
  if (path === "/agency/projects" || path.startsWith("/agency/projects/")) return "projects";
  if (path === "/agency/reports" || path.startsWith("/agency/reports/")) return "reports";
  if (path === "/agency/management" || path.startsWith("/agency/management/")) return "management";
  return null;
}

export function agencySegmentHref(segment: AgencySegmentId): string {
  return SEGMENT_BY_ID[segment].path;
}

export function agencyClientHref(clientId: string): string {
  return `/agency/clients/${encodeURIComponent(clientId)}`;
}

export function agencyProjectHref(projectId: string, options?: { focusTask?: string }): string {
  const base = `/agency/projects/${encodeURIComponent(projectId)}`;
  if (!options?.focusTask) return base;
  return `${base}?focusTask=${encodeURIComponent(options.focusTask)}`;
}

export function agencyReportHref(reportId: string): string {
  return `/agency/reports/${encodeURIComponent(reportId)}`;
}

export function agencyMemberHref(userId: string): string {
  return `/agency/members/${encodeURIComponent(userId)}`;
}

export function agencyTaskHref(taskId: string): string {
  return `/agency?task=${encodeURIComponent(taskId)}`;
}

export function agencySegmentLabel(segment: AgencySegmentId): string {
  return SEGMENT_BY_ID[segment]?.label ?? "Agency";
}

export function agencySegmentTabId(segment: AgencySegmentId): string {
  return `agency-tab-${segment}`;
}
