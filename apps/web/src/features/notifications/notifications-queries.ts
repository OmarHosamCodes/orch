import type { NotificationRecord } from "@orch/api/schemas/notifications";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AgencyLiveConnectionState } from "@/features/shared/agency-live-rpc";
import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { useAgencyLiveConnectionState } from "@/features/shared/live/agency-live-connection";
import { NOTIFICATION_LIST_LIMIT } from "@/features/notifications/notification-list-limit";

export type NotificationPreferenceType =
  | "task.assigned"
  | "task.message"
  | "journey.milestone"
  | "timer.activity"
  | "team.digest"
  | "member.alert";

export type NotificationPreferenceItem = {
  type: NotificationPreferenceType;
  inApp: boolean;
  push: boolean;
};

function notificationListQueryKey(teamId: string) {
  return orpc.notifications.list.queryKey({
    input: { teamId, limit: NOTIFICATION_LIST_LIMIT },
  });
}

function notificationUnreadCountQueryKey(teamId: string) {
  return orpc.notifications.unreadCount.queryKey({ input: { teamId } });
}

function notificationPreferencesQueryKey(teamId: string) {
  return orpc.notifications.preferences.get.queryKey({ input: { teamId } });
}

function patchNotificationList(
  queryClient: QueryClient,
  teamId: string,
  updater: (items: NotificationRecord[]) => NotificationRecord[],
) {
  queryClient.setQueryData(
    notificationListQueryKey(teamId),
    (current: { items: NotificationRecord[]; nextCursor: string | null } | undefined) => {
      if (!current?.items) return current;
      return { ...current, items: updater(current.items) };
    },
  );
}

function isActionItem(notification: NotificationRecord) {
  if (notification.deliveryClass === "interrupt" || notification.deliveryClass === "breakpoint") {
    return true;
  }
  return (
    notification.type === "task.assigned" ||
    notification.type === "task.message" ||
    notification.type === "member.alert"
  );
}

type NotificationListCache = {
  items: NotificationRecord[];
  nextCursor: string | null;
};

type NotificationCountCache = {
  count: number;
  actionCount: number;
};

type NotificationQuerySnapshot = {
  list: NotificationListCache | undefined;
  count: NotificationCountCache | undefined;
};

function notificationVersion(notification: NotificationRecord) {
  return Date.parse(notification.updatedAt) || 0;
}

function isUnreadAction(notification: NotificationRecord) {
  return !notification.readAt && isActionItem(notification);
}

function countContribution(notification: NotificationRecord) {
  return {
    count: notification.seenAt ? 0 : 1,
    actionCount: isUnreadAction(notification) ? 1 : 0,
  };
}

function countDelta(previous: NotificationRecord | undefined, incoming: NotificationRecord) {
  const next = countContribution(incoming);
  if (!previous) {
    return next;
  }
  const prev = countContribution(previous);
  return {
    count: next.count - prev.count,
    actionCount: next.actionCount - prev.actionCount,
  };
}

const pendingCountReconcile = new Set<string>();

function scheduleAuthoritativeCountFetch(queryClient: QueryClient, teamId: string) {
  if (pendingCountReconcile.has(teamId)) {
    return;
  }
  pendingCountReconcile.add(teamId);
  queueMicrotask(() => {
    pendingCountReconcile.delete(teamId);
    void queryClient.invalidateQueries({
      queryKey: notificationUnreadCountQueryKey(teamId),
    });
  });
}

function snapshotNotificationQueries(
  queryClient: QueryClient,
  teamId: string,
): NotificationQuerySnapshot {
  return {
    list: queryClient.getQueryData(notificationListQueryKey(teamId)),
    count: queryClient.getQueryData(notificationUnreadCountQueryKey(teamId)),
  };
}

function restoreNotificationQueries(
  queryClient: QueryClient,
  teamId: string,
  snapshot: NotificationQuerySnapshot,
) {
  queryClient.setQueryData(notificationListQueryKey(teamId), snapshot.list);
  if (snapshot.count === undefined) {
    // setQueryData(undefined) no-ops and would leave an optimistic { count: 0 }.
    queryClient.removeQueries({ queryKey: notificationUnreadCountQueryKey(teamId) });
    return;
  }
  queryClient.setQueryData(notificationUnreadCountQueryKey(teamId), snapshot.count);
}

