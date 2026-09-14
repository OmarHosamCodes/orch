import type { QueryKey } from "@tanstack/react-query";

import { getQueryClient } from "@/lib/query-client";

export type QuerySnapshot = {
  queryKey: QueryKey;
  data: unknown;
};

export function snapshotQueries(queries: Iterable<{ queryKey: QueryKey }>): QuerySnapshot[] {
  return [...queries].map((query) => ({
    queryKey: query.queryKey,
    data: getQueryClient().getQueryData(query.queryKey),
  }));
}

export function restoreQuerySnapshots(snapshots: QuerySnapshot[]) {
  snapshots.forEach((snapshot) => {
    getQueryClient().setQueryData(snapshot.queryKey, snapshot.data);
  });
}
