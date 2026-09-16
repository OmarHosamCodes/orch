import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import type { AgencyLiveEvent } from "@orch/api/routers/agency-ops/live/live";
import type { NotificationRecord } from "@orch/api/schemas/notifications";
import { QueryClient } from "@tanstack/react-query";

let sessionRequestCount = 0;

mock.restore();

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
  getRpcBaseUrl: () => "http://localhost:7000",
  getAuthBaseUrl: () => "http://localhost:7000",
}));

mock.module("@/lib/auth-client", () => ({
  authClient: {
    getSession: mock(async () => {
      sessionRequestCount += 1;
      return { data: { user: { id: "user-1" } } };
    }),
    useSession: () => ({ data: { user: { id: "user-1" } }, isPending: false }),
  },
  markAuthSessionReady: () => {},
  whenAuthSessionReady: async () => {},
}));

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("/api/auth/get-session") || url.includes("get-session")) {
    sessionRequestCount += 1;
  }
  return originalFetch(input, init);
}) as typeof fetch;

const { bindQueryClient } = await import("@/lib/query-client");
const { orpc } = await import("@/lib/orpc");
const { NOTIFICATION_LIST_LIMIT } =
  await import("@/features/notifications/notification-list-limit");
const { useAgencyOptimisticStore } = await import("@/features/shared/stores/agency-optimistic");
const { useAgencyTimeTrackingStore } =
  await import("@/features/time-tracking/stores/agency-time-tracking");
const { applyViewerTimerUpdated, handleAgencyLiveEvent } = await import("./agency-live-handlers");

const viewerUserId = "user-1";
const otherUserId = "user-2";

function settledContext(userId: string | null, isCurrent = () => true) {
  return { viewerUserId: userId, isCurrent };
}

