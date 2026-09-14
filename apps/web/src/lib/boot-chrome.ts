import type { AppRouterClient } from "@orch/api/routers/index";
import type { QueryClient } from "@tanstack/react-query";

import { NOTIFICATION_LIST_LIMIT } from "@/features/notifications/notification-list-limit";
import { teamListQueryKey } from "@/features/team/team-queries";
import { orpc } from "@/lib/orpc";

type BootTeams = Awaited<ReturnType<AppRouterClient["team"]["list"]>>;
type BootUnreadCount = Awaited<ReturnType<AppRouterClient["notifications"]["unreadCount"]>>;
type BootNotificationList = Awaited<ReturnType<AppRouterClient["notifications"]["list"]>>;
type BootActiveTimer = Awaited<ReturnType<AppRouterClient["agencyOps"]["timer"]["getActive"]>>;

export type BootShellChrome = {
  teams: BootTeams | null;
  teamId: string;
  unread: BootUnreadCount | null;
  notifications: BootNotificationList | null;
  timer: BootActiveTimer | null;
};

export type BootChromeClient = {
  team: { list: () => Promise<BootTeams> };
  notifications: {
    unreadCount: (input: { teamId: string }) => Promise<BootUnreadCount>;
    list: (input: { teamId: string; limit: number }) => Promise<BootNotificationList>;
  };
  agencyOps: {
    timer: { getActive: (input: { teamId: string }) => Promise<BootActiveTimer> };
  };
};

const emptyChrome = (): BootShellChrome => ({
  teams: null,
  teamId: "",
  unread: null,
  notifications: null,
  timer: null,
});

export function resolveBootTeamId(
  teams: Array<{ id: string }>,
  preferredTeamId?: string | null,
): string {
  if (preferredTeamId && teams.some((team) => team.id === preferredTeamId)) {
    return preferredTeamId;
  }
  return teams[0]?.id ?? "";
}

async function settleOrNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

export async function loadBootShellChrome(
  client: BootChromeClient,
  preferredTeamId?: string | null,
): Promise<BootShellChrome> {
  let teams: BootTeams;
  try {
    teams = await client.team.list();
  } catch {
    return emptyChrome();
  }

  const teamId = resolveBootTeamId(teams.items, preferredTeamId);
  if (!teamId) {
    return { ...emptyChrome(), teams };
  }

  const [unread, notifications, timer] = await Promise.all([
    settleOrNull(client.notifications.unreadCount({ teamId })),
    settleOrNull(client.notifications.list({ teamId, limit: NOTIFICATION_LIST_LIMIT })),
    settleOrNull(client.agencyOps.timer.getActive({ teamId })),
  ]);

  return { teams, teamId, unread, notifications, timer };
}

function seedIfNotNewer<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  data: T,
  bootStartedAt: number,
) {
  const state = queryClient.getQueryState(queryKey);
  if (state && state.dataUpdatedAt > bootStartedAt) {
    return;
  }
  queryClient.setQueryData(queryKey, data);
}

export function seedBootChromeQueries(
  queryClient: QueryClient,
  chrome: BootShellChrome,
  bootStartedAt: number,
): void {
  if (chrome.teams != null) {
    seedIfNotNewer(queryClient, teamListQueryKey(), chrome.teams, bootStartedAt);
  }
  if (!chrome.teamId) {
    return;
  }
  if (chrome.unread != null) {
    seedIfNotNewer(
      queryClient,
      orpc.notifications.unreadCount.queryKey({ input: { teamId: chrome.teamId } }),
      chrome.unread,
      bootStartedAt,
    );
  }
  if (chrome.notifications != null) {
    seedIfNotNewer(
      queryClient,
      orpc.notifications.list.queryKey({
        input: { teamId: chrome.teamId, limit: NOTIFICATION_LIST_LIMIT },
      }),
      chrome.notifications,
      bootStartedAt,
    );
  }
  if (chrome.timer != null) {
    seedIfNotNewer(
      queryClient,
      orpc.agencyOps.timer.getActive.queryKey({ input: { teamId: chrome.teamId } }),
      chrome.timer,
      bootStartedAt,
    );
  }
}
