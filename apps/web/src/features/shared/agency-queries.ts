import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { authClient } from "@/lib/auth-client";
import { mergeAgencyPresenceMembers } from "@/features/shared/agency-presence-members";
import {
  useMergedAgencyActiveTimerQuery,
  useMergedAgencyClientsQuery,
  useMergedAgencyProjectTasksQuery,
  useMergedAgencyProjectsQuery,
  useMergedAgencyTimeEntriesQuery,
} from "@/features/shared/agency-optimistic";
import { getQueryClient } from "@/lib/query-client";
import type { AgencyClientArchiveFilter } from "@/features/shared/agency-client-archive-filter";
import type { AgencyProjectTrashFilter } from "@/features/shared/agency-project-trash-filter";
import { orpc } from "@/lib/orpc";
import {
  withAgencySyncQueryOptions,
  prefetchAgencySyncQueryOptions,
} from "@/features/shared/agency-query-options";
import { useAgencyOptimisticStore } from "@/features/shared/stores/agency-optimistic";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import { isAgencyTimeEntriesListQueryKey } from "@/features/shared/agency-query-cache";
import { ensureAgencyTaskChooserCatalog } from "@/features/shared/agency-task-chooser-catalog";
import { AGENCY_TIME_ENTRIES_DEFAULT_PAGE_SIZE } from "@/features/time-tracking/stores/agency-time-entries-log";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";
import type { AgencyProjectTask } from "@orch/api/schemas/agency-ops";

export type AgencyProjectTaskStatus = AgencyProjectTask["status"];

export type AgencyProjectTasksFilters = {
  projectId?: string;
  assigneeUserId?: string;
  delegatedByUserId?: string;
  journeyDiscoveryForUserId?: string;
  statuses?: AgencyProjectTaskStatus[];
  search?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
};

export async function ensureAgencyWorkBootQueries(
  queryClient: QueryClient,
  teamId: string,
  assigneeUserId: string,
) {
  if (!teamId) return;

  await Promise.all([
    ensureAgencyTaskChooserCatalog(queryClient, teamId),
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
        "cold",
      ),
    ),
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.projectTasks.list.queryOptions({
          input: {
            teamId,
            assigneeUserId,
            statuses: ["open", "in_progress"],
          },
        }),
        "hot",
      ),
    ),
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.projectTasks.list.queryOptions({
          input: {
            teamId,
            assigneeUserId,
            statuses: ["done"],
          },
        }),
        "hot",
      ),
    ),
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.timer.getActive.queryOptions({
          input: { teamId },
        }),
        "hot",
      ),
    ),
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.timer.listActiveMembers.queryOptions({
          input: { teamId },
        }),
        "hot",
      ),
    ),
    queryClient.ensureQueryData(
      prefetchAgencySyncQueryOptions(
        orpc.agencyOps.timeEntries.listMine.queryOptions({
          input: {
            teamId,
            page: 1,
            pageSize: AGENCY_TIME_ENTRIES_DEFAULT_PAGE_SIZE,
            utcOffsetMinutes: new Date().getTimezoneOffset(),
          },
        }),
        "hot",
      ),
    ),
  ]);
}

function isAgencyReportsOrpcQueryKey(queryKey: QueryKey, teamId: string, endpoint?: "dashboard") {
  const path = queryKey[0];
  if (
    !Array.isArray(path) ||
    path[0] !== "agencyOps" ||
    path[1] !== "reports" ||
    (endpoint ? path[2] !== endpoint : path[2] === "dashboard")
  ) {
    return false;
  }
  const meta = queryKey[1] as { input?: { teamId?: string } } | undefined;
  return meta?.input?.teamId === teamId;
}

export async function invalidateAgencyEntriesQueries(teamId: string) {
  if (!teamId) return;
  await getQueryClient().invalidateQueries({
    predicate: (query) => isAgencyTimeEntriesListQueryKey(query.queryKey, teamId),
  });
}

export async function invalidateAgencyReportsQueries(teamId: string) {
  if (!teamId) return;
  await getQueryClient().invalidateQueries({
    predicate: (query) =>
      isAgencyReportsOrpcQueryKey(query.queryKey, teamId) ||
      (query.queryKey[0] === "agency-reports" && query.queryKey.includes(teamId)),
  });
}

export async function invalidateAgencyDashboardQueries(teamId: string) {
  if (!teamId) return;
  await getQueryClient().invalidateQueries({
    predicate: (query) => isAgencyReportsOrpcQueryKey(query.queryKey, teamId, "dashboard"),
  });
}

