/** Shared Agency rail / flyout / crumb navigation tree (segments + Management panes). */

import {
  AGENCY_MANAGEMENT_PANES,
  agencyManagementHref,
  agencyManagementPaneLabel,
  type AgencyManagementPaneId,
} from "@/features/shared/agency-management-sections";
import {
  AGENCY_SEGMENTS,
  agencySegmentHref,
  agencySegmentLabel,
  type AgencySegmentId,
} from "@/features/shared/agency-segments";

export type AgencyPrimarySegmentId = Exclude<AgencySegmentId, "management">;

export const AGENCY_PRIMARY_SEGMENTS = AGENCY_SEGMENTS.filter(
  (entry): entry is (typeof AGENCY_SEGMENTS)[number] & { id: AgencyPrimarySegmentId } =>
    entry.id !== "management",
);

export type AgencyShellNavItem =
  | {
      kind: "segment";
      id: AgencyPrimarySegmentId;
      label: string;
      href: string;
      icon: string;
      shortcutKey: string;
    }
  | {
      kind: "management-pane";
      id: AgencyManagementPaneId;
      label: string;
      href: string;
      icon: string;
    };

export function agencyShellNavItems(): readonly AgencyShellNavItem[] {
  const segments: AgencyShellNavItem[] = AGENCY_PRIMARY_SEGMENTS.map((entry) => ({
    kind: "segment",
    id: entry.id,
    label: entry.label,
    href: agencySegmentHref(entry.id),
    icon: entry.icon,
    shortcutKey: entry.shortcutKey,
  }));

  const panes: AgencyShellNavItem[] = AGENCY_MANAGEMENT_PANES.map((pane) => ({
    kind: "management-pane",
    id: pane.id,
    label: pane.label,
    href: agencyManagementHref(pane.id),
    icon: pane.icon,
  }));

  return [...segments, ...panes];
}

export function agencyShellNavItemCount(): number {
  return agencyShellNavItems().length;
}

export function agencyShellNavItemId(item: AgencyShellNavItem): string {
  return item.kind === "segment" ? `agency-tab-${item.id}` : `agency-management-pane-${item.id}`;
}

export function agencyShellCrumbLabel(
  segment: AgencySegmentId,
  managementPane: AgencyManagementPaneId | null,
): string {
  if (segment === "management" && managementPane) {
    return agencyManagementPaneLabel(managementPane);
  }
  return agencySegmentLabel(segment);
}

export function managementGroupHref(lastPane: AgencyManagementPaneId): string {
  return agencyManagementHref(lastPane);
}
