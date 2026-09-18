import { describe, expect, mock, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
  getRpcBaseUrl: () => "http://localhost:7000",
  getAuthBaseUrl: () => "http://localhost:7000",
}));

const { orpc } = await import("@/lib/orpc");
const { NOTIFICATION_LIST_LIMIT } =
  await import("@/features/notifications/notification-list-limit");
const { teamListQueryKey } = await import("@/features/team/team-queries");
const { loadBootShellChrome, resolveBootTeamId, seedBootChromeQueries } =
  await import("./boot-chrome");

const teamA = { id: "team-a", name: "Alpha" };
const teamB = { id: "team-b", name: "Beta" };
const teams = { items: [teamA, teamB] };
const unread = { count: 4, actionCount: 1 };
const notifications = { items: [{ id: "n1" }], nextCursor: null };
const timer = { timer: { id: "t1" } };

function unreadKey(teamId: string) {
  return orpc.notifications.unreadCount.queryKey({ input: { teamId } });
}

function listKey(teamId: string) {
  return orpc.notifications.list.queryKey({
    input: { teamId, limit: NOTIFICATION_LIST_LIMIT },
  });
}

function timerKey(teamId: string) {
  return orpc.agencyOps.timer.getActive.queryKey({ input: { teamId } });
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });
}

function fakeChromeClient(overrides?: {
  teams?: () => Promise<{ items: Array<{ id: string; name: string }> }>;
  unreadCount?: (input: { teamId: string }) => Promise<typeof unread>;
  list?: (input: { teamId: string; limit: number }) => Promise<typeof notifications>;
  getActive?: (input: { teamId: string }) => Promise<typeof timer>;
}) {
  return {
    team: {
      list: overrides?.teams ?? (async () => teams),
    },
    notifications: {
      unreadCount: overrides?.unreadCount ?? (async () => unread),
      list: overrides?.list ?? (async () => notifications),
    },
    agencyOps: {
      timer: {
        getActive: overrides?.getActive ?? (async () => timer),
      },
    },
  };
}

describe("resolveBootTeamId", () => {
  test("first team is only an initial fallback", () => {
    expect(resolveBootTeamId(teams.items, undefined)).toBe("team-a");
    expect(resolveBootTeamId(teams.items, "")).toBe("team-a");
  });

  test("preserves the selected team when it is still in the list", () => {
    expect(resolveBootTeamId(teams.items, "team-b")).toBe("team-b");
  });

  test("falls back to the first team when the selected team is gone", () => {
    expect(resolveBootTeamId(teams.items, "team-missing")).toBe("team-a");
  });

  test("no-team accounts resolve to an empty team id", () => {
    expect(resolveBootTeamId([], "team-a")).toBe("");
  });
});

describe("loadBootShellChrome", () => {
  test("loads chrome for the selected team, not always the first team", async () => {
    const requested: string[] = [];
    const client = fakeChromeClient({
      unreadCount: async ({ teamId }) => {
        requested.push(teamId);
        return unread;
      },
    });

    const chrome = await loadBootShellChrome(client, "team-b");
    expect(chrome.teamId).toBe("team-b");
    expect(requested).toEqual(["team-b"]);
    expect(chrome.unread).toEqual(unread);
    expect(chrome.notifications).toEqual(notifications);
    expect(chrome.timer).toEqual(timer);
  });

  test("keeps successful chrome RPCs when a sibling fetch fails", async () => {
    const client = fakeChromeClient({
      list: async () => {
        throw new Error("list failed");
      },
    });

    const chrome = await loadBootShellChrome(client, "team-a");
    expect(chrome.teams).toEqual(teams);
    expect(chrome.teamId).toBe("team-a");
    expect(chrome.unread).toEqual(unread);
    expect(chrome.notifications).toBeNull();
    expect(chrome.timer).toEqual(timer);
  });

  test("failed team list is null, not a successful empty list", async () => {
    const client = fakeChromeClient({
      teams: async () => {
        throw new Error("teams failed");
      },
    });

    const chrome = await loadBootShellChrome(client);
    expect(chrome.teams).toBeNull();
    expect(chrome.teamId).toBe("");
    expect(chrome.unread).toBeNull();
    expect(chrome.notifications).toBeNull();
    expect(chrome.timer).toBeNull();
  });

  test("starts team-scoped chrome with team.list when a preferred team is set", async () => {
    let listReleased = false;
    let unreadStartedBeforeListResolved = false;
    const client = fakeChromeClient({
      teams: async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
        listReleased = true;
        return teams;
      },
      unreadCount: async ({ teamId }) => {
        unreadStartedBeforeListResolved = !listReleased;
        expect(teamId).toBe("team-b");
        return unread;
      },
    });

    const chrome = await loadBootShellChrome(client, "team-b");
    expect(chrome.teamId).toBe("team-b");
    expect(unreadStartedBeforeListResolved).toBe(true);
  });

  test("discards speculative chrome when preferred team is not in the list", async () => {
    const requested: string[] = [];
    const client = fakeChromeClient({
      unreadCount: async ({ teamId }) => {
        requested.push(teamId);
        return unread;
      },
    });

    const chrome = await loadBootShellChrome(client, "team-missing");
    expect(chrome.teamId).toBe("team-a");
    expect(chrome.unread).toEqual(unread);
    expect(requested.includes("team-a")).toBe(true);
  });

  test("no-team accounts skip notification and timer fetches", async () => {
    let chromeCalls = 0;
    const client = fakeChromeClient({
      teams: async () => ({ items: [] }),
      unreadCount: async () => {
        chromeCalls += 1;
        return unread;
      },
    });

    const chrome = await loadBootShellChrome(client);
    expect(chrome.teamId).toBe("");
    expect(chrome.teams).toEqual({ items: [] });
    expect(chromeCalls).toBe(0);
  });
});

