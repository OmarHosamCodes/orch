import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "@/lib/navigation";

import type { AgencyWorkSurfaceView } from "@/features/task-management/agency-work";
import { normalizeAgencyWorkSurfaceQueryParams } from "@/features/task-management/agency-work";
import { useAgencyTaskThreadShell } from "@/features/task-management/hooks/use-agency-task-thread-shell";
import { useAgencyClientsQuery, useAgencyProjectsQuery } from "@/features/shared/agency-queries";
import { agencyTeamCapabilities } from "@/features/shared/agency-team-capabilities";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import { teamDetailQueryOptions } from "@/features/team/team-queries";
import {
  ensureInternalClientId,
  pickDefaultProjectClientId,
} from "@/features/clients/internal-client";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type UseAgencyWorkSurfaceOptions = {
  teamId: string;
};

export type AgencyWorkSurfaceCreates = {
  teamId: string;
  clients: Array<{ id: string; name: string }>;
  clientCreateOpen: boolean;
  onClientCreateOpenChange: (open: boolean) => void;
  projectCreateOpen: boolean;
  onProjectCreateOpenChange: (open: boolean) => void;
  defaultClientId: string | undefined;
  onClientCreated: (clientId: string) => void;
};

export function useAgencyWorkSurface({ teamId }: UseAgencyWorkSurfaceOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const thread = useAgencyTaskThreadShell();
  const createClient = useAgencyOpsStore((state) => state.createClient);

  const [clientCreateOpen, setClientCreateOpen] = useState(false);
  const [projectCreateOpen, setProjectCreateOpen] = useState(false);
  const [defaultClientId, setDefaultClientId] = useState<string | undefined>(undefined);
  const [isEnsuringClient, setIsEnsuringClient] = useState(false);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const clientsQuery = useAgencyClientsQuery(teamId);
  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });
  const { canEditRecords, canEditRates } = agencyTeamCapabilities(teamQuery.data?.role);

  const projects = projectsQuery.data?.items ?? [];
  const clients = (clientsQuery.data?.items ?? []).map((client) => ({
    id: client.id,
    name: client.name,
    category: client.category,
  }));

  useEffect(() => {
    const next = normalizeAgencyWorkSurfaceQueryParams(searchParams);
    if (!next) return;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  async function handleNewProject() {
    if (!teamId || !canEditRecords || isEnsuringClient) return;
    const existingId = pickDefaultProjectClientId(clients);
    if (existingId) {
      setDefaultClientId(existingId);
      setProjectCreateOpen(true);
      return;
    }

    setIsEnsuringClient(true);
    try {
      const clientId = await ensureInternalClientId({
        teamId,
        clients,
        createClient,
        asInternalCategory: canEditRates,
      });
      if (!clientId) return;
      setDefaultClientId(clientId);
      setProjectCreateOpen(true);
    } finally {
      setIsEnsuringClient(false);
    }
  }

  function handleAddClient() {
    if (!canEditRecords) return;
    setClientCreateOpen(true);
  }

  function handleClientCreated(clientId: string) {
    setDefaultClientId(clientId);
    setProjectCreateOpen(true);
  }

  let view: AgencyWorkSurfaceView;

  if (projectsQuery.isError) {
    view = {
      status: "error",
      message: getErrorMessage(projectsQuery.error, "Try refreshing."),
      onRetry: () => void projectsQuery.refetch(),
    };
  } else {
    const showEmptyProjects =
      projectsQuery.isSuccess && projects.length === 0 && !projectsQuery.isFetching;

    if (showEmptyProjects) {
      view = {
        status: "empty",
        canEditRecords,
        onNewProject: () => void handleNewProject(),
        onAddClient: handleAddClient,
        isEnsuringClient,
      };
    } else {
      view = {
        status: "ready",
        teamId,
        projects,
      };
    }
  }

  const creates: AgencyWorkSurfaceCreates | null =
    view.status === "empty" && canEditRecords
      ? {
          teamId,
          clients: clients.map((client) => ({ id: client.id, name: client.name })),
          clientCreateOpen,
          onClientCreateOpenChange: setClientCreateOpen,
          projectCreateOpen,
          onProjectCreateOpenChange: setProjectCreateOpen,
          defaultClientId,
          onClientCreated: handleClientCreated,
        }
      : null;

  return { view, thread, creates };
}
