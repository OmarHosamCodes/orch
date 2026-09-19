/** Current Title location chrome — one leaf name, grouped destinations, quiet nested back. */

import { findActiveNavItem } from "@/features/app-shell/app-navigation";
import {
  AGENCY_MANAGEMENT_PANES,
  agencyManagementHref,
  agencyManagementPaneFromPathname,
  agencyManagementPaneLabel,
  type AgencyManagementPaneId,
} from "@/features/shared/agency-management-sections";
import {
  AGENCY_SEGMENTS,
  agencySegmentFromPathname,
  agencySegmentHref,
  agencySegmentLabel,
} from "@/features/shared/agency-segments";

export type ShellLocationGroupId = "product" | "agency" | "management";

type ShellLocationDestinationKind = "product" | "segment" | "management-pane";

export type ShellLocationDestination = {
  id: string;
  kind: ShellLocationDestinationKind;
  group: ShellLocationGroupId;
  href: string;
  label: string;
  icon: string;
  shortcut?: string;
};

type ShellLocationParent = {
  href: string;
  label: string;
};

export type ShellLocation = {
  title: string;
  parent: ShellLocationParent | null;
  destinations: ShellLocationDestination[];
};

export type ShellLocationOverlays = {
  memberName?: string | null;
  projectName?: string | null;
  clientName?: string | null;
  nodeTitle?: string | null;
  sessionName?: string | null;
  canvasWorkspaceTitle?: string | null;
};

export type ShellLocationOptions = {
  lastManagementPane?: AgencyManagementPaneId;
};

const PRODUCT_DESTINATIONS: readonly ShellLocationDestination[] = [
  {
    id: "product-canvas",
    kind: "product",
    group: "product",
    href: "/canvas",
    label: "Canvas",
    icon: "i-lucide-layout-dashboard",
  },
  {
    id: "product-agency",
    kind: "product",
    group: "product",
    href: "/agency",
    label: "Agency",
    icon: "i-lucide-briefcase",
  },
];

/** First path segment after `base`, or null when this is the base itself. */
export function shellEntityIdAfter(pathname: string, base: string): string | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
  if (normalized === prefix) return null;
  if (!normalized.startsWith(`${prefix}/`)) return null;
  const id = normalized
    .slice(prefix.length + 1)
    .split("/")
    .find((part) => part.length > 0);
  return id ?? null;
}

function shellTaskIdFromSearch(search: string): string | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const value = new URLSearchParams(raw).get("task");
  return value && value.length > 0 ? value : null;
}

/** Wrap-around arrow / Home / End index math for the location menu. */
export function nextLocationIndex(
  currentIndex: number,
  key: string,
  lastIndex: number,
): number | null {
  switch (key) {
    case "ArrowDown":
      return currentIndex >= lastIndex ? 0 : currentIndex + 1;
    case "ArrowUp":
      return currentIndex <= 0 ? lastIndex : currentIndex - 1;
    case "Home":
      return 0;
    case "End":
      return lastIndex;
    default:
      return null;
  }
}

export function shellLocationGroupLabel(group: ShellLocationGroupId): string {
  switch (group) {
    case "product":
      return "Products";
    case "agency":
      return "Agency";
    case "management":
      return "Management";
    default: {
      const _exhaustive: never = group;
      return _exhaustive;
    }
  }
}

export function shellLocationDestinationDomId(destination: ShellLocationDestination): string {
  return `shell-location-${destination.id}`;
}

export function isShellLocationDestinationSelected(
  destination: ShellLocationDestination,
  pathname: string,
  title: string,
): boolean {
  switch (destination.kind) {
    case "product":
      if (destination.id === "product-canvas") {
        return (
          pathname === "/canvas" || pathname.startsWith("/canvas/") || pathname.startsWith("/node/")
        );
      }
      if (destination.id === "product-agency") {
        return pathname === "/agency" || pathname.startsWith("/agency/");
      }
      return false;
    case "segment":
    case "management-pane":
      return destination.label === title;
    default: {
      const _exhaustive: never = destination.kind;
      return _exhaustive;
    }
  }
}

