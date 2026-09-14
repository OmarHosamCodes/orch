import type { NotificationRecord } from "@orch/api/schemas/notifications";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@/lib/navigation";

import {
  useAgencyNotificationPreferencesQuery,
  useAgencyNotificationUnreadCountQuery,
  useAgencyNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMarkNotificationsSeenMutation,
  useSetNotificationDeliverySettingsMutation,
  useSetNotificationPreferencesMutation,
  type NotificationPreferenceItem,
} from "@/features/notifications/notifications-queries";
import {
  buildMemberAlertOrchPrompt,
  featuredNotificationCta,
  featuredNotificationBody,
  featuredNotificationTitle,
  formatDigestHours,
  formatRelativeTime,
  groupNotificationSections,
  notificationHref,
  notificationPreferenceLabel,
} from "@/features/notifications/notification-presentation";
import { useNotificationsInboxUiStore } from "@/features/notifications/stores/notifications-inbox-ui";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";
import {
  canUsePushNotifications,
  dismissPushPrompt,
  isPushPromptDismissed,
  pushPermissionState,
  subscribeToPushNotifications,
} from "@/lib/push";

export type AgencyNotificationsInput = {
  teamId: string;
};

function notificationSentenceParts(notification: NotificationRecord) {
  const actor = notification.actorName ?? "Someone";
  const payload = notification.payload;

  switch (notification.type) {
    case "task.assigned":
      return {
        kind: "assigned" as const,
        actor,
        taskTitle: payload.taskTitle ?? "a task",
      };
    case "task.message": {
      const count = payload.messageCount ?? 1;
      return {
        kind: "message" as const,
        actor,
        count,
        taskTitle: payload.taskTitle ?? "a task",
      };
    }
    case "journey.milestone":
      return {
        kind: "milestone" as const,
        stepLabel: payload.journeyStepLabel ?? "Milestone",
        projectName: payload.projectName ?? "a project",
      };
    case "timer.activity":
      return {
        kind: "timer" as const,
        actor,
        timerAction:
          payload.timerAction === "stopped" ? ("stopped" as const) : ("started" as const),
        taskTitle: payload.taskTitle ?? null,
        projectName: payload.projectName ?? "a project",
      };
    case "team.digest":
      return {
        kind: "digest" as const,
        hoursLabel: formatDigestHours(payload.digestHoursSeconds ?? 0),
        tasksCompleted: payload.digestTasksCompleted ?? 0,
      };
    case "member.alert":
      return {
        kind: "memberAlert" as const,
        actor,
        alertTitle: payload.alertTitle ?? "a profile alert",
        notePreview: payload.notePreview?.trim() || null,
      };
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }
}

