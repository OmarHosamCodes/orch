import type { QueryClient } from "@tanstack/react-query";

import {
  applyReportEntriesWaste,
  type AgencyReportEntry,
} from "@/features/reports/agency-report-grouping";
import {
  invalidateAgencyDashboardQueries,
  invalidateAgencyEntriesQueries,
  invalidateAgencyReportsQueries,
} from "@/features/shared/agency-queries";
import { orpc, orpcClient } from "@/lib/orpc";

export type ReportEntryPatch = {
  startAt?: string;
  endAt?: string;
  description?: string;
  projectId?: string;
  taskId?: string | null;
  tagIds?: string[];
  links?: string[];
  isBillable?: boolean;
  isWaste?: boolean;
};

type ReportsEntrySnapshot = Array<[readonly unknown[], AgencyReportEntry[] | undefined]>;

export function snapshotReportsEntryQueries(
  queryClient: QueryClient,
  teamId: string,
): ReportsEntrySnapshot {
  return queryClient.getQueriesData<AgencyReportEntry[]>({
    queryKey: ["agency-reports", "entries", teamId],
  });
}

export function restoreReportsEntrySnapshots(
  queryClient: QueryClient,
  snapshots: ReportsEntrySnapshot,
) {
  for (const [queryKey, data] of snapshots) {
    queryClient.setQueryData(queryKey, data);
  }
}

export function removeReportEntriesFromCache(
  queryClient: QueryClient,
  teamId: string,
  entryIds: ReadonlySet<string>,
) {
  if (entryIds.size === 0) return;
  for (const [queryKey, data] of snapshotReportsEntryQueries(queryClient, teamId)) {
    if (!data) continue;
    queryClient.setQueryData(
      queryKey,
      data.filter((entry) => !entryIds.has(entry.id)),
    );
  }
}

function upsertReportEntryInCache(
  queryClient: QueryClient,
  teamId: string,
  entry: AgencyReportEntry,
) {
  for (const [queryKey, data] of snapshotReportsEntryQueries(queryClient, teamId)) {
    if (!data) continue;
    const index = data.findIndex((item) => item.id === entry.id);
    if (index >= 0) {
      const next = [...data];
      next[index] = { ...next[index]!, ...entry };
      queryClient.setQueryData(queryKey, next);
    } else {
      queryClient.setQueryData(queryKey, [...data, entry]);
    }
  }
}

async function invalidateReportEntryQueries(teamId: string, queryClient: QueryClient) {
  await Promise.all([
    invalidateAgencyEntriesQueries(teamId),
    invalidateAgencyReportsQueries(teamId),
    invalidateAgencyDashboardQueries(teamId),
    queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.memberProfile.get.key(),
    }),
  ]);
}

export async function updateReportEntry(
  queryClient: QueryClient,
  teamId: string,
  entryId: string,
  patch: ReportEntryPatch,
) {
  const updated = await orpcClient.agencyOps.reports.updateEntry({
    teamId,
    entryId,
    ...patch,
  });
  upsertReportEntryInCache(queryClient, teamId, updated as AgencyReportEntry);
  await invalidateReportEntryQueries(teamId, queryClient);
  return updated;
}

export async function updateReportEntries(
  queryClient: QueryClient,
  teamId: string,
  entryIds: string[],
  patch: ReportEntryPatch,
) {
  await Promise.all(
    entryIds.map((entryId) =>
      orpcClient.agencyOps.reports.updateEntry({
        teamId,
        entryId,
        ...patch,
      }),
    ),
  );
  await invalidateReportEntryQueries(teamId, queryClient);
}

export async function deleteReportEntries(
  queryClient: QueryClient,
  teamId: string,
  entryIds: string[],
) {
  if (entryIds.length === 0) return;

  const idSet = new Set(entryIds);
  const snapshots = snapshotReportsEntryQueries(queryClient, teamId);
  removeReportEntriesFromCache(queryClient, teamId, idSet);

  try {
    await Promise.all(
      entryIds.map((entryId) =>
        orpcClient.agencyOps.reports.deleteEntry({
          teamId,
          entryId,
        }),
      ),
    );
    await invalidateReportEntryQueries(teamId, queryClient);
  } catch (error) {
    restoreReportsEntrySnapshots(queryClient, snapshots);
    throw error;
  }
}

export async function duplicateReportEntry(
  queryClient: QueryClient,
  teamId: string,
  entryId: string,
) {
  const created = await orpcClient.agencyOps.reports.duplicateEntry({
    teamId,
    entryId,
  });
  upsertReportEntryInCache(queryClient, teamId, created as AgencyReportEntry);
  await invalidateReportEntryQueries(teamId, queryClient);
  return created;
}

export async function persistReportEntriesWaste(
  queryClient: QueryClient,
  teamId: string,
  entryIds: string[],
  nextIsWaste: boolean,
) {
  if (entryIds.length === 0) return;

  const idSet = new Set(entryIds);
  const snapshots = snapshotReportsEntryQueries(queryClient, teamId);
  for (const [queryKey, data] of snapshots) {
    if (!data) continue;
    queryClient.setQueryData(queryKey, applyReportEntriesWaste(data, idSet, nextIsWaste));
  }

  try {
    await Promise.all(
      entryIds.map((entryId) =>
        orpcClient.agencyOps.reports.updateEntry({
          teamId,
          entryId,
          isWaste: nextIsWaste,
        }),
      ),
    );
    await invalidateReportEntryQueries(teamId, queryClient);
  } catch (error) {
    restoreReportsEntrySnapshots(queryClient, snapshots);
    throw error;
  }
}