function buildShellLocationDestinations(
  lastManagementPane: AgencyManagementPaneId = "resourcing",
): ShellLocationDestination[] {
  const segments: ShellLocationDestination[] = AGENCY_SEGMENTS.map((item) => ({
    id: `segment-${item.id}`,
    kind: "segment",
    group: "agency",
    href:
      item.id === "management"
        ? agencyManagementHref(lastManagementPane)
        : agencySegmentHref(item.id),
    label: item.label,
    icon: item.icon,
    shortcut: item.shortcutKey,
  }));

  const panes: ShellLocationDestination[] = AGENCY_MANAGEMENT_PANES.map((pane) => ({
    id: `pane-${pane.id}`,
    kind: "management-pane",
    group: "management",
    href: agencyManagementHref(pane.id),
    label: pane.label,
    icon: pane.icon,
  }));

  return [...PRODUCT_DESTINATIONS, ...segments, ...panes];
}

export function resolveShellLocation(
  pathname: string,
  search: string,
  overlays: ShellLocationOverlays = {},
  options: ShellLocationOptions = {},
): ShellLocation {
  const destinations = buildShellLocationDestinations(options.lastManagementPane);
  const nested = resolveNestedLocation(pathname, search, overlays);
  if (nested) {
    return { title: nested.title, parent: nested.parent, destinations };
  }

  if (pathname === "/profile") {
    return { title: "Profile", parent: null, destinations };
  }

  if (pathname === "/canvas") {
    return { title: "Canvas", parent: null, destinations };
  }

  if (pathname === "/agency" || pathname.startsWith("/agency/")) {
    const segment = agencySegmentFromPathname(pathname);
    if (segment === "management") {
      const pane = agencyManagementPaneFromPathname(pathname);
      if (pane) {
        return { title: agencyManagementPaneLabel(pane), parent: null, destinations };
      }
      return { title: agencySegmentLabel("management"), parent: null, destinations };
    }
    if (segment) {
      return { title: agencySegmentLabel(segment), parent: null, destinations };
    }
    return { title: "Agency", parent: null, destinations };
  }

  const active = findActiveNavItem(pathname);
  return { title: active?.label ?? "Orch", parent: null, destinations };
}

function resolveNestedLocation(
  pathname: string,
  search: string,
  overlays: ShellLocationOverlays,
): Pick<ShellLocation, "title" | "parent"> | null {
  if (pathname.startsWith("/node/")) {
    return {
      title: overlays.nodeTitle?.trim() || "Node",
      parent: { href: "/canvas", label: "Canvas" },
    };
  }

  const canvasWorkspaceId = shellEntityIdAfter(pathname, "/canvas");
  if (canvasWorkspaceId) {
    return {
      title: overlays.canvasWorkspaceTitle?.trim() || "Brain",
      parent: { href: "/canvas", label: "Canvas" },
    };
  }

  if (pathname === "/agency/me" || shellEntityIdAfter(pathname, "/agency/members")) {
    const title =
      pathname === "/agency/me"
        ? overlays.sessionName?.trim() || overlays.memberName?.trim() || "Profile"
        : overlays.memberName?.trim() || "Profile";
    return {
      title,
      parent: { href: agencyManagementHref("tenure"), label: "People" },
    };
  }

  if (shellEntityIdAfter(pathname, "/agency/projects")) {
    return {
      title: overlays.projectName?.trim() || "Project",
      parent: { href: "/agency/projects", label: "Projects" },
    };
  }

  if (shellEntityIdAfter(pathname, "/agency/clients")) {
    return {
      title: overlays.clientName?.trim() || "Client",
      parent: { href: "/agency/clients", label: "Clients" },
    };
  }

  if (shellEntityIdAfter(pathname, "/agency/reports")) {
    return {
      title: "Report",
      parent: { href: "/agency/reports", label: "Reports" },
    };
  }

  if (pathname === "/agency" && shellTaskIdFromSearch(search)) {
    return {
      title: "Task",
      parent: { href: "/agency", label: "Tracker" },
    };
  }

  return null;
}
