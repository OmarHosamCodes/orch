import type { UseQueryResult } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import {
  adjustPaginatedTotal,
  EMPTY_LIST_OVERLAY,
  mergeListWithOverlay,
  type AgencyListOverlay,
} from "@/features/shared/agency-optimistic-merge";
import {
  projectMatchesClientFilter,
  taskMatchesAgencyFilters,
  useAgencyOptimisticStore,
  type AgencyOptimisticActiveTimer,
  type AgencyOptimisticClient,
  type AgencyOptimisticProject,
  type AgencyOptimisticTask,
  type AgencyOptimisticTimeEntry,
} from "@/features/shared/stores/agency-optimistic";

type ListQueryData<T> = {
  items: T[];
  page?: number;
  pageSize?: number;
  total?: number;
};

function useMergedAgencyListQuery<T extends { id: string }, TData extends ListQueryData<T>>(
  query: UseQueryResult<TData, Error>,
  overlay: AgencyListOverlay<T>,
  options: {
    teamId: string;
    prune: (teamId: string, items: T[]) => void;
    matches?: (item: T) => boolean;
  },
): UseQueryResult<TData, Error> {
  const { teamId, prune, matches } = options;

  useEffect(() => {
    if (!teamId || !query.isSuccess || !query.data?.items) return;
    prune(teamId, query.data.items);
  }, [teamId, query.isSuccess, query.data?.items, prune]);

  const mergedData = useMemo(() => {
    if (!query.data) return query.data;
    const items = mergeListWithOverlay(query.data.items, overlay, matches);
    const total =
      typeof query.data.total === "number"
        ? adjustPaginatedTotal(query.data.total, overlay, query.data.items)
        : query.data.total;

    return {
      ...query.data,
      items,
      total,
    } as TData;
  }, [query.data, overlay, matches]);

  return { ...query, data: mergedData } as UseQueryResult<TData, Error>;
}

export function useMergedAgencyClientsQuery<TData extends ListQueryData<AgencyOptimisticClient>>(
  query: UseQueryResult<TData, Error>,
  teamId: string,
) {
  const overlay = useAgencyOptimisticStore((state) => state.clients[teamId] ?? EMPTY_LIST_OVERLAY);
  const pruneClients = useAgencyOptimisticStore((state) => state.pruneClients);

  return useMergedAgencyListQuery(query, overlay, {
    teamId,
    prune: pruneClients,
  });
}

export function useMergedAgencyProjectsQuery<TData extends ListQueryData<AgencyOptimisticProject>>(
  query: UseQueryResult<TData, Error>,
  teamId: string,
  clientId?: string,
) {
  const overlay = useAgencyOptimisticStore((state) => state.projects[teamId] ?? EMPTY_LIST_OVERLAY);
  const pruneProjects = useAgencyOptimisticStore((state) => state.pruneProjects);
  const matches = useMemo(
    () => (project: AgencyOptimisticProject) => projectMatchesClientFilter(project, clientId),
    [clientId],
  );

  return useMergedAgencyListQuery(query, overlay, {
    teamId,
    prune: pruneProjects,
    matches,
  });
}

export function useMergedAgencyProjectTasksQuery<TData extends ListQueryData<AgencyOptimisticTask>>(
  query: UseQueryResult<TData, Error>,
  teamId: string,
  filters: {
    projectId?: string;
    assigneeUserId?: string;
    statuses?: AgencyOptimisticTask["status"][];
  },
) {
  const overlay = useAgencyOptimisticStore((state) => state.tasks[teamId] ?? EMPTY_LIST_OVERLAY);
  const matches = useMemo(
    () => (task: AgencyOptimisticTask) => taskMatchesAgencyFilters(task, filters),
    [filters],
  );

  // Do not prune the shared task overlay from non-rail lists (title suggestions,
  // project tables, etc.). Those queries can include a task the Active rail
  // cache does not yet have, which drops the overlay and makes the row vanish.
  return useMergedAgencyListQuery(query, overlay, {
    teamId,
    prune: () => undefined,
    matches,
  });
}

export function useMergedAgencyTimeEntriesQuery<
  TData extends ListQueryData<AgencyOptimisticTimeEntry>,
>(query: UseQueryResult<TData, Error>, teamId: string) {
  const overlay = useAgencyOptimisticStore(
    (state) => state.timeEntries[teamId] ?? EMPTY_LIST_OVERLAY,
  );
  const pruneTimeEntries = useAgencyOptimisticStore((state) => state.pruneTimeEntries);

  return useMergedAgencyListQuery(query, overlay, {
    teamId,
    prune: pruneTimeEntries,
  });
}

export function useMergedAgencyActiveTimerQuery(
  query: UseQueryResult<{ timer: AgencyOptimisticActiveTimer | null }, Error>,
  teamId: string,
) {
  const timerOverlay = useAgencyOptimisticStore((state) => state.activeTimers[teamId]);

  const mergedData = useMemo(() => {
    if (timerOverlay === undefined) {
      return query.data;
    }
    return { timer: timerOverlay };
  }, [query.data, timerOverlay]);

  return { ...query, data: mergedData };
}