export function applyNotificationCreatedToCache(
  queryClient: QueryClient,
  teamId: string,
  notification: NotificationRecord,
) {
  const listKey = notificationListQueryKey(teamId);
  const unreadKey = notificationUnreadCountQueryKey(teamId);
  const currentList = queryClient.getQueryData<NotificationListCache>(listKey);
  const previous = currentList?.items.find((item) => item.id === notification.id);

  if (previous && notificationVersion(previous) > notificationVersion(notification)) {
    return;
  }

  if (currentList?.items) {
    queryClient.setQueryData(listKey, {
      ...currentList,
      items: [
        notification,
        ...currentList.items.filter((item) => item.id !== notification.id),
      ].slice(0, NOTIFICATION_LIST_LIMIT),
    });
  }

  if (previous && notificationVersion(previous) === notificationVersion(notification)) {
    return;
  }

  const currentCount = queryClient.getQueryData<NotificationCountCache>(unreadKey);
  const listMissing = !currentList?.items;
  const truncatedUnknown = !previous && (currentList?.items.length ?? 0) >= NOTIFICATION_LIST_LIMIT;

  if (currentCount === undefined || listMissing || truncatedUnknown) {
    scheduleAuthoritativeCountFetch(queryClient, teamId);
    return;
  }

  const delta = countDelta(previous, notification);
  queryClient.setQueryData(unreadKey, {
    count: Math.max(0, currentCount.count + delta.count),
    actionCount: Math.max(0, (currentCount.actionCount ?? 0) + delta.actionCount),
  });
}

function markAllReadInCache(queryClient: QueryClient, teamId: string) {
  const now = new Date().toISOString();
  patchNotificationList(queryClient, teamId, (items) =>
    items.map((item) =>
      item.readAt ? item : { ...item, readAt: now, seenAt: item.seenAt ?? now },
    ),
  );
  queryClient.setQueryData(notificationUnreadCountQueryKey(teamId), {
    count: 0,
    actionCount: 0,
  });
}

function markOneReadInCache(queryClient: QueryClient, teamId: string, notificationId: string) {
  const now = new Date().toISOString();
  let wasUnreadAction = false;
  patchNotificationList(queryClient, teamId, (items) =>
    items.map((item) => {
      if (item.id !== notificationId) return item;
      if (!item.readAt && isActionItem(item)) wasUnreadAction = true;
      return { ...item, readAt: now, seenAt: item.seenAt ?? now };
    }),
  );
  if (wasUnreadAction) {
    queryClient.setQueryData(
      notificationUnreadCountQueryKey(teamId),
      (current: { count: number; actionCount?: number } | undefined) => ({
        count: current?.count ?? 0,
        actionCount: Math.max(0, (current?.actionCount ?? 0) - 1),
      }),
    );
  }
}

function markSeenInCache(queryClient: QueryClient, teamId: string) {
  const now = new Date().toISOString();
  patchNotificationList(queryClient, teamId, (items) =>
    items.map((item) => (item.seenAt ? item : { ...item, seenAt: now })),
  );
  queryClient.setQueryData(
    notificationUnreadCountQueryKey(teamId),
    (current: { count: number; actionCount?: number } | undefined) => ({
      count: 0,
      actionCount: current?.actionCount ?? 0,
    }),
  );
}

async function invalidateNotificationQueries(queryClient: QueryClient, teamId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: notificationUnreadCountQueryKey(teamId) }),
    queryClient.invalidateQueries({ queryKey: notificationListQueryKey(teamId) }),
  ]);
}

function notificationLiveSyncOptions(teamId: string, liveState: AgencyLiveConnectionState) {
  return {
    liveGated: true,
    teamId,
    connectedReconcile: true,
    liveState,
  };
}

export function useAgencyNotificationsQuery(teamId: string, enabled = true) {
  const liveState = useAgencyLiveConnectionState(teamId);
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.notifications.list.queryOptions({
          input: { teamId, limit: NOTIFICATION_LIST_LIMIT },
        }),
        enabled: Boolean(teamId) && enabled,
      },
      "warm",
      notificationLiveSyncOptions(teamId, liveState),
    ),
  );
}

