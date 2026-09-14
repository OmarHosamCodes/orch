export const AGENCY_REPORT_SHOW_WASTE_SOURCES = ["projects", "tasks", "entries"] as const;

export type AgencyReportShowWasteSource = (typeof AGENCY_REPORT_SHOW_WASTE_SOURCES)[number];

export type AgencyReportShowWaste = Record<AgencyReportShowWasteSource, boolean>;

export const AGENCY_REPORT_SHOW_WASTE_LABELS: Record<AgencyReportShowWasteSource, string> = {
  projects: "Projects",
  tasks: "Tasks",
  entries: "Entries",
};

export const DEFAULT_AGENCY_REPORT_SHOW_WASTE: AgencyReportShowWaste = {
  projects: false,
  tasks: false,
  entries: false,
};

const sourceSet = new Set<string>(AGENCY_REPORT_SHOW_WASTE_SOURCES);

function isAgencyReportShowWasteSource(value: string): value is AgencyReportShowWasteSource {
  return sourceSet.has(value);
}

export function areSameShowWaste(
  left: AgencyReportShowWaste,
  right: AgencyReportShowWaste,
): boolean {
  return (
    left.projects === right.projects && left.tasks === right.tasks && left.entries === right.entries
  );
}

export function parseShowWasteParam(value: string | null): AgencyReportShowWaste {
  const next = { ...DEFAULT_AGENCY_REPORT_SHOW_WASTE };
  if (!value) return next;
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (isAgencyReportShowWasteSource(trimmed)) {
      next[trimmed] = true;
    }
  }
  return next;
}

export function serializeShowWasteParam(showWaste: AgencyReportShowWaste): string {
  return AGENCY_REPORT_SHOW_WASTE_SOURCES.filter((source) => showWaste[source]).join(",");
}
