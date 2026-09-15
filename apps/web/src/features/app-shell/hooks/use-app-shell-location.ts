import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  resolveShellLocation,
  shellEntityIdAfter,
  type ShellLocation,
} from "@/features/app-shell/app-shell-location";
import { useAppShellStore } from "@/features/app-shell/app-shell-store";
import { useTeamStore } from "@/features/team/team-store";
import { useCurrentAgencyTeamStore } from "@/features/time-tracking/stores/agency-timer";
import { useWorkspaceStore } from "@/features/workspace/workspace-local-state";
import { authClient } from "@/lib/auth-client";
import { useLocation } from "@/lib/navigation";
import { orpc } from "@/lib/orpc";

/** Resolve the context-bar Current Title from the route plus cached overlay names. */
export function useAppShellLocation(): ShellLocation {
  const location = useLocation();
  const session = authClient.useSession();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const agencyTeamId = useCurrentAgencyTeamStore((s) => s.currentAgencyTeamId);
  const lastManagementPane = useAppShellStore((s) => s.lastManagementPane);
  const teamId = agencyTeamId || selectedTeamId || "";

  const memberId = shellEntityIdAfter(location.pathname, "/agency/members");
  const projectId = shellEntityIdAfter(location.pathname, "/agency/projects");
  const clientId = shellEntityIdAfter(location.pathname, "/agency/clients");
  const nodeId = shellEntityIdAfter(location.pathname, "/node");
  const onOwnProfile = location.pathname === "/agency/me";

  const membersQuery = useQuery({
    ...orpc.team.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId && (memberId || onOwnProfile)),
  });
  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({
      input: { teamId, archiveFilter: "nonarchived", trashFilter: "active" },
    }),
    enabled: Boolean(teamId && projectId),
  });
  const clientsQuery = useQuery({
    ...orpc.agencyOps.clients.list.queryOptions({
      input: { teamId, archiveFilter: "nonarchived" },
    }),
    enabled: Boolean(teamId && clientId),
  });

  const sessionUserId = session.data?.user?.id;
  const sessionName = session.data?.user?.name ?? null;
  const nodeTitle = useWorkspaceStore((state) => {
    if (!nodeId) return null;
    return state.nodes.find((node) => node.id === nodeId)?.title ?? null;
  });

  const memberName = useMemo(() => {
    const items = membersQuery.data?.items ?? [];
    if (memberId) {
      return items.find((member) => member.userId === memberId)?.userName ?? null;
    }
    if (onOwnProfile && sessionUserId) {
      return items.find((member) => member.userId === sessionUserId)?.userName ?? null;
    }
    return null;
  }, [memberId, membersQuery.data?.items, onOwnProfile, sessionUserId]);

  const projectName = useMemo(() => {
    if (!projectId) return null;
    return (
      (projectsQuery.data?.items ?? []).find((project) => project.id === projectId)?.name ?? null
    );
  }, [projectId, projectsQuery.data?.items]);

  const clientName = useMemo(() => {
    if (!clientId) return null;
    return (clientsQuery.data?.items ?? []).find((client) => client.id === clientId)?.name ?? null;
  }, [clientId, clientsQuery.data?.items]);

  return useMemo(
    () =>
      resolveShellLocation(
        location.pathname,
        location.search,
        {
          memberName,
          projectName,
          clientName,
          nodeTitle,
          sessionName,
        },
        { lastManagementPane },
      ),
    [
      clientName,
      lastManagementPane,
      location.pathname,
      location.search,
      memberName,
      nodeTitle,
      projectName,
      sessionName,
    ],
  );
}