export function useAgencyNotificationUnreadCountQuery(teamId: string, enabled = true) {
  const liveState = useAgencyLiveConnectionState(teamId);
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.notifications.unreadCount.queryOptions({
          input: { teamId },
        }),
        enabled: Boolean(teamId) && enabled,
      },
      "cold",
      notificationLiveSyncOptions(teamId, liveState),
    ),
  );
}

export function useAgencyNotificationPreferencesQuery(teamId: string, enabled = false) {
  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.notifications.preferences.get.queryOptions({
          input: { teamId },
        }),
        enabled: Boolean(teamId) && enabled,
      },
      "cold",
    ),
  );
}

async function cancelNotificationQueries(queryClient: QueryClient, teamId: string) {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: notificationListQueryKey(teamId) }),
    queryClient.cancelQueries({ queryKey: notificationUnreadCountQueryKey(teamId) }),
  ]);
}

export function notificationMarkSeenMutationOptions(
  queryClient: QueryClient,
  teamId: string,
  mutationFn: () => Promise<unknown> = () => orpc.notifications.markSeen.call({ teamId }),
) {
  return {
    mutationFn,
    onMutate: async () => {
      await cancelNotificationQueries(queryClient, teamId);
      const snapshot = snapshotNotificationQueries(queryClient, teamId);
      markSeenInCache(queryClient, teamId);
      return snapshot;
    },
    onError: (
      _error: unknown,
      _variables: void,
      snapshot: NotificationQuerySnapshot | undefined,
    ) => {
      if (snapshot) {
        restoreNotificationQueries(queryClient, teamId, snapshot);
      }
    },
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient, teamId);
    },
  };
}

export function notificationMarkReadMutationOptions(
  queryClient: QueryClient,
  teamId: string,
  mutationFn: (notificationId: string) => Promise<unknown> = (notificationId) =>
    orpc.notifications.markRead.call({ teamId, notificationId }),
) {
  return {
    mutationFn,
    onMutate: async (notificationId: string) => {
      await cancelNotificationQueries(queryClient, teamId);
      const snapshot = snapshotNotificationQueries(queryClient, teamId);
      markOneReadInCache(queryClient, teamId, notificationId);
      return snapshot;
    },
    onError: (
      _error: unknown,
      _notificationId: string,
      snapshot: NotificationQuerySnapshot | undefined,
    ) => {
      if (snapshot) {
        restoreNotificationQueries(queryClient, teamId, snapshot);
      }
    },
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient, teamId);
    },
  };
}

export function notificationMarkAllReadMutationOptions(
  queryClient: QueryClient,
  teamId: string,
  mutationFn: () => Promise<unknown> = () => orpc.notifications.markAllRead.call({ teamId }),
) {
  return {
    mutationFn,
    onMutate: async () => {
      await cancelNotificationQueries(queryClient, teamId);
      const snapshot = snapshotNotificationQueries(queryClient, teamId);
      markAllReadInCache(queryClient, teamId);
      return snapshot;
    },
    onError: (
      _error: unknown,
      _variables: void,
      snapshot: NotificationQuerySnapshot | undefined,
    ) => {
      if (snapshot) {
        restoreNotificationQueries(queryClient, teamId, snapshot);
      }
    },
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient, teamId);
    },
  };
}

export function useMarkNotificationsSeenMutation(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation(notificationMarkSeenMutationOptions(queryClient, teamId));
}

export function useMarkNotificationReadMutation(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation(notificationMarkReadMutationOptions(queryClient, teamId));
}

export function useMarkAllNotificationsReadMutation(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation(notificationMarkAllReadMutationOptions(queryClient, teamId));
}

export function useSetNotificationPreferencesMutation(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferenceItem[]) =>
      orpc.notifications.preferences.set.call({ teamId, preferences }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationPreferencesQueryKey(teamId),
      });
    },
  });
}

export function useSetNotificationDeliverySettingsMutation(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      timezone?: string;
      quietHoursStart?: string | null;
      quietHoursEnd?: string | null;
      focusMode?: boolean;
      focusUntil?: string | null;
    }) => orpc.notifications.preferences.setDelivery.call({ teamId, ...input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationPreferencesQueryKey(teamId),
      });
    },
  });
}