export function useAgencyProjectsQuery(
  teamId: string,
  options: {
    clientId?: string;
    archiveFilter?: AgencyClientArchiveFilter;
    trashFilter?: AgencyProjectTrashFilter;
  } = {},
) {
  const archiveFilter = options.archiveFilter ?? "nonarchived";
  const trashFilter = options.trashFilter ?? "active";
  const registerProjectsQuery = useAgencyOpsStore((s) => s.registerProjectsQuery);
  const unregisterProjectsQuery = useAgencyOpsStore((s) => s.unregisterProjectsQuery);

  const input = useMemo(
    () => ({
      teamId,
      archiveFilter,
      trashFilter,
      ...(options.clientId ? { clientId: options.clientId } : {}),
    }),
    [teamId, archiveFilter, trashFilter, options.clientId],
  );

  const queryKey = orpc.agencyOps.projects.list.queryOptions({ input }).queryKey;

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.projects.list.queryOptions({ input }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId) return;
    registerProjectsQuery({ queryKey, teamId, clientId: options.clientId });
    return () => unregisterProjectsQuery(queryKey);
  }, [teamId, queryKey, options.clientId, registerProjectsQuery, unregisterProjectsQuery]);

  return useMergedAgencyProjectsQuery(query, teamId, options.clientId);
}

export function useAgencyClientsQuery(
  teamId: string,
  options: { archiveFilter?: AgencyClientArchiveFilter } = {},
) {
  const archiveFilter = options.archiveFilter ?? "nonarchived";
  const registerClientsQuery = useAgencyOpsStore((s) => s.registerClientsQuery);
  const unregisterClientsQuery = useAgencyOpsStore((s) => s.unregisterClientsQuery);

  const input = useMemo(() => ({ teamId, archiveFilter }), [teamId, archiveFilter]);

  const queryKey = orpc.agencyOps.clients.list.queryOptions({ input }).queryKey;

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.clients.list.queryOptions({ input }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId) return;
    registerClientsQuery({ queryKey, teamId });
    return () => unregisterClientsQuery(queryKey);
  }, [teamId, queryKey, registerClientsQuery, unregisterClientsQuery]);

  return useMergedAgencyClientsQuery(query, teamId);
}

export function useAgencyClientsBookIndexQuery(
  teamId: string,
  options: { archiveFilter?: AgencyClientArchiveFilter } = {},
) {
  const archiveFilter = options.archiveFilter ?? "nonarchived";
  const input = useMemo(() => ({ teamId, archiveFilter }), [teamId, archiveFilter]);

  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.clients.bookIndex.queryOptions({ input }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );
}

export function useAgencyProjectTasksQuery(
  teamId: string,
  filters: AgencyProjectTasksFilters = {},
) {
  const registerProjectTasksQuery = useAgencyOpsStore((s) => s.registerProjectTasksQuery);
  const unregisterProjectTasksQuery = useAgencyOpsStore((s) => s.unregisterProjectTasksQuery);

  const statusesKey = filters.statuses?.join(",") ?? "";

  const stableFilters = useMemo(
    () => ({
      projectId: filters.projectId,
      assigneeUserId: filters.assigneeUserId,
      delegatedByUserId: filters.delegatedByUserId,
      journeyDiscoveryForUserId: filters.journeyDiscoveryForUserId,
      statuses: filters.statuses,
      search: filters.search,
      page: filters.page,
      pageSize: filters.pageSize,
    }),
    [
      filters.projectId,
      filters.assigneeUserId,
      filters.delegatedByUserId,
      filters.journeyDiscoveryForUserId,
      statusesKey,
      filters.statuses,
      filters.search,
      filters.page,
      filters.pageSize,
    ],
  );

  const input = useMemo(
    () => ({
      teamId,
      ...(stableFilters.projectId ? { projectId: stableFilters.projectId } : {}),
      ...(stableFilters.assigneeUserId ? { assigneeUserId: stableFilters.assigneeUserId } : {}),
      ...(stableFilters.delegatedByUserId
        ? { delegatedByUserId: stableFilters.delegatedByUserId }
        : {}),
      ...(stableFilters.journeyDiscoveryForUserId
        ? { journeyDiscoveryForUserId: stableFilters.journeyDiscoveryForUserId }
        : {}),
      ...(stableFilters.statuses ? { statuses: stableFilters.statuses } : {}),
      ...(stableFilters.search ? { search: stableFilters.search } : {}),
      ...(stableFilters.page ? { page: stableFilters.page } : {}),
      ...(stableFilters.pageSize ? { pageSize: stableFilters.pageSize } : {}),
    }),
    [teamId, stableFilters],
  );

  const queryKey = useMemo(
    () => orpc.agencyOps.projectTasks.list.queryOptions({ input }).queryKey,
    [input],
  );

  const queryEnabled =
    Boolean(teamId) &&
    (stableFilters.projectId === undefined || Boolean(stableFilters.projectId)) &&
    (stableFilters.assigneeUserId === undefined || Boolean(stableFilters.assigneeUserId)) &&
    (stableFilters.delegatedByUserId === undefined || Boolean(stableFilters.delegatedByUserId)) &&
    (stableFilters.journeyDiscoveryForUserId === undefined ||
      Boolean(stableFilters.journeyDiscoveryForUserId)) &&
    (filters.enabled === undefined || filters.enabled);

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.projectTasks.list.queryOptions({ input }),
        enabled: queryEnabled,
        placeholderData: keepPreviousData,
      },
      "hot",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId || !queryEnabled) return;
    registerProjectTasksQuery({
      queryKey,
      teamId,
      projectId: stableFilters.projectId,
      assigneeUserId: stableFilters.assigneeUserId,
      statuses: stableFilters.statuses,
    });
    return () => unregisterProjectTasksQuery(queryKey);
  }, [
    teamId,
    queryKey,
    queryEnabled,
    stableFilters.projectId,
    stableFilters.assigneeUserId,
    stableFilters.statuses,
    registerProjectTasksQuery,
    unregisterProjectTasksQuery,
  ]);

  return useMergedAgencyProjectTasksQuery(query, teamId, stableFilters);
}

