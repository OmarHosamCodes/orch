import { describe, expect, mock, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { isRedirect } from "@tanstack/react-router";

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
  getRpcBaseUrl: () => "http://localhost:7000",
  getAuthBaseUrl: () => "http://localhost:7000",
}));

const { teamListQueryKey } = await import("@/features/team/team-queries");
const { orpc } = await import("@/lib/orpc");
const { loadAuthenticatedShell } = await import("./authenticated-boot");

const session = { user: { id: "u1", name: "Ada", email: "ada@orch.test" } };
const teams = {
  items: [
    { id: "team-a", name: "Alpha" },
    { id: "team-b", name: "Beta" },
  ],
};

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

function chromeFor(teamId: string) {
  return {
    teams,
    teamId,
    unread: { count: 1, actionCount: 0 },
    notifications: { items: [], nextCursor: null },
    timer: { timer: null },
  };
}

describe("loadAuthenticatedShell", () => {
  test("expired or revoked sessions redirect to login with the deep-link path", async () => {
    const fetchSession = mock(async () => null);
    try {
      await loadAuthenticatedShell({
        queryClient: createClient(),
        location: { pathname: "/agency/projects/p1", searchStr: "?focus=task-1" },
        fetchSession,
        fetchChrome: async () => chromeFor("team-a"),
      });
      throw new Error("expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as { options: { href: string } }).options.href).toBe(
        "/login?redirect=%2Fagency%2Fprojects%2Fp1%3Ffocus%3Dtask-1",
      );
    }
    expect(fetchSession).toHaveBeenCalledTimes(1);
  });

  test("direct canvas load without search uses the canvas fallback redirect", async () => {
    try {
      await loadAuthenticatedShell({
        queryClient: createClient(),
        location: { pathname: "", searchStr: "" },
        fetchSession: async () => null,
        fetchChrome: async () => chromeFor("team-a"),
      });
      throw new Error("expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as { options: { href: string } }).options.href).toBe(
        "/login?redirect=%2Fcanvas",
      );
    }
  });

  test("successful boot seeds chrome for the preferred team", async () => {
    const queryClient = createClient();
    const fetchChrome = mock(async (teamId?: string) => chromeFor(teamId || "team-a"));

    const result = await loadAuthenticatedShell({
      queryClient,
      location: { pathname: "/agency", searchStr: "" },
      preferredTeamId: "team-b",
      fetchSession: async () => session,
      fetchChrome,
    });

    expect(result).toEqual({ session, teamCount: 2, firstRun: null });
    expect(fetchChrome).toHaveBeenCalledWith("team-b");
    expect(queryClient.getQueryData(teamListQueryKey())).toEqual(teams);
  });

  test("empty team boot does not auto-create an agency", async () => {
    const queryClient = createClient();
    const fetchChrome = mock(async () => ({
      ...chromeFor(""),
      teams: { items: [] },
      teamId: "",
    }));

    const result = await loadAuthenticatedShell({
      queryClient,
      location: { pathname: "/canvas", searchStr: "" },
      fetchSession: async () => session,
      fetchChrome,
    });

    expect(fetchChrome).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ session, teamCount: 0, firstRun: null });
  });

  test("incomplete first-run redirects to welcome", async () => {
    try {
      await loadAuthenticatedShell({
        queryClient: createClient(),
        location: { pathname: "/canvas", searchStr: "" },
        fetchSession: async () => session,
        fetchChrome: async () => ({ ...chromeFor(""), teams: { items: [] }, teamId: "" }),
        fetchFirstRun: async () => ({
          status: "create",
          completedAt: null,
          membershipCount: 0,
          joinTeam: null,
          defaultAgencyName: "Ada's agency",
        }),
      });
      throw new Error("expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as { options: { href: string } }).options.href).toBe("/welcome");
    }
  });

  test("completed first-run on welcome opens tracker when the account has an agency", async () => {
    try {
      await loadAuthenticatedShell({
        queryClient: createClient(),
        location: { pathname: "/welcome", searchStr: "" },
        fetchSession: async () => session,
        fetchChrome: async () => chromeFor("team-a"),
        fetchFirstRun: async () => ({
          status: "done",
          completedAt: "2026-09-18T00:00:00.000Z",
          membershipCount: 1,
          joinTeam: { id: "team-a", name: "Alpha" },
          defaultAgencyName: "Ada's agency",
        }),
      });
      throw new Error("expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as { options: { href: string } }).options.href).toBe("/agency");
    }
  });

  test("completed first-run with no agency sends leftover canvas instead of Agency", async () => {
    try {
      await loadAuthenticatedShell({
        queryClient: createClient(),
        location: { pathname: "/agency", searchStr: "" },
        fetchSession: async () => session,
        fetchChrome: async () => ({ ...chromeFor(""), teams: { items: [] }, teamId: "" }),
        fetchFirstRun: async () => ({
          status: "done",
          completedAt: "2026-09-18T00:00:00.000Z",
          membershipCount: 0,
          joinTeam: null,
          defaultAgencyName: "Ada's agency",
        }),
      });
      throw new Error("expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as { options: { href: string } }).options.href).toBe("/canvas");
    }
  });

  test("prefetches billing for the resolved team after chrome loads", async () => {
    const queryClient = createClient();
    const prefetchQuery = mock(async () => undefined);
    queryClient.prefetchQuery = prefetchQuery as typeof queryClient.prefetchQuery;
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });

    try {
      await loadAuthenticatedShell({
        queryClient,
        location: { pathname: "/agency", searchStr: "" },
        preferredTeamId: "team-b",
        fetchSession: async () => session,
        fetchChrome: async () => chromeFor("team-b"),
      });

      expect(prefetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: orpc.billing.state.queryOptions({ input: { teamId: "team-b" } }).queryKey,
        }),
      );
    } finally {
      if (windowDescriptor) {
        Object.defineProperty(globalThis, "window", windowDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "window");
      }
    }
  });

  test("failed team list does not seed an empty list over a good cache", async () => {
    const queryClient = createClient();
    queryClient.setQueryData(teamListQueryKey(), teams);

    const result = await loadAuthenticatedShell({
      queryClient,
      location: { pathname: "/agency", searchStr: "" },
      fetchSession: async () => session,
      fetchChrome: async () => ({
        teams: null,
        teamId: "",
        unread: null,
        notifications: null,
        timer: null,
      }),
    });

    expect(result.teamCount).toBe(0);
    expect(result.firstRun).toBeNull();
    expect(queryClient.getQueryData(teamListQueryKey())).toEqual(teams);
  });

  test("hard refresh remains request-scoped: each load fetches session and chrome again", async () => {
    const fetchSession = mock(async () => session);
    const fetchChrome = mock(async () => chromeFor("team-a"));
    const queryClient = createClient();

    await loadAuthenticatedShell({
      queryClient,
      location: { pathname: "/agency", searchStr: "" },
      fetchSession,
      fetchChrome,
    });
    await loadAuthenticatedShell({
      queryClient,
      location: { pathname: "/agency", searchStr: "" },
      fetchSession,
      fetchChrome,
    });

    expect(fetchSession).toHaveBeenCalledTimes(2);
    expect(fetchChrome).toHaveBeenCalledTimes(2);
  });
});
