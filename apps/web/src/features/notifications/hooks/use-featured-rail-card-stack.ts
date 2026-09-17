import type { NotificationRecord } from "@orch/api/schemas/notifications";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/navigation";

import { useAppUpdateStore } from "@/features/app-shell/app-update-store";
import {
  useAgencyNotificationsQuery,
  useMarkNotificationReadMutation,
} from "@/features/notifications/notifications-queries";
import type { FeaturedRailCard } from "@/features/notifications/featured-rail-card-stack-types";
import {
  buildMemberAlertOrchPrompt,
  featuredNotificationBody,
  featuredNotificationCta,
  featuredNotificationTitle,
  isNeedsActionNotification,
  notificationHref,
} from "@/features/notifications/notification-presentation";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { useTeamStore } from "@/features/team/team-store";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";

type AlertKind = "abnormal_day" | "month_pace" | "quarter_pace" | "waste_spike" | "custom";

const MAX_STACK_CARDS = 3;

function alertSeverityRank(kind: AlertKind): number {
  switch (kind) {
    case "abnormal_day":
    case "waste_spike":
      return 0;
    case "month_pace":
    case "quarter_pace":
      return 1;
    case "custom":
      return 2;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function profileAlertsHref(input?: { alertId?: string; dateKey?: string; periodKey?: string }) {
  const params = new URLSearchParams({ focus: "alerts" });
  if (input?.alertId) params.set("alertId", input.alertId);
  const dateKey = input?.dateKey;
  const periodKey = input?.periodKey;
  if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    params.set("day", dateKey);
  } else if (
    periodKey &&
    (/^\d{4}-\d{2}$/.test(periodKey) ||
      /^tm:\d{4}-\d{2}-\d{2}$/.test(periodKey) ||
      /^\d{4}-Q[1-4]$/.test(periodKey))
  ) {
    params.set("period", periodKey);
  }
  return `/agency/me?${params.toString()}`;
}

export function useFeaturedRailCardStack() {
  const session = authClient.useSession();
  const teamId = useTeamStore((s) => s.selectedTeamId) ?? "";
  const userId = session.data?.user?.id ?? "";
  const navigate = useNavigate();
  const utcOffsetMinutes = new Date().getTimezoneOffset();
  const startTimer = useAgencyTimeTrackingStore((state) => state.startTimer);
  const updateAvailable = useAppUpdateStore((s) => s.updateAvailable);
  const isRefreshing = useAppUpdateStore((s) => s.isRefreshing);
  const beginRefresh = useAppUpdateStore((s) => s.beginRefresh);

  const alertsQuery = useQuery({
    ...orpc.agencyOps.memberProfile.alerts.list.queryOptions({
      input: { teamId, userId, utcOffsetMinutes },
    }),
    enabled: Boolean(teamId && userId && session.data?.user),
  });

  const notificationsQuery = useAgencyNotificationsQuery(teamId, Boolean(teamId));
  const markReadMutation = useMarkNotificationReadMutation(teamId);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [swap, setSwap] = useState<{ cardId: string; phase: "lift" | "land" } | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const alertItems = alertsQuery.data?.items ?? [];
  const notificationItems = notificationsQuery.data?.items ?? [];

  const cards = useMemo(() => {
    const next: FeaturedRailCard[] = [];

    if (updateAvailable) {
      next.push({
        id: "app-update",
        kind: "app-update",
        sectionLabel: "Update",
        title: "App update",
        body: "A newer version of Orch is ready.",
        ctaLabel: "Update now",
        tone: "update",
        dismissible: false,
      });
    }

    const needsAction = notificationItems
      .filter(isNeedsActionNotification)
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    for (const notification of needsAction) {
      next.push({
        id: `notification:${notification.id}`,
        kind: "notification",
        sectionLabel: "Needs action",
        title: featuredNotificationTitle(notification),
        body: featuredNotificationBody(notification),
        ctaLabel: "Read",
        tone: "action",
        dismissible: true,
        actorName: notification.actorName,
        actorAvatar: notification.actorAvatar,
      });
    }

    const sortedAlerts = alertItems
      .slice()
      .sort(
        (a, b) =>
          alertSeverityRank(a.kind) - alertSeverityRank(b.kind) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    for (const alert of sortedAlerts) {
      next.push({
        id: `alert:${alert.id}`,
        kind: "alert",
        sectionLabel: "Alerts",
        title: alert.title,
        body: alert.body,
        ctaLabel: "View",
        tone: "alert",
        dismissible: false,
      });
    }

    return next.slice(0, MAX_STACK_CARDS);
  }, [alertItems, notificationItems, updateAvailable]);

  const priorityOrder = useMemo(() => cards.map((card) => card.id), [cards]);

  useEffect(() => {
    setOrder(priorityOrder);
  }, [priorityOrder.join("|")]);

  const orderedCards = useMemo(() => {
    const byId = new Map(cards.map((card) => [card.id, card]));
    const resolved = order
      .map((id) => byId.get(id))
      .filter((card): card is FeaturedRailCard => !!card);
    for (const card of cards) {
      if (!resolved.some((item) => item.id === card.id)) resolved.push(card);
    }
    return resolved;
  }, [cards, order]);

  const overflowCount = Math.max(
    0,
    (updateAvailable ? 1 : 0) +
      notificationItems.filter(isNeedsActionNotification).length +
      alertItems.length -
      orderedCards.length,
  );

  const listPending =
    (alertsQuery.isPending && !alertsQuery.data) ||
    (!updateAvailable && notificationsQuery.isPending && !notificationsQuery.data);

  async function markRead(notification: NotificationRecord) {
    await markReadMutation.mutateAsync(notification.id);
  }

  async function openNotification(notification: NotificationRecord) {
    await markRead(notification);
    navigate(notificationHref(notification));
  }

  function promoteCard(cardId: string) {
    if (swap) return;
    setOrder((current) => [cardId, ...current.filter((id) => id !== cardId)]);
    if (reducedMotion) return;
    setSwap({ cardId, phase: "lift" });
  }

  async function handleCardCta(card: FeaturedRailCard) {
    if (actionPendingId) return;

    if (card.kind === "app-update") {
      if (isRefreshing) return;
      setActionPendingId(card.id);
      await beginRefresh();
      setActionPendingId(null);
      return;
    }

    if (card.kind === "alert") {
      const alertId = card.id.replace(/^alert:/, "");
      const alert = alertItems.find((item) => item.id === alertId);
      if (!alert) return;
      navigate(
        profileAlertsHref({
          alertId: alert.id,
          dateKey: alert.context?.dateKey,
          periodKey: alert.context?.periodKey,
        }),
      );
      return;
    }

    const notificationId = card.id.replace(/^notification:/, "");
    const notification = notificationItems.find((item) => item.id === notificationId);
    if (!notification || !teamId) return;

    const cta = featuredNotificationCta(notification);
    setActionPendingId(card.id);
    try {
      if (cta.kind === "start-timer") {
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
        await markRead(notification);
        navigate("/agency");
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
        await markRead(notification);
        return;
      }
      await openNotification(notification);
    } finally {
      setActionPendingId(null);
    }
  }

  function handleDismiss(card: FeaturedRailCard) {
    if (!card.dismissible || actionPendingId) return;
    const notificationId = card.id.replace(/^notification:/, "");
    const notification = notificationItems.find((item) => item.id === notificationId);
    if (!notification) return;
    void markRead(notification);
  }

  useEffect(() => {
    if (swap?.phase !== "lift") return;
    const timer = window.setTimeout(() => {
      setSwap((current) => (current ? { ...current, phase: "land" } : null));
    }, 170);
    return () => window.clearTimeout(timer);
  }, [swap]);

  useEffect(() => {
    if (swap?.phase !== "land") return;
    const timer = window.setTimeout(() => setSwap(null), 420);
    return () => window.clearTimeout(timer);
  }, [swap]);

  return {
    teamId,
    userId,
    listPending,
    cards: orderedCards,
    overflowCount,
    actionPendingId,
    swappingCardId: swap?.cardId ?? null,
    swapPhase: swap?.phase ?? null,
    isHovered,
    reducedMotion,
    onHoverChange: setIsHovered,
    onPromoteCard: promoteCard,
    onCardCta: (cardId: string) => {
      const card = orderedCards.find((item) => item.id === cardId);
      if (!card) return;
      void handleCardCta(card);
    },
    onDismissCard: (cardId: string) => {
      const card = orderedCards.find((item) => item.id === cardId);
      if (!card) return;
      handleDismiss(card);
    },
  };
}

export type FeaturedRailCardStackViewModel = ReturnType<typeof useFeaturedRailCardStack>;