function makeTimer(
  teamId: string,
  userId: string,
  overrides: Partial<Extract<AgencyLiveEvent, { type: "timer.updated" }>["timer"]> = {},
) {
  const timestamp = "2026-07-18T09:30:00.000Z";
  return {
    id: `timer-${userId}`,
    teamId,
    userId,
    projectId: "project-1",
    taskId: "task-1",
    taskTitle: "Confirmed task",
    taskIconKey: "flag" as const,
    projectName: "Orch",
    colorHueId: 1,
    projectIconKey: "code" as const,
    description: "Confirmed description",
    isBillable: false,
    tags: [] as [],
    links: [] as [],
    startedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function timerUpdated(
  teamId: string,
  userId: string,
  timerOverrides: Partial<
    NonNullable<Extract<AgencyLiveEvent, { type: "timer.updated" }>["timer"]>
  > = {},
): Extract<AgencyLiveEvent, { type: "timer.updated" }> {
  return {
    type: "timer.updated",
    teamId,
    userId,
    updatedAt: "2026-07-18T09:30:01.000Z",
    timer: makeTimer(teamId, userId, timerOverrides),
  };
}

function notificationRecord(
  teamId: string,
  recipientUserId: string,
  id = "notification-1",
): NotificationRecord {
  return {
    id,
    teamId,
    recipientUserId,
    actorUserId: "user-actor",
    actorName: "Actor",
    actorAvatar: null,
    type: "task.assigned",
    deliveryClass: "interrupt",
    payload: { taskId: "task-1", taskTitle: "Task" },
    readAt: null,
    seenAt: null,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
  };
}

function notificationCreated(
  teamId: string,
  recipientUserId: string,
  id = "notification-1",
): Extract<AgencyLiveEvent, { type: "notification.created" }> {
  return {
    type: "notification.created",
    teamId,
    updatedAt: "2026-07-10T00:00:01.000Z",
    notification: notificationRecord(teamId, recipientUserId, id),
  };
}

function membersKey(teamId: string) {
  return orpc.agencyOps.timer.listActiveMembers.queryOptions({ input: { teamId } }).queryKey;
}

function unreadKey(teamId: string) {
  return orpc.notifications.unreadCount.queryKey({ input: { teamId } });
}

function listKey(teamId: string) {
  return orpc.notifications.list.queryKey({
    input: { teamId, limit: NOTIFICATION_LIST_LIMIT },
  });
}

async function flushLiveWork() {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve();
  }
}

describe("viewer timer live reconciliation", () => {
  test("hydrates Zustand with the full timer and ignores older pub/sub events", () => {
    bindQueryClient(new QueryClient());
    const teamId = "timer-live-test-team";
    const timestamp = "2026-07-18T09:30:00.000Z";
    const timer = {
      id: "timer-live-1",
      teamId,
      userId: "user-1",
      projectId: "project-1",
      taskId: "task-1",
      taskTitle: "Confirmed task",
      projectName: "Orch",
      description: "Confirmed description",
      isBillable: false,
      tags: [
        {
          id: "tag-1",
          teamId,
          name: "Realtime",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      links: [],
      startedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const confirmedEvent: Extract<AgencyLiveEvent, { type: "timer.updated" }> = {
      type: "timer.updated",
      teamId,
      userId: "user-1",
      updatedAt: "2026-07-18T09:30:01.000Z",
      timer,
    };

    applyViewerTimerUpdated(confirmedEvent);

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]).toEqual(timer);
    expect(useAgencyTimeTrackingStore.getState().trackerDraftsByTeam[teamId]).toMatchObject({
      description: "Confirmed description",
      projectId: "project-1",
      taskId: "task-1",
      tagIds: ["tag-1"],
      isBillable: false,
      syncedTimerId: "timer-live-1",
    });

    applyViewerTimerUpdated({
      ...confirmedEvent,
      updatedAt: "2026-07-18T09:29:59.000Z",
      timer: { ...timer, taskId: "stale-task", taskTitle: "Stale task" },
    });

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]?.taskId).toBe("task-1");

    applyViewerTimerUpdated({
      ...confirmedEvent,
      updatedAt: "2026-07-18T09:30:01.500Z",
      timer: {
        ...timer,
        projectId: "project-2",
        taskId: "task-2",
        taskTitle: "Authoritative task",
        isBillable: true,
        tags: [],
      },
    });

    expect(useAgencyTimeTrackingStore.getState().trackerDraftsByTeam[teamId]).toMatchObject({
      projectId: "project-2",
      taskId: "task-2",
      tagIds: [],
      isBillable: true,
    });

    applyViewerTimerUpdated({
      ...confirmedEvent,
      updatedAt: "2026-07-18T09:30:02.000Z",
      timer: null,
    });

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]).toBeNull();
    expect(
      useAgencyTimeTrackingStore.getState().trackerDraftsByTeam[teamId]?.syncedTimerId,
    ).toBeNull();
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("live handler viewer identity", () => {
  afterEach(() => {
    sessionRequestCount = 0;
  });

  test("100 timer and notification events with a settled viewer add zero session requests", async () => {
    const teamId = "burst-team";
    const queryClient = new QueryClient();
    bindQueryClient(queryClient);
    queryClient.setQueryData(unreadKey(teamId), { count: 0, actionCount: 0 });
    queryClient.setQueryData(listKey(teamId), { items: [], nextCursor: null });
    sessionRequestCount = 0;

    const context = settledContext(viewerUserId);
    for (let i = 0; i < 50; i++) {
      handleAgencyLiveEvent(
        teamId,
        timerUpdated(teamId, viewerUserId, {
          description: `burst-${i}`,
          updatedAt: `2026-07-18T09:30:${String(i).padStart(2, "0")}.000Z`,
        }),
        context,
      );
      handleAgencyLiveEvent(
        teamId,
        notificationCreated(teamId, viewerUserId, `notification-burst-${i}`),
        context,
      );
    }
    await flushLiveWork();

    expect(sessionRequestCount).toBe(0);
    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]?.description).toBe("burst-49");
    expect(queryClient.getQueryData(unreadKey(teamId))).toEqual({
      count: NOTIFICATION_LIST_LIMIT,
      actionCount: NOTIFICATION_LIST_LIMIT,
    });
  });

  test("does not apply another user's timer to the viewer store", async () => {
    const teamId = "other-timer-team";
    const queryClient = new QueryClient();
    bindQueryClient(queryClient);
    queryClient.setQueryData(membersKey(teamId), { items: [] });

    handleAgencyLiveEvent(
      teamId,
      timerUpdated(teamId, otherUserId, { description: "someone else" }),
      settledContext(viewerUserId),
    );
    await flushLiveWork();

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]).toBeUndefined();
    expect(queryClient.getQueryData(membersKey(teamId))).toMatchObject({
      items: [{ userId: otherUserId, description: "someone else" }],
    });
  });

  test("does not apply another recipient's notification", async () => {
    const teamId = "other-note-team";
    const queryClient = new QueryClient();
    bindQueryClient(queryClient);
    queryClient.setQueryData(unreadKey(teamId), { count: 0, actionCount: 0 });
    queryClient.setQueryData(listKey(teamId), { items: [], nextCursor: null });

    handleAgencyLiveEvent(
      teamId,
      notificationCreated(teamId, otherUserId, "notification-other"),
      settledContext(viewerUserId),
    );
    await flushLiveWork();

    expect(queryClient.getQueryData(unreadKey(teamId))).toEqual({ count: 0, actionCount: 0 });
    expect(queryClient.getQueryData(listKey(teamId))).toEqual({ items: [], nextCursor: null });
  });

  test("drops timer and notification events when identity is unavailable", async () => {
    const teamId = "no-identity-team";
    const queryClient = new QueryClient();
    bindQueryClient(queryClient);
    queryClient.setQueryData(membersKey(teamId), { items: [] });
    queryClient.setQueryData(unreadKey(teamId), { count: 0, actionCount: 0 });
    queryClient.setQueryData(listKey(teamId), { items: [], nextCursor: null });

    handleAgencyLiveEvent(teamId, timerUpdated(teamId, viewerUserId), settledContext(null));
    handleAgencyLiveEvent(
      teamId,
      notificationCreated(teamId, viewerUserId, "notification-dropped"),
      settledContext(null),
    );
    await flushLiveWork();

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]).toBeUndefined();
    expect(queryClient.getQueryData(membersKey(teamId))).toEqual({ items: [] });
    expect(queryClient.getQueryData(unreadKey(teamId))).toEqual({ count: 0, actionCount: 0 });
    expect(queryClient.getQueryData(listKey(teamId))).toEqual({ items: [], nextCursor: null });
  });

  test("discards events whose teamId does not match the subscribed team", async () => {
    const teamId = "subscribed-team";
    const queryClient = new QueryClient();
    bindQueryClient(queryClient);
    queryClient.setQueryData(unreadKey(teamId), { count: 0, actionCount: 0 });

    handleAgencyLiveEvent(
      teamId,
      timerUpdated("other-team", viewerUserId, { description: "wrong team" }),
      settledContext(viewerUserId),
    );
    handleAgencyLiveEvent(
      teamId,
      notificationCreated("other-team", viewerUserId, "notification-wrong-team"),
      settledContext(viewerUserId),
    );
    await flushLiveWork();

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]).toBeUndefined();
    expect(useAgencyOptimisticStore.getState().activeTimers["other-team"]).toBeUndefined();
    expect(queryClient.getQueryData(unreadKey(teamId))).toEqual({ count: 0, actionCount: 0 });
  });

  test("sign-in as another user does not leak the previous viewer's live updates", async () => {
    const teamId = "switch-user-team";
    const queryClient = new QueryClient();
    bindQueryClient(queryClient);
    queryClient.setQueryData(membersKey(teamId), { items: [] });
    queryClient.setQueryData(unreadKey(teamId), { count: 0, actionCount: 0 });
    queryClient.setQueryData(listKey(teamId), { items: [], nextCursor: null });

    handleAgencyLiveEvent(
      teamId,
      timerUpdated(teamId, viewerUserId, { description: "first user" }),
      settledContext(viewerUserId),
    );
    await flushLiveWork();
    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]?.description).toBe(
      "first user",
    );

    handleAgencyLiveEvent(
      teamId,
      timerUpdated(teamId, viewerUserId, { description: "should not leak" }),
      settledContext(otherUserId),
    );
    handleAgencyLiveEvent(
      teamId,
      notificationCreated(teamId, viewerUserId, "notification-old-user"),
      settledContext(otherUserId),
    );
    handleAgencyLiveEvent(
      teamId,
      timerUpdated(teamId, otherUserId, { description: "second user" }),
      settledContext(otherUserId),
    );
    handleAgencyLiveEvent(
      teamId,
      notificationCreated(teamId, otherUserId, "notification-new-user"),
      settledContext(otherUserId),
    );
    await flushLiveWork();

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]?.description).toBe(
      "second user",
    );
    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]?.userId).toBe(otherUserId);
    const members = queryClient.getQueryData<{
      items: Array<{ userId: string; description: string }>;
    }>(membersKey(teamId));
    expect(
      members?.items.some(
        (item) => item.userId === viewerUserId && item.description === "should not leak",
      ),
    ).toBe(true);
    const list = queryClient.getQueryData<{ items: NotificationRecord[] }>(listKey(teamId));
    expect(list?.items.map((item) => item.id)).toEqual(["notification-new-user"]);
  });

  test("discards work when the identity is already superseded", async () => {
    const teamId = "stale-identity-team";
    bindQueryClient(new QueryClient());

    handleAgencyLiveEvent(
      teamId,
      timerUpdated(teamId, viewerUserId, { description: "stale" }),
      settledContext(viewerUserId, () => false),
    );
    await flushLiveWork();

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]).toBeUndefined();
  });
});
