import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

type AgencySyncState = "loading" | "syncing" | "synced" | "error";

type AgencySyncErrorDetail = {
  label: string;
  message: string;
};

export type AgencySyncDetails = {
  state: AgencySyncState;
  label: string;
  description: string;
  fetchingCount: number;
  activeLabels: string[];
  errors: AgencySyncErrorDetail[];
};

const QUERY_SEGMENT_LABELS: Record<string, string> = {
  projectTasks: "Tasks",
  projects: "Projects",
  clients: "Clients",
  timeEntries: "Time entries",
  reports: "Reports",
  capacity: "Capacity",
  presence: "Presence",
  notifications: "Notifications",
  invoices: "Invoices",
  rates: "Rates",
  tenure: "Tenure",
};

function teamQueryPredicate(teamId: string) {
  return (query: { queryKey: readonly unknown[] }) =>
    JSON.stringify(query.queryKey).includes(teamId);
}

function labelForQueryKey(queryKey: readonly unknown[]): string {
  const serialized = JSON.stringify(queryKey);
  for (const [segment, label] of Object.entries(QUERY_SEGMENT_LABELS)) {
    if (serialized.includes(segment)) {
      return label;
    }
  }
  return "Data";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "Request failed";
}

export function resolveAgencySyncDetails(
  teamId: string,
  isFetching: number,
  queries: Array<{
    queryKey: readonly unknown[];
    state: {
      fetchStatus: string;
      status: string;
      data: unknown;
      error: unknown;
    };
  }>,
): AgencySyncDetails {
  if (!teamId) {
    return {
      state: "loading",
      label: "Loading",
      description: "Select a team to load agency data.",
      fetchingCount: 0,
      activeLabels: [],
      errors: [],
    };
  }

  const errors = queries
    .filter((query) => query.state.fetchStatus === "idle" && query.state.status === "error")
    .map((query) => ({
      label: labelForQueryKey(query.queryKey),
      message: getErrorMessage(query.state.error),
    }));

  if (errors.length > 0) {
    return {
      state: "error",
      label: "Sync interrupted",
      description: "Some team data failed to load. Retry by refreshing the page.",
      fetchingCount: isFetching,
      activeLabels: [],
      errors,
    };
  }

  const hasData = queries.some((query) => query.state.data !== undefined);
  const activeLabels = [
    ...new Set(
      queries
        .filter((query) => query.state.fetchStatus === "fetching")
        .map((query) => labelForQueryKey(query.queryKey)),
    ),
  ];

  if (isFetching > 0) {
    return {
      state: hasData ? "syncing" : "loading",
      label: hasData ? "Syncing…" : "Loading",
      description: hasData
        ? "Refreshing team data in the background."
        : "Loading team data for the first time.",
      fetchingCount: isFetching,
      activeLabels,
      errors: [],
    };
  }

  return {
    state: "synced",
    label: "Synced",
    description: "Team data is up to date.",
    fetchingCount: 0,
    activeLabels: [],
    errors: [],
  };
}

export function useAgencySyncDetails(teamId: string): AgencySyncDetails {
  const queryClient = useQueryClient();

  const isFetching = useIsFetching({
    predicate: teamId ? teamQueryPredicate(teamId) : undefined,
  });

  return useMemo(() => {
    if (!teamId) {
      return resolveAgencySyncDetails(teamId, isFetching, []);
    }

    const queries = queryClient.getQueryCache().findAll({
      predicate: teamQueryPredicate(teamId),
    });

    return resolveAgencySyncDetails(teamId, isFetching, queries);
  }, [teamId, queryClient, isFetching]);
}
