import type { NotificationRecord } from "@orch/api/schemas/notifications";

import { buildMemberProfileAlertHref } from "@/features/member-profile/member-profile-alert-href";
import { agencyManagementHref } from "@/features/shared/agency-management-sections";
import {
  agencyProjectHref,
  agencySegmentHref,
  agencyTaskHref,
} from "@/features/shared/agency-segments";

export type NotificationSection = {
  label: "Needs action" | "Updates";
  items: NotificationRecord[];
};

export function formatRelativeTime(iso: string) {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function formatDigestHours(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function isNeedsActionNotification(notification: NotificationRecord) {
  if (notification.readAt) return false;
  if (notification.deliveryClass === "interrupt" || notification.deliveryClass === "breakpoint") {
    return true;
  }
  return (
    notification.type === "task.assigned" ||
    notification.type === "task.message" ||
    notification.type === "member.alert"
  );
}

export function groupNotificationSections(items: NotificationRecord[]): NotificationSection[] {
  const needsAction: NotificationRecord[] = [];
  const updates: NotificationRecord[] = [];

  for (const item of items) {
    if (isNeedsActionNotification(item)) {
      needsAction.push(item);
    } else {
      updates.push(item);
    }
  }

  const sections: NotificationSection[] = [];
  if (needsAction.length > 0) sections.push({ label: "Needs action", items: needsAction });
  if (updates.length > 0) sections.push({ label: "Updates", items: updates });
  return sections;
}

export function notificationHref(notification: NotificationRecord): string {
  const payload = notification.payload;

  switch (notification.type) {
    case "task.assigned":
    case "task.message":
      return payload.taskId ? agencyTaskHref(payload.taskId) : agencySegmentHref("work");
    case "journey.milestone":
      return payload.projectId
        ? agencyProjectHref(payload.projectId)
        : agencySegmentHref("projects");
    case "timer.activity":
      return agencySegmentHref("dashboard");
    case "team.digest":
      return agencySegmentHref("reports");
    case "member.alert":
      if (payload.subjectUserId) {
        return buildMemberProfileAlertHref({
          subjectUserId: payload.subjectUserId,
          alertId: payload.alertId,
          dateKey: payload.dateKey,
          periodKey: payload.periodKey,
        });
      }
      return agencyManagementHref("tenure");
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }
}

export function notificationPreferenceLabel(type: NotificationRecord["type"]) {
  switch (type) {
    case "task.assigned":
      return "Task assignments";
    case "task.message":
      return "Task messages";
    case "journey.milestone":
      return "Milestones";
    case "timer.activity":
      return "Timer activity";
    case "team.digest":
      return "Daily digest";
    case "member.alert":
      return "Profile alerts";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export type FeaturedNotificationCta = {
  kind: "start-timer" | "open" | "ask-orch";
  label: string;
};

/** Newest unread Needs-action item first; count is the full Needs-action queue size. */
export function pickFeaturedNeedsAction(items: NotificationRecord[]): {
  featured: NotificationRecord | null;
  count: number;
} {
  const needsAction = items
    .filter(isNeedsActionNotification)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return {
    featured: needsAction[0] ?? null,
    count: needsAction.length,
  };
}

export type FeaturedRailItem =
  | { kind: "app-update"; featured: null; count: number }
  | { kind: "notification"; featured: NotificationRecord; count: number }
  | { kind: "empty"; featured: null; count: 0 };

/** App update always wins the rail card; Needs-action still counts toward overflow. */
export function pickFeaturedRailItem(
  items: NotificationRecord[],
  updateAvailable: boolean,
): FeaturedRailItem {
  const needsAction = pickFeaturedNeedsAction(items);
  if (updateAvailable) {
    return { kind: "app-update", featured: null, count: needsAction.count + 1 };
  }
  if (needsAction.featured) {
    return { kind: "notification", featured: needsAction.featured, count: needsAction.count };
  }
  return { kind: "empty", featured: null, count: 0 };
}

export function featuredNotificationTitle(notification: NotificationRecord) {
  switch (notification.type) {
    case "task.assigned":
      return "Assigned task";
    case "task.message":
      return "New reply";
    case "member.alert":
      return "Profile alert";
    case "journey.milestone":
      return "Milestone";
    case "timer.activity":
      return "Timer activity";
    case "team.digest":
      return "Daily digest";
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }
}

export function featuredNotificationCta(notification: NotificationRecord): FeaturedNotificationCta {
  const payload = notification.payload;
  if (
    notification.type === "task.assigned" &&
    payload.taskId &&
    payload.projectId &&
    payload.taskTitle &&
    payload.projectName
  ) {
    return { kind: "start-timer", label: "Start timer" };
  }
  if (notification.type === "task.message" && payload.taskId) {
    return { kind: "open", label: "Open task" };
  }
  if (notification.type === "member.alert") {
    return { kind: "ask-orch", label: "Ask Orch" };
  }
  return { kind: "open", label: "Open" };
}

/** Plain one-line body for the featured rail card. */
export function featuredNotificationBody(notification: NotificationRecord) {
  const actor = notification.actorName ?? "Someone";
  const payload = notification.payload;

  switch (notification.type) {
    case "task.assigned":
      return `${actor} assigned you ${payload.taskTitle ?? "a task"}`;
    case "task.message": {
      const count = payload.messageCount ?? 1;
      if (count > 1) {
        return `${actor} sent ${count} messages in ${payload.taskTitle ?? "a task"}`;
      }
      return `${actor} replied in ${payload.taskTitle ?? "a task"}`;
    }
    case "member.alert": {
      const title = payload.alertTitle ?? "a profile alert";
      const note = payload.notePreview?.trim();
      return note ? `${actor} sent ${title}: ${note}` : `${actor} sent ${title}`;
    }
    case "journey.milestone":
      return `${payload.journeyStepLabel ?? "Milestone"} completed on ${payload.projectName ?? "a project"}`;
    case "timer.activity":
      return payload.timerAction === "stopped"
        ? `${actor} stopped tracking on ${payload.projectName ?? "a project"}`
        : `${actor} started tracking on ${payload.taskTitle ?? payload.projectName ?? "a project"}`;
    case "team.digest":
      return `Your team logged ${formatDigestHours(payload.digestHoursSeconds ?? 0)} yesterday`;
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }
}

export function buildMemberAlertOrchPrompt(input: {
  title: string;
  body: string;
  dateKey?: string;
}) {
  const dateLine = input.dateKey ? ` Period: ${input.dateKey}.` : "";
  return `Plan a confirmable response to this profile alert: ${input.title}. ${input.body}.${dateLine} Use Agency tools. Suggest only targeted time_entry updates (never a whole day or group). I will Confirm, then Approve.`;
}
