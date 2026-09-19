import { useEffect } from "react";
import { useLocation } from "@/lib/navigation";

import {
  AGENCY_PRIMARY_SEGMENTS,
  managementGroupHref,
  type AgencyPrimarySegmentId,
} from "@/features/app-shell/app-shell-agency-nav-tree";
import {
  ShellRailNavRow,
  ShellRailNestedGroup,
  ShellRailSection,
} from "@/features/app-shell/app-shell-rail-items";
import { useAppShellStore } from "@/features/app-shell/app-shell-store";
import {
  AGENCY_MANAGEMENT_PANES,
  agencyManagementHref,
  agencyManagementPaneFromPathname,
  agencyManagementPaneTabId,
} from "@/features/shared/agency-management-sections";
import { agencySegmentFromPathname, agencySegmentTabId } from "@/features/shared/agency-segments";
import { CanvasBrainsRailContainer } from "@/features/workspace/containers/canvas-brains-rail-container";
import { canvasWorkspaceIdFromPath } from "@/features/workspace/canvas-workspace-path";

type AppShellRailDestinationsProps = { onNavigate?: () => void };

const SEGMENT_NAV_IDS: Record<AgencyPrimarySegmentId, string> = {
  work: "agency-tracker",
  dashboard: "agency-dashboard",
  clients: "agency-clients",
  projects: "agency-projects",
  reports: "agency-reports",
};

function useAgencyManagementPaneSync() {
  const location = useLocation();
  const setLastManagementPane = useAppShellStore((s) => s.setLastManagementPane);

  useEffect(() => {
    const pane = agencyManagementPaneFromPathname(location.pathname);
    if (pane) setLastManagementPane(pane);
  }, [location.pathname, setLastManagementPane]);
}

export function AppShellRailDestinations({ onNavigate }: AppShellRailDestinationsProps) {
  const location = useLocation();
  const lastManagementPane = useAppShellStore((s) => s.lastManagementPane);
  useAgencyManagementPaneSync();

  const onCanvasHome = location.pathname === "/canvas" || location.pathname.startsWith("/node/");
  const onCanvasBrain = Boolean(canvasWorkspaceIdFromPath(location.pathname));
  const currentSegment = agencySegmentFromPathname(location.pathname);
  const currentManagePane = agencyManagementPaneFromPathname(location.pathname);

  const groupSelected = currentSegment === "management" && !currentManagePane;
  const groupHref = managementGroupHref(lastManagementPane);

  return (
    <>
      <ShellRailSection title="Workspace">
        <ShellRailNavRow
          to="/canvas"
          icon="i-lucide-layout-grid"
          label="Canvas"
          selected={onCanvasHome}
          parentActive={onCanvasBrain}
          navId="canvas"
          onNavigate={onNavigate}
        />
        <CanvasBrainsRailContainer onNavigate={onNavigate} />
      </ShellRailSection>

      <ShellRailSection title="Track & analyze">
        {AGENCY_PRIMARY_SEGMENTS.map((entry) => (
          <ShellRailNavRow
            key={entry.id}
            id={agencySegmentTabId(entry.id)}
            to={entry.path}
            icon={entry.icon}
            label={entry.label}
            selected={currentSegment === entry.id}
            navId={SEGMENT_NAV_IDS[entry.id]}
            shortcutKey={entry.shortcutKey}
            onNavigate={onNavigate}
          />
        ))}
      </ShellRailSection>

      <ShellRailSection title="Manage">
        <ShellRailNavRow
          to={groupHref}
          icon="i-lucide-sliders-horizontal"
          label="Management"
          selected={groupSelected}
          parentActive={currentSegment === "management" && !groupSelected}
          navId="agency-management"
          shortcutKey="m"
          onNavigate={onNavigate}
        />
        <ShellRailNestedGroup>
          {AGENCY_MANAGEMENT_PANES.map((pane) => (
            <ShellRailNavRow
              key={pane.id}
              id={agencyManagementPaneTabId(pane.id)}
              to={agencyManagementHref(pane.id)}
              icon={pane.icon}
              label={pane.label}
              selected={currentManagePane === pane.id}
              navId={`agency-${pane.id}`}
              nested
              onNavigate={onNavigate}
            />
          ))}
        </ShellRailNestedGroup>
      </ShellRailSection>
    </>
  );
}
