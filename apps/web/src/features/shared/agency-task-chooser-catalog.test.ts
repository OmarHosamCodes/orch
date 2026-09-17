import { afterAll, describe, expect, mock, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
  getRpcBaseUrl: () => "http://localhost:7000",
  getAuthBaseUrl: () => "http://localhost:7000",
}));

const listCalls: Array<{ page: number; search?: string; teamId: string }> = [];
let listShouldFail = false;

function orpcQueryKey(path: string[], input: unknown) {
  return [path, { input, type: "query" }] as const;
}

function createOrpcRouter(path: string[] = []): object {
  return new Proxy(
    {},
    {
      get(_target, key: string | symbol) {
        if (typeof key !== "string" || key === "then") return undefined;
        if (key === "queryKey") {
          return ({ input }: { input: unknown }) => orpcQueryKey(path, input);
        }
        if (key === "queryOptions") {
          return ({ input }: { input: unknown }) => ({
            queryKey: orpcQueryKey(path, input),
          });
        }
        return createOrpcRouter([...path, key]);
      },
    },
  );
}

mock.module("@/lib/orpc", () => ({
  orpc: createOrpcRouter(),
  orpcClient: {
    agencyOps: {
      projectTasks: {
        list: async (input: {
          teamId: string;
          page: number;
          pageSize?: number;
          search?: string;
        }) => {
          listCalls.push({
            page: input.page,
            search: input.search,
            teamId: input.teamId,
          });
          if (listShouldFail) throw new Error("hydrate failed");
          return makeListPage(input.page, input.pageSize ?? 100, 250);
        },
      },
    },
  },
}));

afterAll(() => {
  mock.restore();
});

const {
  AGENCY_TASK_CHOOSER_CATALOG_STALE_TIME_MS,
  AGENCY_TASK_CHOOSER_SEARCH_STALE_TIME_MS,
  agencyTaskChooserInfiniteQueryOptions,
  chooserNextPageParam,
  chooserPrefetchPageCount,
  chooserRemainderPageNumbers,
  ensureAgencyTaskChooserCatalog,
  flattenChooserPages,
  hydrateRemainingChooserPages,
  keepPreviousChooserDataForTeam,
  mergeChooserTasksById,
  shouldDrainChooserNextPage,
} = await import("./agency-task-chooser-catalog");

const PAGE_SIZE = 100;

function makeTask(id: string) {
  return { id, title: `Task ${id}` };
}

function makeListPage(page: number, pageSize: number, total: number) {
  const start = (page - 1) * pageSize;
  const remaining = Math.max(0, total - start);
  const count = Math.min(pageSize, remaining);
  return {
    items: Array.from({ length: count }, (_, index) => makeTask(`task-${start + index + 1}`)),
    page,
    pageSize,
    total,
  };
}

function drainPages(total: number) {
  const pages = [makeListPage(1, PAGE_SIZE, total)];
  const ids: string[] = [];
  while (true) {
    const last = pages[pages.length - 1]!;
    for (const item of last.items) ids.push(item.id);
    const next = chooserNextPageParam(last);
    if (next === undefined) break;
    pages.push(makeListPage(next, PAGE_SIZE, total));
  }
  return { pages, ids };
}

describe("chooserNextPageParam", () => {
  test("terminates without missing or duplicate IDs for 0/1/100/101/250+ catalogs", () => {
    for (const total of [0, 1, 100, 101, 250, 301]) {
      const { pages, ids } = drainPages(total);
      expect(chooserNextPageParam(pages[pages.length - 1]!)).toBeUndefined();
      expect(ids).toHaveLength(total);
      expect(new Set(ids).size).toBe(total);
      expect(pages.length).toBe(Math.max(1, Math.ceil(total / PAGE_SIZE) || 1));
    }
  });
});

