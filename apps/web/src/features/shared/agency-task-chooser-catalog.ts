import { useInfiniteQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import {
  adjustPaginatedTotal,
  EMPTY_LIST_OVERLAY,
  mergeListWithOverlay,
} from "@/features/shared/agency-optimistic-merge";
import { findProjectTaskInCache } from "@/features/shared/agency-query-cache";
import { useAgencyOptimisticStore } from "@/features/shared/stores/agency-optimistic";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import { orpc, orpcClient } from "@/lib/orpc";

const PAGE_SIZE = 100;

/**
 * Catalog TTL stays 15s until create/update/delete, project/client
 * rename/archive/trash/restore, other-tab live, and focus/reconnect
 * catalog refresh paths are all covered. Search stays 15s either way.
 */
export const AGENCY_TASK_CHOOSER_CATALOG_STALE_TIME_MS = 15_000;
export const AGENCY_TASK_CHOOSER_SEARCH_STALE_TIME_MS = 15_000;

type ChooserListKind = "catalog" | "search";

export type ChooserDrainRequest = {
  enabled: boolean;
  queryKey: readonly unknown[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
};

export type ChooserDrainActive = {
  enabled: boolean;
  queryKey: readonly unknown[];
};

function chooserListInput(teamId: string, search?: string) {
  return {
    teamId,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
  };
}

function chooserListQueryKey(teamId: string, kind: ChooserListKind, search?: string) {
  return [
    ...orpc.agencyOps.projectTasks.list.queryOptions({
      input: chooserListInput(teamId, search),
    }).queryKey,
    "infinite",
    kind,
  ] as const;
}

function queryKeysEqual(left: readonly unknown[], right: readonly unknown[]) {
  return left.length === right.length && JSON.stringify(left) === JSON.stringify(right);
}

function chooserTeamIdFromQueryKey(queryKey: readonly unknown[]): string | undefined {
  const meta = queryKey[1];
  if (!meta || typeof meta !== "object") return undefined;
  const input = "input" in meta ? (meta as { input?: { teamId?: unknown } }).input : undefined;
  return typeof input?.teamId === "string" ? input.teamId : undefined;
}

export function chooserNextPageParam(lastPage: { page: number; pageSize: number; total: number }) {
  if (lastPage.page * lastPage.pageSize < lastPage.total) return lastPage.page + 1;
  return undefined;
}

export function chooserPrefetchPageCount(existingPageCount: number): number {
  return Math.max(1, existingPageCount);
}

export function shouldDrainChooserNextPage(
  request: ChooserDrainRequest,
  active: ChooserDrainActive,
): boolean {
  if (!request.enabled || !active.enabled) return false;
  if (!queryKeysEqual(request.queryKey, active.queryKey)) return false;
  if (!request.hasNextPage || request.isFetchingNextPage) return false;
  if (request.isError || request.isFetchNextPageError) return false;
  return true;
}

export function flattenChooserPages<T extends { id: string }>(
  pages: Array<{ items?: T[] } | undefined> | undefined,
): T[] {
  const byId = new Map<string, T>();
  for (const page of pages ?? []) {
    for (const item of page?.items ?? []) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

export function mergeChooserTasksById<T extends { id: string }>(
  ...groups: Array<readonly T[]>
): T[] {
  const byId = new Map<string, T>();
  for (const group of groups) {
    for (const task of group) {
      byId.set(task.id, task);
    }
  }
  return [...byId.values()];
}

export function keepPreviousChooserDataForTeam<TData>(teamId: string) {
  return (
    previousData: TData | undefined,
    previousQuery?: { queryKey: readonly unknown[] },
  ): TData | undefined => {
    if (previousData === undefined || !previousQuery) return undefined;
    if (chooserTeamIdFromQueryKey(previousQuery.queryKey) !== teamId) return undefined;
    return previousData;
  };
}

export function agencyTaskChooserInfiniteQueryOptions(
  teamId: string,
  kind: ChooserListKind,
  search?: string,
) {
  const input = chooserListInput(teamId, search);
  return {
    queryKey: chooserListQueryKey(teamId, kind, search),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      orpcClient.agencyOps.projectTasks.list({
        ...input,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: chooserNextPageParam,
    staleTime:
      kind === "search"
        ? AGENCY_TASK_CHOOSER_SEARCH_STALE_TIME_MS
        : AGENCY_TASK_CHOOSER_CATALOG_STALE_TIME_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  };
}

export async function ensureAgencyTaskChooserCatalog(queryClient: QueryClient, teamId: string) {
  if (!teamId) return;
  const options = agencyTaskChooserInfiniteQueryOptions(teamId, "catalog");
  const existing = queryClient.getQueryData<{ pages?: unknown[] }>(options.queryKey);
  const existingPageCount = Array.isArray(existing?.pages) ? existing.pages.length : 0;
  await queryClient.fetchInfiniteQuery({
    ...options,
    pages: chooserPrefetchPageCount(existingPageCount),
  });
}

function useChooserTaskPages(
  teamId: string,
  kind: ChooserListKind,
  options: { search?: string; enabled?: boolean } = {},
) {
  const search = options.search?.trim() || undefined;
  const queryEnabled = Boolean(teamId) && (options.enabled === undefined || options.enabled);
  const queryOptions = useMemo(
    () => agencyTaskChooserInfiniteQueryOptions(teamId, kind, search),
    [teamId, kind, search],
  );

  const registerProjectTasksQuery = useAgencyOpsStore((s) => s.registerProjectTasksQuery);
  const unregisterProjectTasksQuery = useAgencyOpsStore((s) => s.unregisterProjectTasksQuery);

  const query = useInfiniteQuery({
    ...queryOptions,
    enabled: queryEnabled,
    placeholderData: keepPreviousChooserDataForTeam(teamId),
  });

  useEffect(() => {
    if (!teamId || !queryEnabled) return;
    registerProjectTasksQuery({ queryKey: [...queryOptions.queryKey], teamId });
    return () => unregisterProjectTasksQuery([...queryOptions.queryKey]);
  }, [
    teamId,
    queryOptions.queryKey,
    queryEnabled,
    registerProjectTasksQuery,
    unregisterProjectTasksQuery,
  ]);

  useEffect(() => {
    if (
      !shouldDrainChooserNextPage(
        {
          enabled: queryEnabled,
          queryKey: queryOptions.queryKey,
          hasNextPage: query.hasNextPage,
          isFetchingNextPage: query.isFetchingNextPage,
          isError: query.isError,
          isFetchNextPageError: query.isFetchNextPageError,
        },
        { enabled: queryEnabled, queryKey: queryOptions.queryKey },
      )
    ) {
      return;
    }
    void query.fetchNextPage({ cancelRefetch: false });
  }, [
    queryEnabled,
    queryOptions.queryKey,
    query.hasNextPage,
    query.isFetchingNextPage,
    query.isError,
    query.isFetchNextPageError,
    query.fetchNextPage,
  ]);

  const overlay = useAgencyOptimisticStore((state) => state.tasks[teamId] ?? EMPTY_LIST_OVERLAY);
  const serverItems = useMemo(() => flattenChooserPages(query.data?.pages), [query.data?.pages]);
  const items = useMemo(
    () => mergeListWithOverlay(serverItems, overlay, () => true),
    [serverItems, overlay],
  );
  const total = useMemo(() => {
    const serverTotal = query.data?.pages[0]?.total ?? 0;
    return adjustPaginatedTotal(serverTotal, overlay, serverItems);
  }, [overlay, query.data?.pages, serverItems]);

  return { ...query, items, total };
}

export function useAgencyProjectTasksForChooserQuery(
  teamId: string,
  filters: { search?: string; enabled?: boolean } = {},
  options: { selectedTaskIds?: readonly string[] } = {},
) {
  const catalogEnabled = filters.enabled === undefined || filters.enabled;
  const catalogQuery = useChooserTaskPages(teamId, "catalog", { enabled: catalogEnabled });
  const normalizedSearch = filters.search?.trim() ?? "";
  const searchQuery = useChooserTaskPages(teamId, "search", {
    search: normalizedSearch,
    enabled: Boolean(normalizedSearch) && catalogEnabled,
  });
  const selectedTaskIdsKey = options.selectedTaskIds?.filter(Boolean).join(",") ?? "";
  const selectedTaskIds = useMemo(
    () => [...new Set(selectedTaskIdsKey.split(",").filter(Boolean))],
    [selectedTaskIdsKey],
  );

  const items = useMemo(() => {
    const selectedTasks = selectedTaskIds.flatMap((taskId) => {
      const cachedTask = findProjectTaskInCache(teamId, taskId);
      return cachedTask ? [cachedTask] : [];
    });
    return mergeChooserTasksById(catalogQuery.items, searchQuery.items, selectedTasks);
  }, [catalogQuery.items, searchQuery.items, selectedTaskIds, teamId]);

  const activeQuery = normalizedSearch ? searchQuery : catalogQuery;
  const isPending = catalogQuery.isPending && items.length === 0;

  return {
    ...activeQuery,
    items,
    total: activeQuery.total,
    isPending,
    isLoading: isPending,
  };
}