describe("seedBootChromeQueries", () => {
  test("seeds only successful chrome results", () => {
    const queryClient = createClient();
    seedBootChromeQueries(
      queryClient,
      {
        teams,
        teamId: "team-a",
        unread,
        notifications: null,
        timer,
      },
      Date.now(),
    );

    expect(queryClient.getQueryData(teamListQueryKey())).toEqual(teams);
    expect(queryClient.getQueryData(unreadKey("team-a"))).toEqual(unread);
    expect(queryClient.getQueryData(listKey("team-a"))).toBeUndefined();
    expect(queryClient.getQueryData(timerKey("team-a"))).toEqual(timer);
  });

  test("failed chrome RPCs do not seed authoritative zeros", () => {
    const queryClient = createClient();
    seedBootChromeQueries(
      queryClient,
      {
        teams,
        teamId: "team-a",
        unread: null,
        notifications: null,
        timer: null,
      },
      Date.now(),
    );

    expect(queryClient.getQueryData(unreadKey("team-a"))).toBeUndefined();
    expect(queryClient.getQueryData(listKey("team-a"))).toBeUndefined();
    expect(queryClient.getQueryData(timerKey("team-a"))).toBeUndefined();
  });

  test("failed team list does not seed or wipe an existing team list", () => {
    const queryClient = createClient();
    queryClient.setQueryData(teamListQueryKey(), teams);

    seedBootChromeQueries(
      queryClient,
      {
        teams: null,
        teamId: "",
        unread: null,
        notifications: null,
        timer: null,
      },
      Date.now(),
    );

    expect(queryClient.getQueryData(teamListQueryKey())).toEqual(teams);
  });

  test("does not overwrite query data updated after boot began", () => {
    const queryClient = createClient();
    const bootStartedAt = Date.now() - 10;
    const liveUnread = { count: 9, actionCount: 2 };
    queryClient.setQueryData(unreadKey("team-a"), liveUnread);

    seedBootChromeQueries(
      queryClient,
      {
        teams,
        teamId: "team-a",
        unread,
        notifications,
        timer,
      },
      bootStartedAt,
    );

    expect(queryClient.getQueryData(unreadKey("team-a"))).toEqual(liveUnread);
    expect(queryClient.getQueryData(listKey("team-a"))).toEqual(notifications);
  });

  test("does not seed another team's chrome when no team is selected yet", () => {
    const queryClient = createClient();
    seedBootChromeQueries(
      queryClient,
      {
        teams: { items: [] },
        teamId: "",
        unread,
        notifications,
        timer,
      },
      Date.now(),
    );

    expect(queryClient.getQueryData(teamListQueryKey())).toEqual({ items: [] });
    expect(queryClient.getQueryData(unreadKey("team-a"))).toBeUndefined();
  });
});