describe("shouldDrainChooserNextPage", () => {
  const catalogKey = ["infinite", "catalog"] as const;
  const searchAlpha = ["infinite", "search", "alpha"] as const;
  const searchBeta = ["infinite", "search", "beta"] as const;
  const ready = {
    enabled: true,
    queryKey: catalogKey,
    hasNextPage: true,
    isFetchingNextPage: false,
    isError: false,
    isFetchNextPageError: false,
  };

  test("drains only the enabled current-team current-search query", () => {
    expect(shouldDrainChooserNextPage(ready, { enabled: true, queryKey: catalogKey })).toBe(true);
    expect(
      shouldDrainChooserNextPage(
        { ...ready, enabled: false },
        { enabled: true, queryKey: catalogKey },
      ),
    ).toBe(false);
    expect(shouldDrainChooserNextPage(ready, { enabled: false, queryKey: catalogKey })).toBe(false);
  });

  test("requests only one next page at a time and stops on error", () => {
    expect(
      shouldDrainChooserNextPage(
        { ...ready, isFetchingNextPage: true },
        { enabled: true, queryKey: catalogKey },
      ),
    ).toBe(false);
    expect(
      shouldDrainChooserNextPage(
        { ...ready, isError: true },
        { enabled: true, queryKey: catalogKey },
      ),
    ).toBe(false);
    expect(
      shouldDrainChooserNextPage(
        { ...ready, isFetchNextPageError: true },
        { enabled: true, queryKey: catalogKey },
      ),
    ).toBe(false);
  });

  test("stops draining a superseded search", () => {
    expect(
      shouldDrainChooserNextPage(
        { ...ready, queryKey: searchAlpha },
        { enabled: true, queryKey: searchBeta },
      ),
    ).toBe(false);
  });
});

describe("chooserPrefetchPageCount", () => {
  test("prefetches one page on an empty cache and keeps already hydrated pages", () => {
    expect(chooserPrefetchPageCount(0)).toBe(1);
    expect(chooserPrefetchPageCount(1)).toBe(1);
    expect(chooserPrefetchPageCount(3)).toBe(3);
  });
});

describe("chooserRemainderPageNumbers", () => {
  test("returns remaining pages after the first paint page", () => {
    expect(chooserRemainderPageNumbers({ total: 0, pageSize: 100, loadedPageCount: 1 })).toEqual(
      [],
    );
    expect(chooserRemainderPageNumbers({ total: 100, pageSize: 100, loadedPageCount: 1 })).toEqual(
      [],
    );
    expect(chooserRemainderPageNumbers({ total: 101, pageSize: 100, loadedPageCount: 1 })).toEqual([
      2,
    ]);
    expect(chooserRemainderPageNumbers({ total: 250, pageSize: 100, loadedPageCount: 1 })).toEqual([
      2, 3,
    ]);
    expect(chooserRemainderPageNumbers({ total: 250, pageSize: 100, loadedPageCount: 3 })).toEqual(
      [],
    );
  });
});

describe("agencyTaskChooserInfiniteQueryOptions", () => {
  test("shares infinite then catalog/search keys and catalog-only freshness", () => {
    const catalog = agencyTaskChooserInfiniteQueryOptions("team-1", "catalog");
    const search = agencyTaskChooserInfiniteQueryOptions("team-1", "search", "alpha");

    expect(catalog.queryKey.slice(-2)).toEqual(["infinite", "catalog"]);
    expect(search.queryKey.slice(-2)).toEqual(["infinite", "search"]);
    expect(catalog.staleTime).toBe(AGENCY_TASK_CHOOSER_CATALOG_STALE_TIME_MS);
    expect(search.staleTime).toBe(AGENCY_TASK_CHOOSER_SEARCH_STALE_TIME_MS);
    expect(AGENCY_TASK_CHOOSER_CATALOG_STALE_TIME_MS).toBe(15_000);
    expect(AGENCY_TASK_CHOOSER_SEARCH_STALE_TIME_MS).toBe(15_000);
    expect(catalog.initialPageParam).toBe(1);
    expect(search.initialPageParam).toBe(1);
  });
});

describe("flattenChooserPages / mergeChooserTasksById", () => {
  test("deduplicates task IDs across pages and selected-task cache records", () => {
    const pages = [
      { items: [makeTask("a"), makeTask("b")] },
      { items: [makeTask("b"), makeTask("c")] },
    ];
    expect(flattenChooserPages(pages).map((task) => task.id)).toEqual(["a", "b", "c"]);

    const selected = [makeTask("c"), makeTask("d")];
    expect(
      mergeChooserTasksById(flattenChooserPages(pages), selected).map((task) => task.id),
    ).toEqual(["a", "b", "c", "d"]);
  });
});

