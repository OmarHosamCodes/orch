/**
 * Agency queries use tiered polling — data is kept fresh via refetch intervals,
 * optimistic mutation patches, and focus/reconnect refetch.
 */
import type { AgencyLiveConnectionState } from "@/features/shared/agency-live-rpc";
import { isAgencyLiveConnected } from "@/features/shared/live/agency-live-connected";
import { getQueryClient } from "@/lib/query-client";

const AGENCY_POLL = {
  hot: 3_000,
  warm: 8_000,
  cold: 30_000,
} as const;

const AGENCY_STALE_TIME = {
  hot: 2_000,
  warm: 5_000,
  cold: 15_000,
} as const;

export type AgencySyncTier = keyof typeof AGENCY_POLL;

type AgencySyncMeta = {
  agencyLiveGatedTeamId?: string;
  agencySyncTier?: AgencySyncTier;
  agencyNoPoll?: boolean;
  agencyConnectedReconcile?: boolean;
};

export type AgencySyncOptions = {
  liveGated?: boolean;
  teamId?: string;
  /** Initial fetch only — no refetchInterval even when live is disconnected. */
  noPoll?: boolean;
  /** When live, keep a 30s reconcile instead of stopping. Opt-in for notifications. */
  connectedReconcile?: boolean;
  /** Reactive snapshot from a mounted observer; preferred over query.setOptions. */
  liveState?: AgencyLiveConnectionState;
};

function isLiveForPolling(
  gatedTeamId: string | undefined,
  liveState: AgencyLiveConnectionState | undefined,
) {
  if (!gatedTeamId) {
    return false;
  }
  if (liveState !== undefined) {
    return liveState === "live";
  }
  return isAgencyLiveConnected(gatedTeamId);
}

function resolveRefetchInterval(
  tier: AgencySyncTier,
  gatedTeamId: string | undefined,
  noPoll: boolean,
  connectedReconcile: boolean,
  liveState: AgencyLiveConnectionState | undefined,
) {
  if (noPoll) {
    return false as const;
  }
  if (isLiveForPolling(gatedTeamId, liveState)) {
    return connectedReconcile ? AGENCY_POLL.cold : (false as const);
  }
  return AGENCY_POLL[tier];
}

export function withAgencySyncQueryOptions<T extends Record<string, unknown>>(
  options: T,
  tier: AgencySyncTier = "warm",
  syncOptions?: AgencySyncOptions,
) {
  const {
    liveGated = false,
    teamId,
    noPoll = false,
    connectedReconcile = false,
    liveState,
  } = syncOptions ?? {};
  const gatedTeamId = liveGated && teamId ? teamId : undefined;
  const existingMeta = (options as { meta?: Record<string, unknown> }).meta;

  return {
    ...options,
    staleTime: AGENCY_STALE_TIME[tier],
    refetchInterval: resolveRefetchInterval(
      tier,
      gatedTeamId,
      noPoll,
      connectedReconcile,
      liveState,
    ),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    meta: {
      ...existingMeta,
      ...(gatedTeamId ? { agencyLiveGatedTeamId: gatedTeamId, agencySyncTier: tier } : {}),
      ...(noPoll ? { agencyNoPoll: true } : {}),
      ...(connectedReconcile ? { agencyConnectedReconcile: true } : {}),
    },
  };
}

/** Warm cache once on prefetch — no perpetual refetchInterval pollers. */
export function prefetchAgencySyncQueryOptions<T extends Record<string, unknown>>(
  options: T,
  tier: AgencySyncTier = "warm",
) {
  return {
    ...options,
    staleTime: AGENCY_STALE_TIME[tier],
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  };
}

export function refreshAgencyLiveGatedPolling(teamId: string) {
  const queryClient = getQueryClient();
  const connected = isAgencyLiveConnected(teamId);

  for (const query of queryClient.getQueryCache().findAll()) {
    const meta = query.options.meta as AgencySyncMeta | undefined;
    if (meta?.agencyNoPoll) {
      continue;
    }
    if (meta?.agencyLiveGatedTeamId !== teamId) {
      continue;
    }
    const tier = meta.agencySyncTier ?? "warm";
    const nextInterval = connected
      ? meta.agencyConnectedReconcile
        ? AGENCY_POLL.cold
        : false
      : AGENCY_POLL[tier];
    query.setOptions({
      ...query.options,
      refetchInterval: nextInterval,
    } as typeof query.options);
  }
}