export function useAgencyNotifications(input: AgencyNotificationsInput) {
  const teamId = input.teamId;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushDismissed, setPushDismissed] = useState(isPushPromptDismissed);
  const [timezoneDraft, setTimezoneDraft] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const openRequested = useNotificationsInboxUiStore((s) => s.openRequested);
  const consumeOpen = useNotificationsInboxUiStore((s) => s.consumeOpen);

  const notificationsQuery = useAgencyNotificationsQuery(teamId, open);
  const unreadQuery = useAgencyNotificationUnreadCountQuery(teamId);
  const preferencesQuery = useAgencyNotificationPreferencesQuery(teamId, open);
  const { mutate: markSeen } = useMarkNotificationsSeenMutation(teamId);
  const markSeenRef = useRef(markSeen);
  markSeenRef.current = markSeen;
  const markedSeenForOpenRef = useRef(false);
  const markReadMutation = useMarkNotificationReadMutation(teamId);
  const markAllReadMutation = useMarkAllNotificationsReadMutation(teamId);
  const setPreferencesMutation = useSetNotificationPreferencesMutation(teamId);
  const setDeliveryMutation = useSetNotificationDeliverySettingsMutation(teamId);
  const startTimer = useAgencyTimeTrackingStore((state) => state.startTimer);

  const unreadCount = unreadQuery.data?.count ?? 0;
  const actionCount = unreadQuery.data?.actionCount ?? 0;
  const badgeCount = actionCount > 0 ? actionCount : unreadCount;
  const badgeLabel = badgeCount > 9 ? "9+" : String(badgeCount);

  const items = notificationsQuery.data?.items ?? [];
  const hasUnread = items.some((item) => !item.readAt);
  const sections = useMemo(() => groupNotificationSections(items), [items]);
  const deliveryTimezone = preferencesQuery.data?.delivery?.timezone;

  useEffect(() => {
    if (!openRequested) return;
    setOpen(true);
    consumeOpen();
  }, [openRequested, consumeOpen]);

  // Once per open: mutate identity churn + cache invalidation must not re-fire markSeen
  // (that loops into max update depth and unmounts #root with no useful console error).
  useEffect(() => {
    if (!open) {
      markedSeenForOpenRef.current = false;
      return;
    }
    if (!teamId || markedSeenForOpenRef.current) return;
    markedSeenForOpenRef.current = true;
    markSeenRef.current();
  }, [open, teamId]);

  useEffect(() => {
    if (deliveryTimezone) {
      setTimezoneDraft(deliveryTimezone);
    }
  }, [deliveryTimezone]);

  const showPushPrompt =
    Boolean(teamId) &&
    canUsePushNotifications() &&
    !pushDismissed &&
    pushPermissionState() === "default" &&
    !showSettings;

  async function openNotification(notification: NotificationRecord) {
    await markReadMutation.mutateAsync(notification.id);
    setOpen(false);
    navigate(notificationHref(notification));
  }

  async function handleStartTimer(notification: NotificationRecord) {
    const payload = notification.payload;
    if (!payload.projectId || !payload.taskId || !payload.taskTitle || !payload.projectName) {
      await openNotification(notification);
      return;
    }

    await startTimer({
      teamId,
      project: { id: payload.projectId, name: payload.projectName },
      task: { id: payload.taskId, title: payload.taskTitle },
      description: payload.taskTitle,
      successDescription: "Timer started from notification.",
    });
    await markReadMutation.mutateAsync(notification.id);
    setOpen(false);
    navigate("/agency");
  }

  async function handlePrimaryAction(notification: NotificationRecord) {
    if (pendingActionId) return;
    setPendingActionId(notification.id);
    try {
      const cta = featuredNotificationCta(notification);
      if (cta.kind === "start-timer") {
        await handleStartTimer(notification);
        return;
      }
      if (cta.kind === "ask-orch") {
        const payload = notification.payload;
        const prompt = buildMemberAlertOrchPrompt({
          title: payload.alertTitle ?? featuredNotificationTitle(notification),
          body: featuredNotificationBody(notification),
          dateKey: payload.dateKey,
        });
        useWorkspaceAgentStore.getState().seedComposer({ text: prompt, toolPreset: "plan" });
        await markReadMutation.mutateAsync(notification.id);
        setOpen(false);
        return;
      }
      await openNotification(notification);
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleDismissNotification(notification: NotificationRecord) {
    if (pendingActionId) return;
    await markReadMutation.mutateAsync(notification.id);
  }

  async function handleEnablePush() {
    setPushBusy(true);
    try {
      await subscribeToPushNotifications();
      setPushDismissed(true);
      dismissPushPrompt();
    } catch {
      // quiet by default: user can retry from settings later
    } finally {
      setPushBusy(false);
    }
  }

  function togglePreferenceChannel(pref: NotificationPreferenceItem, channel: "inApp" | "push") {
    void setPreferencesMutation.mutateAsync([
      {
        ...pref,
        [channel]: !pref[channel],
      },
    ]);
  }

  function setFocusMode(focusMode: boolean) {
    void setDeliveryMutation.mutateAsync({ focusMode });
  }

  function setQuietHours(quietHoursStart: string | null, quietHoursEnd: string | null) {
    void setDeliveryMutation.mutateAsync({ quietHoursStart, quietHoursEnd });
  }

  function commitTimezone() {
    const next = timezoneDraft.trim();
    if (!next || next === preferencesQuery.data?.delivery?.timezone) return;
    void setDeliveryMutation.mutateAsync({ timezone: next });
  }

  const delivery = preferencesQuery.data?.delivery ?? {
    timezone: timezoneDraft,
    quietHoursStart: null,
    quietHoursEnd: null,
    focusUntil: null,
    focusMode: false,
  };

  return {
    teamId,
    open,
    setOpen,
    showSettings,
    setShowSettings,
    pushBusy,
    showPushPrompt,
    unreadCount,
    actionCount,
    badgeCount,
    badgeLabel,
    items,
    sections,
    hasUnread,
    listPending: notificationsQuery.isPending,
    preferencesPending: preferencesQuery.isPending && !preferencesQuery.data,
    preferences: preferencesQuery.data?.items ?? [],
    delivery,
    timezoneDraft,
    preferencesSaving: setPreferencesMutation.isPending || setDeliveryMutation.isPending,
    markAllReadPending: markAllReadMutation.isPending,
    pendingActionId,
    formatRelativeTime,
    notificationSentenceParts,
    notificationPreferenceLabel,
    onMarkAllRead: () => void markAllReadMutation.mutateAsync(),
    onOpenNotification: (notification: NotificationRecord) => void openNotification(notification),
    onPrimaryAction: (notification: NotificationRecord) => void handlePrimaryAction(notification),
    onDismissNotification: (notification: NotificationRecord) =>
      void handleDismissNotification(notification),
    onStartTimer: (notification: NotificationRecord) => void handleStartTimer(notification),
    onEnablePush: () => void handleEnablePush(),
    onDismissPushPrompt: () => {
      dismissPushPrompt();
      setPushDismissed(true);
    },
    onTogglePreferenceChannel: togglePreferenceChannel,
    onSetFocusMode: setFocusMode,
    onSetQuietHours: setQuietHours,
    onTimezoneDraftChange: setTimezoneDraft,
    onTimezoneCommit: commitTimezone,
  };
}

export type AgencyNotificationsViewModel = ReturnType<typeof useAgencyNotifications>;