function useAgencyActiveMembersQuery(teamId: string) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.timer.listActiveMembers.queryOptions({
          input: { teamId },
        }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "hot",
      { liveGated: true, teamId },
    ),
  );
}

export function useAgencyPresenceMembers(teamId: string) {
  const activeMembersQuery = useAgencyActiveMembersQuery(teamId);
  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);
  const timerOverlay = useAgencyOptimisticStore((state) => state.activeTimers[teamId]);
  const session = authClient.useSession();
  const user = session.data?.user;

  const timer = useMemo(() => {
    if (timerOverlay !== undefined) {
      return timerOverlay;
    }
    return activeTimerQuery.data?.timer ?? null;
  }, [timerOverlay, activeTimerQuery.data?.timer]);

  const members = useMemo(
    () => mergeAgencyPresenceMembers(activeMembersQuery.data?.items ?? [], timer, teamId, user),
    [activeMembersQuery.data?.items, timer, teamId, user],
  );

  return {
    members,
    isPending: activeMembersQuery.isPending || activeTimerQuery.isPending,
  };
}

export function useAgencyActiveTimerQuery(teamId: string) {
  const registerActiveTimerQuery = useAgencyTimeTrackingStore((s) => s.registerActiveTimerQuery);
  const unregisterActiveTimerQuery = useAgencyTimeTrackingStore(
    (s) => s.unregisterActiveTimerQuery,
  );

  const queryKey = orpc.agencyOps.timer.getActive.queryOptions({
    input: { teamId: teamId || undefined },
  }).queryKey;

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.timer.getActive.queryOptions({
          input: { teamId: teamId || undefined },
        }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "hot",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId) return;
    registerActiveTimerQuery({ teamId, queryKey });
    return () => unregisterActiveTimerQuery(queryKey);
  }, [teamId, queryKey, registerActiveTimerQuery, unregisterActiveTimerQuery]);

  return useMergedAgencyActiveTimerQuery(query, teamId);
}

export function useAgencyFavoritesQuery(teamId: string) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.favorites.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );
}

export function useAgencyProjectTemplatesQuery(teamId: string) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.projectTemplates.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );
}

export function useAgencyTimeEntriesQuery(teamId: string, page: number, pageSize: number) {
  const registerLogQuery = useAgencyTimeTrackingStore((s) => s.registerLogQuery);
  const unregisterLogQuery = useAgencyTimeTrackingStore((s) => s.unregisterLogQuery);
  const utcOffsetMinutes = new Date().getTimezoneOffset();
  const listMineInput = { teamId, page, pageSize, utcOffsetMinutes };

  const queryKey = orpc.agencyOps.timeEntries.listMine.queryOptions({
    input: listMineInput,
  }).queryKey;

  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.timeEntries.listMine.queryOptions({
          input: listMineInput,
        }),
        enabled: Boolean(teamId),
        placeholderData: keepPreviousData,
      },
      "hot",
      { liveGated: true, teamId },
    ),
  );

  useEffect(() => {
    if (!teamId) return;
    registerLogQuery({ teamId, page, queryKey });
    return () => unregisterLogQuery(queryKey);
  }, [teamId, page, queryKey, registerLogQuery, unregisterLogQuery]);

  return useMergedAgencyTimeEntriesQuery(query, teamId);
}
