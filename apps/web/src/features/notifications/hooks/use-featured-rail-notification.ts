import type { NotificationRecord } from "@orch/api/schemas/notifications";
import { useMemo, useState } from "react";
import { useNavigate } from "@/lib/navigation";

import { useAppUpdateStore } from "@/features/app-shell/app-update-store";
import {
  useAgencyNotificationsQuery,
  useMarkNotificationReadMutation,
} from "@/features/notifications/notifications-queries";
import {
  buildMemberAlertOrchPrompt,
  featuredNotificationBody,
  featuredNotificationCta,
  featuredNotificationTitle,
  formatRelativeTime,
  notificationHref,
  pickFeaturedNeedsAction,
  pickFeaturedRailItem,
} from "@/features/notifications/notification-presentation";
import { useTeamStore } from "@/features/team/team-store";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";

export function useFeaturedRailNotification() {
  const teamId = useTeamStore((s) => s.selectedTeamId) ?? "";
  const navigate = useNavigate();
  const startTimer = useAgencyTimeTrackingStore((state) => state.startTimer);
  const updateAvailable = useAppUpdateStore((s) => s.updateAvailable);
  const isRefreshing = useAppUpdateStore((s) => s.isRefreshing);
  const beginRefresh = useAppUpdateStore((s) => s.beginRefresh);
  const listQuery = useAgencyNotificationsQuery(teamId, Boolean(teamId));
  const markReadMutation = useMarkNotificationReadMutation(teamId);
  const [actionPending, setActionPending] = useState(false);
  const [featuredSkip, setFeaturedSkip] = useState(0);

  const items = listQuery.data?.items ?? [];
  const picked = useMemo(
    () => pickFeaturedRailItem(items, updateAvailable),
    [items, updateAvailable],
  );
  const needsAction = useMemo(
    () => pickFeaturedNeedsAction(items, featuredSkip),
    [featuredSkip, items],
  );
  const featured = picked.kind === "app-update" ? null : needsAction.featured;
  const count = picked.kind === "app-update" ? picked.count : needsAction.count;
  const isAppUpdate = picked.kind === "app-update";

  const title = isAppUpdate ? "App update" : featured ? featuredNotificationTitle(featured) : "";
  const body = isAppUpdate
    ? "A newer version of Orch is ready."
    : featured
      ? featuredNotificationBody(featured)
      : "";
  const cta = isAppUpdate
    ? { kind: "reload" as const, label: "Update now" }
    : featured
      ? featuredNotificationCta(featured)
      : { kind: "open" as const, label: "Open" };
  const moreCount = Math.max(
    0,
    (isAppUpdate ? picked.count - 1 : needsAction.count) - (isAppUpdate ? 0 : 1),
  );
  const actorName = featured?.actorName?.trim() || "Team";
  const actorAvatar = featured?.actorAvatar ?? null;
  const relativeTime = featured ? formatRelativeTime(featured.createdAt) : "";
  const overflowCount = isAppUpdate
    ? Math.max(0, needsAction.count)
    : Math.max(0, needsAction.count - 1);
  const moreLabel =
    overflowCount === 1 ? "1 more" : overflowCount > 1 ? `${overflowCount} more` : null;

  async function markRead(notification: NotificationRecord) {
    await markReadMutation.mutateAsync(notification.id);
  }

  async function openNotification(notification: NotificationRecord) {
    await markRead(notification);
    navigate(notificationHref(notification));
  }

  async function handlePrimaryCta() {
    if (isAppUpdate) {
      if (actionPending || isRefreshing) return;
      setActionPending(true);
      await beginRefresh();
      return;
    }
    if (!featured || !teamId || actionPending) return;
    if (cta.kind === "reload") return;
    setActionPending(true);
    try {
      if (cta.kind === "start-timer") {
        const payload = featured.payload;
        if (!payload.projectId || !payload.taskId || !payload.taskTitle || !payload.projectName) {
          await openNotification(featured);
          return;
        }
        await startTimer({
          teamId,
          project: { id: payload.projectId, name: payload.projectName },
          task: { id: payload.taskId, title: payload.taskTitle },
          description: payload.taskTitle,
          successDescription: "Timer started from notification.",
        });
        await markRead(featured);
        navigate("/agency");
        return;
      }
      if (cta.kind === "ask-orch") {
        const payload = featured.payload;
        const prompt = buildMemberAlertOrchPrompt({
          title: payload.alertTitle ?? featuredNotificationTitle(featured),
          body: featuredNotificationBody(featured),
          dateKey: payload.dateKey,
        });
        useWorkspaceAgentStore.getState().seedComposer({ text: prompt, toolPreset: "plan" });
        await markRead(featured);
        return;
      }
      await openNotification(featured);
    } finally {
      setActionPending(false);
    }
  }

  return {
    teamId,
    isAppUpdate,
    featured,
    count,
    moreCount,
    moreLabel,
    title,
    body,
    ctaLabel: cta.label,
    actorName,
    actorAvatar,
    relativeTime,
    listPending: !isAppUpdate && listQuery.isPending && !listQuery.data,
    actionPending: actionPending || isRefreshing,
    onDismiss: () => {
      if (isAppUpdate || !featured || actionPending) return;
      void markRead(featured);
    },
    onPrimaryCta: () => void handlePrimaryCta(),
    onAdvanceFeatured: () => setFeaturedSkip((current) => current + 1),
  };
}

export type FeaturedRailNotificationViewModel = ReturnType<typeof useFeaturedRailNotification>;