describe("keepPreviousChooserDataForTeam", () => {
  test("does not keep previous-team items while a new team loads", () => {
    const previousData = { pages: [{ items: [makeTask("old-team")] }], pageParams: [1] };
    const keep = keepPreviousChooserDataForTeam("team-2");
    const previousQuery = {
      queryKey: [
        ["agencyOps", "projectTasks", "list"],
        { input: { teamId: "team-1", pageSize: 100 }, type: "query" },
        "infinite",
        "catalog",
      ],
    };

    expect(keep(previousData, previousQuery)).toBeUndefined();
    expect(keepPreviousChooserDataForTeam("team-1")(previousData, previousQuery)).toEqual(
      previousData,
    );
  });
});

describe("ensureAgencyTaskChooserCatalog", () => {
  function setupClient() {
    listCalls.length = 0;
    listShouldFail = false;
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
      },
    });
  }

  test("stale prefetch does not truncate a hydrated catalog", async () => {
    const client = setupClient();
    const options = agencyTaskChooserInfiniteQueryOptions("team-1", "catalog");
    client.setQueryData(options.queryKey, {
      pages: [
        makeListPage(1, PAGE_SIZE, 250),
        makeListPage(2, PAGE_SIZE, 250),
        makeListPage(3, PAGE_SIZE, 250),
      ],
      pageParams: [1, 2, 3],
    });
    client
      .getQueryCache()
      .find({ queryKey: options.queryKey })
      ?.setState({
        dataUpdatedAt: Date.now() - 20_000,
      });

    await ensureAgencyTaskChooserCatalog(client, "team-1");

    const data = client.getQueryData<{ pages: Array<{ page: number }> }>(options.queryKey);
    expect(data?.pages.map((page) => page.page)).toEqual([1, 2, 3]);
    expect(listCalls.map((call) => call.page)).toEqual([1, 2, 3]);
  });

  test("fresh hydrated catalog prefetch makes zero list requests", async () => {
    const client = setupClient();
    const options = agencyTaskChooserInfiniteQueryOptions("team-1", "catalog");
    client.setQueryData(options.queryKey, {
      pages: [makeListPage(1, PAGE_SIZE, 250), makeListPage(2, PAGE_SIZE, 250)],
      pageParams: [1, 2],
    });

    await ensureAgencyTaskChooserCatalog(client, "team-1");

    expect(listCalls).toEqual([]);
    const data = client.getQueryData<{ pages: unknown[] }>(options.queryKey);
    expect(data?.pages).toHaveLength(2);
  });

  test("hydrateRemainingChooserPages writes remaining pages in one cache update", async () => {
    const client = setupClient();
    const options = agencyTaskChooserInfiniteQueryOptions("team-1", "catalog");
    client.setQueryData(options.queryKey, {
      pages: [makeListPage(1, PAGE_SIZE, 250)],
      pageParams: [1],
    });

    await hydrateRemainingChooserPages(client, "team-1");

    expect(listCalls.map((call) => call.page).sort((left, right) => left - right)).toEqual([2, 3]);
    const data = client.getQueryData<{ pages: Array<{ page: number }> }>(options.queryKey);
    expect(data?.pages.map((page) => page.page)).toEqual([1, 2, 3]);
  });

  test("hydrateRemainingChooserPages does not retry after a remainder fetch error", async () => {
    const client = setupClient();
    listShouldFail = true;
    const options = agencyTaskChooserInfiniteQueryOptions("team-fail", "catalog");
    client.setQueryData(options.queryKey, {
      pages: [makeListPage(1, PAGE_SIZE, 250)],
      pageParams: [1],
    });

    await hydrateRemainingChooserPages(client, "team-fail");
    const failedCalls = listCalls.length;
    expect(failedCalls).toBeGreaterThan(0);

    await hydrateRemainingChooserPages(client, "team-fail");
    expect(listCalls.length).toBe(failedCalls);

    const data = client.getQueryData<{ pages: Array<{ page: number }> }>(options.queryKey);
    expect(data?.pages.map((page) => page.page)).toEqual([1]);
  });
});
