/** Agency management panes under Management. */

export type AgencyManagementPaneId = "resourcing" | "tenure" | "money";

type AgencyManagementHubId = "operations" | "commercial";

export type AgencyManagementPane = {
  id: AgencyManagementPaneId;
  label: string;
  /** Optional page subtitle under the pane title (sentence case). */
  subtitle?: string;
  icon: string;
  hub: AgencyManagementHubId;
};

export const AGENCY_MANAGEMENT_PANES: readonly AgencyManagementPane[] = [
  { id: "resourcing", label: "Resourcing", icon: "i-lucide-users", hub: "operations" },
  { id: "tenure", label: "People", icon: "i-lucide-contact", hub: "operations" },
  {
    id: "money",
    label: "Money",
    subtitle: "Client invoices, payroll, and cash in one place.",
    icon: "i-lucide-wallet",
    hub: "commercial",
  },
] as const;

/** Product URL slug per pane. People stays `tenure` internally. */
const AGENCY_MANAGEMENT_PANE_SLUG = {
  resourcing: "resourcing",
  tenure: "people",
  money: "money",
} as const satisfies Record<AgencyManagementPaneId, string>;

const AGENCY_MANAGEMENT_SLUG_PANE = {
  resourcing: "resourcing",
  people: "tenure",
  money: "money",
} as const satisfies Record<string, AgencyManagementPaneId>;

export function isAgencyManagementPaneId(value: unknown): value is AgencyManagementPaneId {
  return AGENCY_MANAGEMENT_PANES.some((pane) => pane.id === value);
}

export function agencyManagementPaneLabel(paneId: AgencyManagementPaneId): string {
  return AGENCY_MANAGEMENT_PANES.find((pane) => pane.id === paneId)?.label ?? paneId;
}

export function agencyManagementPaneSubtitle(paneId: AgencyManagementPaneId): string | undefined {
  return AGENCY_MANAGEMENT_PANES.find((pane) => pane.id === paneId)?.subtitle;
}

/** Canonical href for a Management pane under Agency. */
export function agencyManagementHref(paneId: AgencyManagementPaneId): string {
  return `/agency/management/${AGENCY_MANAGEMENT_PANE_SLUG[paneId]}`;
}

const MANAGEMENT_SLUG_PANE: Record<string, AgencyManagementPaneId> = AGENCY_MANAGEMENT_SLUG_PANE;

export function agencyManagementPaneFromPathname(pathname: string): AgencyManagementPaneId | null {
  const match = /^\/agency\/management\/([^/]+)/.exec(pathname);
  const slug = match?.[1];
  if (!slug) return null;
  return MANAGEMENT_SLUG_PANE[slug] ?? null;
}

export function agencyManagementPaneTabId(paneId: AgencyManagementPaneId): string {
  return `agency-management-pane-${paneId}`;
}
