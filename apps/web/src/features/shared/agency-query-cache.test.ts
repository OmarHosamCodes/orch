import { QueryClient } from "@tanstack/react-query";
import { describe, expect, mock, test } from "bun:test";

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
  getRpcBaseUrl: () => "http://localhost:7000",
  getAuthBaseUrl: () => "http://localhost:7000",
}));

const { bindQueryClient } = await import("@/lib/query-client");
const {
  findProjectTaskInCache,
  isAgencyProjectJourneyQueryKey,
  patchActiveTimerInCache,
  patchDeletedProjectTaskInCache,
  patchInsertedProjectTaskInCache,
  patchUpdatedProjectTaskInCache,
  reconcileCreatedProjectTaskInCache,
} = await import("./agency-query-cache");

const teamId = "team-1";

const listQueryKey = [
  ["agencyOps", "projectTasks", "list"],
  { input: { teamId, statuses: ["open", "in_progress"] }, type: "query" },
] as const;

const infiniteQueryKey = [...listQueryKey, "infinite"] as const;
const chooserCatalogQueryKey = [...listQueryKey, "infinite", "catalog"] as const;

function makeTask(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    teamId,
    projectId: "project-1",
    title: `Task ${id}`,
    iconKey: null,
    iconSource: "auto" as const,
    status: "open" as const,
    taskKind: "standard" as const,
    assignedToTeam: true,
    isWaste: false,
    estimateMinutes: null,
    billableRateAmount: null,
    sourceBillableRateAmount: null,
    currency: "USD",
    projectBillableRateAmount: null,
    projectSourceBillableRateAmount: null,
    projectCurrency: "USD",
    clientBillableRateAmount: null,
    clientSourceBillableRateAmount: null,
    clientCurrency: "USD",
    createdByUserId: "user-1",
    assignees: [],
    dueDate: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function setupClient() {
  const client = new QueryClient();
  bindQueryClient(client);
  return client;
}

describe("patchInsertedProjectTaskInCache", () => {
  test("does not throw on infinite-shaped cache and prepends to pages[0]", () => {
    const client = setupClient();
    const existing = makeTask("existing");
    client.setQueryData(infiniteQueryKey, {
      pages: [{ items: [existing], page: 1, pageSize: 50, total: 1 }],
      pageParams: [1],
    });

    const task = makeTask("new-task");
    expect(() => patchInsertedProjectTaskInCache(teamId, task)).not.toThrow();

    const data = client.getQueryData<{
      pages: Array<{ items: Array<{ id: string }>; total?: number }>;
    }>(infiniteQueryKey);
    expect(data?.pages[0]?.items.map((item) => item.id)).toEqual(["new-task", "existing"]);
    expect(data?.pages[0]?.total).toBe(2);
  });

  test("still patches list-shaped cache", () => {
    const client = setupClient();
    client.setQueryData(listQueryKey, { items: [makeTask("existing")], total: 1 });

    patchInsertedProjectTaskInCache(teamId, makeTask("new-task"));

    const data = client.getQueryData<{ items: Array<{ id: string }>; total?: number }>(
      listQueryKey,
    );
    expect(data?.items.map((item) => item.id)).toEqual(["new-task", "existing"]);
    expect(data?.total).toBe(2);
  });

  test("seeds and keeps infinite shape for chooser catalog keys ending in catalog", () => {
    const client = setupClient();
    client.setQueryData(chooserCatalogQueryKey, {
      pages: [{ items: [makeTask("existing")], page: 1, pageSize: 100, total: 1 }],
      pageParams: [1],
    });
    patchInsertedProjectTaskInCache(teamId, makeTask("new-task"));
    const data = client.getQueryData<{
      pages: Array<{ items: Array<{ id: string }>; total?: number }>;
    }>(chooserCatalogQueryKey);
    expect(data?.pages).toBeDefined();
    expect(data?.pages[0]?.items.map((item) => item.id)).toEqual(["new-task", "existing"]);
    expect(Object.hasOwn(data ?? {}, "items")).toBe(false);
  });

  test("does not duplicate a task that already exists on a later infinite page", () => {
    const client = setupClient();
    client.setQueryData(chooserCatalogQueryKey, {
      pages: [
        { items: [makeTask("a")], page: 1, pageSize: 1, total: 2 },
        { items: [makeTask("b")], page: 2, pageSize: 1, total: 2 },
      ],
      pageParams: [1, 2],
    });

    patchInsertedProjectTaskInCache(teamId, makeTask("b", { title: "Task b updated" }));

    const data = client.getQueryData<{
      pages: Array<{ items: Array<{ id: string; title: string }> }>;
    }>(chooserCatalogQueryKey);
    const ids = data?.pages.flatMap((page) => page.items.map((item) => item.id));
    expect(ids).toEqual(["a", "b"]);
    expect(data?.pages[1]?.items[0]?.title).toBe("Task b updated");
  });

  test("heals list-shaped data corruptly stored under a chooser infinite key", () => {
    const client = setupClient();
    client.setQueryData(chooserCatalogQueryKey, {
      items: [makeTask("existing")],
      total: 1,
    });
    expect(() => patchInsertedProjectTaskInCache(teamId, makeTask("new-task"))).not.toThrow();
    const data = client.getQueryData<{
      pages?: Array<{ items: Array<{ id: string }> }>;
      items?: unknown;
    }>(chooserCatalogQueryKey);
    expect(data?.pages?.[0]?.items.map((item) => item.id)).toEqual(["new-task", "existing"]);
    expect(data?.items).toBeUndefined();
  });
});

describe("reconcileCreatedProjectTaskInCache", () => {
  test("replaces optimistic id in infinite pages", () => {
    const client = setupClient();
    client.setQueryData(infiniteQueryKey, {
      pages: [{ items: [makeTask("optimistic")], page: 1, pageSize: 50, total: 1 }],
      pageParams: [1],
    });

    reconcileCreatedProjectTaskInCache(teamId, "optimistic", makeTask("real"));

    const data = client.getQueryData<{ pages: Array<{ items: Array<{ id: string }> }> }>(
      infiniteQueryKey,
    );
    expect(data?.pages[0]?.items.map((item) => item.id)).toEqual(["real"]);
  });
});

describe("patchUpdatedProjectTaskInCache / patchDeletedProjectTaskInCache", () => {
  test("updates and deletes across infinite pages without throwing", () => {
    const client = setupClient();
    client.setQueryData(infiniteQueryKey, {
      pages: [
        { items: [makeTask("a")], page: 1, pageSize: 1, total: 2 },
        { items: [makeTask("b")], page: 2, pageSize: 1, total: 2 },
      ],
      pageParams: [1, 2],
    });

    patchUpdatedProjectTaskInCache(teamId, makeTask("b", { title: "Updated B" }));
    let data = client.getQueryData<{
      pages: Array<{ items: Array<{ id: string; title: string }> }>;
    }>(infiniteQueryKey);
    expect(data?.pages[1]?.items[0]?.title).toBe("Updated B");

    patchDeletedProjectTaskInCache(teamId, "a");
    data = client.getQueryData(infiniteQueryKey);
    expect(data?.pages[0]?.items).toEqual([]);
    expect(data?.pages[1]?.items.map((item) => item.id)).toEqual(["b"]);
  });
});

describe("findProjectTaskInCache", () => {
  test("finds tasks in infinite pages", () => {
    const client = setupClient();
    client.setQueryData(infiniteQueryKey, {
      pages: [{ items: [makeTask("cached")], page: 1, pageSize: 50, total: 1 }],
      pageParams: [1],
    });

    expect(findProjectTaskInCache(teamId, "cached")?.id).toBe("cached");
  });
});

describe("patchActiveTimerInCache", () => {
  test("seeds listActiveMembers cache even when query has not mounted", () => {
    const client = setupClient();
    const membersQueryKey = [
      ["agencyOps", "timer", "listActiveMembers"],
      { input: { teamId }, type: "query" },
    ] as const;
    const timer = {
      teamId,
      userId: "user-1",
      projectName: "Project Alpha",
      description: "Working",
      startedAt: "2026-07-04T12:00:00.000Z",
    };

    patchActiveTimerInCache(teamId, timer);

    const members = client.getQueryData<{ items: Array<{ userId: string }> }>(membersQueryKey);
    expect(members?.items.map((item) => item.userId)).toEqual(["user-1"]);
  });
});

describe("isAgencyProjectJourneyQueryKey", () => {
  test("matches the live journey project and excludes unrelated queries", () => {
    const matchingKey = [
      ["agencyOps", "projects", "journey", "get"],
      { input: { teamId, projectId: "project-1" }, type: "query" },
    ] as const;
    const otherProjectKey = [
      ["agencyOps", "projects", "journey", "get"],
      { input: { teamId, projectId: "project-2" }, type: "query" },
    ] as const;
    const otherTeamKey = [
      ["agencyOps", "projects", "journey", "get"],
      { input: { teamId: "team-2", projectId: "project-1" }, type: "query" },
    ] as const;

    expect(isAgencyProjectJourneyQueryKey(matchingKey, teamId, "project-1")).toBe(true);
    expect(isAgencyProjectJourneyQueryKey(otherProjectKey, teamId, "project-1")).toBe(false);
    expect(isAgencyProjectJourneyQueryKey(otherTeamKey, teamId, "project-1")).toBe(false);
  });
});
