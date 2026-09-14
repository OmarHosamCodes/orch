import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "bun:test";
import type { QueryKey } from "@tanstack/react-query";

import { restoreQuerySnapshots, snapshotQueries } from "@/features/shared/query-snapshots";

const KEY: QueryKey = ["hygiene-snapshot"];

describe("query-snapshots", () => {
  test("restore puts back the captured value", async () => {
    const { bindQueryClient, getQueryClient } = await import("@/lib/query-client");
    bindQueryClient(new QueryClient());
    const client = getQueryClient();
    client.setQueryData(KEY, { n: 1 });
    const snaps = snapshotQueries([{ queryKey: KEY }]);
    client.setQueryData(KEY, { n: 2 });
    restoreQuerySnapshots(snaps);
    expect(client.getQueryData(KEY)).toEqual({ n: 1 });
  });
});
