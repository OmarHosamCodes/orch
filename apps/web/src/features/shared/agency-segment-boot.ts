import type { QueryClient } from "@tanstack/react-query";

import { agencyManagementPaneFromPathname } from "@/features/shared/agency-management-sections";
import type { AgencySegmentId } from "@/features/shared/agency-segments";
import { ensureAgencyTaskChooserCatalog } from "@/features/shared/agency-task-chooser-catalog";
import { ensureAgencyWorkBootQueries } from "@/features/shared/agency-queries";
import {
  focusMonthKeyFromAnchor,
  monthWindowDateKeys,
} from "@/features/resourcing/resourcing-team-presence";
import { periodAnchorUtc } from "@/features/resourcing/resourcing-workload-heat";
import {
  getCurrentTenurePeriodRange,
  resolveDefaultDashboardRangePreset,
  resolveDefaultTenureMonthIndexes,
} from "@/features/resourcing/tenure-utils";
import { orpc } from "@/lib/orpc";
import {
  prefetchAgencySyncQueryOptions,
  type AgencySyncTier,
} from "@/features/shared/agency-query-options";

type EnsureAgencySegmentBootInput = {
  segment: AgencySegmentId;
  teamId: string;
  userId: string;
  pathname: string;
};

export function agencyEntityIdFromPath(
  pathname: string,
  kind: "clients" | "projects" | "reports",
): string | null {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const match = new RegExp(`^/agency/${kind}/([^/]+)$`).exec(path);
  const raw = match?.[1];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function ensureSyncedQuery(
  queryClient: QueryClient,
  options: any,
  tier: AgencySyncTier = "warm",
): Promise<any> {
  return queryClient.ensureQueryData(prefetchAgencySyncQueryOptions(options, tier) as any);
}

function defaultDashboardRange(now = new Date()) {
  const endIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  ).toISOString();
  return {
    from: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
    ).toISOString(),
    to: endIso,
  };
}

async function resolveDashboardRange(queryClient: QueryClient, teamId: string) {
  const now = new Date();

  const policyData = await ensureSyncedQuery(
    queryClient,
    orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
    "cold",
  );
  const tenurePolicy = policyData?.policy ?? null;
  const preset = resolveDefaultDashboardRangePreset(tenurePolicy);

  if (preset === "tenure") {
    const tenureRange = getCurrentTenurePeriodRange(
      tenurePolicy,
      now,
      resolveDefaultTenureMonthIndexes(tenurePolicy, now),
    );
    if (tenureRange) {
      return { from: tenureRange.from, to: tenureRange.to };
    }
  }

  return defaultDashboardRange(now);
}

async function ensureManagementBootQueries(
  queryClient: QueryClient,
  teamId: string,
  pathname: string,
) {
  const pane = agencyManagementPaneFromPathname(pathname);
  if (!pane) return;
  switch (pane) {
    case "resourcing": {
      const monthKey = focusMonthKeyFromAnchor(periodAnchorUtc(new Date(), "month"));
      const window = monthWindowDateKeys(monthKey);
      await ensureSyncedQuery(
        queryClient,
        orpc.agencyOps.activityHeat.list.queryOptions({
          input: {
            teamId,
            fromDate: window.fromDate,
            toDate: window.toDate,
            utcOffsetMinutes: new Date().getTimezoneOffset(),
          },
        }),
        "cold",
      );
      break;
    }
    case "tenure": {
      await Promise.all([
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.tenure.summary.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.rates.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
      ]);
      break;
    }
    case "money":
      await ensureSyncedQuery(
        queryClient,
        orpc.agencyOps.moneySettings.get.queryOptions({ input: { teamId } }),
        "cold",
      );
      break;
    default: {
      const _exhaustive: never = pane;
      return _exhaustive;
    }
  }
}

export async function ensureAgencySegmentBootQueries(
  queryClient: QueryClient,
  { segment, teamId, userId, pathname }: EnsureAgencySegmentBootInput,
) {
  if (!teamId) return;

  switch (segment) {
    case "work":
      await ensureAgencyWorkBootQueries(queryClient, teamId, userId);
      break;
    case "dashboard": {
      const defaultRange = defaultDashboardRange();
      const [policyData] = await Promise.all([
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.reports.dashboard.queryOptions({
            input: { teamId, from: defaultRange.from, to: defaultRange.to },
          }),
          "cold",
        ),
      ]);
      const range = await resolveDashboardRange(queryClient, teamId);
      if (range.from !== defaultRange.from || range.to !== defaultRange.to) {
        await ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.reports.dashboard.queryOptions({
            input: { teamId, from: range.from, to: range.to },
          }),
          "cold",
        );
      }
      void policyData;
      break;
    }
    case "clients": {
      const clientId = agencyEntityIdFromPath(pathname, "clients");
      await Promise.all([
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.clients.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
        clientId
          ? ensureSyncedQuery(
              queryClient,
              orpc.agencyOps.clients.commercialSummary.queryOptions({
                input: { teamId, clientId },
              }),
              "cold",
            )
          : undefined,
        clientId
          ? ensureSyncedQuery(
              queryClient,
              orpc.agencyOps.projects.list.queryOptions({
                input: {
                  teamId,
                  clientId,
                  trashFilter: "all",
                  archiveFilter: "all",
                },
              }),
              "cold",
            )
          : undefined,
      ]);
      break;
    }
    case "projects": {
      const projectId = agencyEntityIdFromPath(pathname, "projects");
      await Promise.all([
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
        projectId
          ? ensureSyncedQuery(
              queryClient,
              orpc.agencyOps.projects.list.queryOptions({
                input: { teamId, trashFilter: "all" },
              }),
              "cold",
            )
          : undefined,
      ]);
      break;
    }
    case "reports":
      await Promise.all([
        ensureAgencyTaskChooserCatalog(queryClient, teamId),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.clients.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
      ]);
      break;
    case "management":
      await ensureManagementBootQueries(queryClient, teamId, pathname);
      break;
    default: {
      const _exhaustive: never = segment;
      return _exhaustive;
    }
  }
}
