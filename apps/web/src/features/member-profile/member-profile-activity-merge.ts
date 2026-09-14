import type { AgencyReportEntry } from "@/features/reports/agency-report-grouping";
import { formatDuration } from "@/lib/utils/format-duration";

export type MemberProfileTimelineActivity = {
  kind: "activity";
  id: string;
  eventType: "time_logged" | "waste_marked" | "leave";
  kindLabel: string;
  title: string;
  body: string | null;
  meta: string | null;
  timeLabel: string;
  durationLabel: string | null;
  durationSeconds: number | null;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  clientId: string | null;
  clientName: string | null;
  description: string | null;
  isWaste: boolean;
  taskIsWaste: boolean | null;
  startedAt: string | null;
  endedAt: string | null;
  teamId: string | null;
  userId: string | null;
  userName: string | null;
  source: "timer" | "manual" | null;
  isBillable: boolean | null;
};

type MemberProfileTimelineReview = {
  kind: "review";
  id: string;
  body: string;
  authorName: string;
  authorAvatarUrl: string | null;
  timeLabel: string;
};

export type MemberProfileTimelineItem = MemberProfileTimelineActivity | MemberProfileTimelineReview;

export type MergedTimelineActivity = {
  kind: "activity";
  mergeKey: string;
  entryCount: number;
  title: string;
  body: string | null;
  meta: string | null;
  description: string | null;
  timeLabel: string;
  durationLabel: string | null;
  durationSeconds: number;
  eventType: "time_logged" | "waste_marked" | "leave";
  kindLabel: string;
  projectId: string | null;
  projectName: string | null;
  taskTitle: string | null;
  clientName: string | null;
  isWaste: boolean;
  entries: AgencyReportEntry[];
};

export type MergedTimelineItem = MergedTimelineActivity | MemberProfileTimelineReview;

/** Tracker-style collapse: task (or project-only) + description within a day. */
export function memberProfileActivityMergeKey(item: MemberProfileTimelineActivity): string {
  if (item.eventType === "leave") return `leave:${item.id}`;
  const taskKey = item.taskId ?? (item.projectId ? `project-only:${item.projectId}` : item.id);
  return `${item.eventType}||${taskKey}||${item.description ?? ""}`;
}

function activityToReportEntry(item: MemberProfileTimelineActivity): AgencyReportEntry | null {
  if (
    item.eventType === "leave" ||
    !item.projectId ||
    !item.projectName ||
    !item.clientId ||
    !item.clientName ||
    !item.startedAt ||
    !item.endedAt ||
    !item.teamId ||
    !item.userId ||
    !item.userName ||
    !item.source ||
    item.isBillable == null ||
    item.durationSeconds == null
  ) {
    return null;
  }

  return {
    id: item.id,
    teamId: item.teamId,
    userId: item.userId,
    userName: item.userName,
    projectId: item.projectId,
    taskId: item.taskId,
    taskTitle: item.taskTitle,
    taskIsWaste: item.taskIsWaste,
    projectName: item.projectName,
    clientId: item.clientId,
    clientName: item.clientName,
    tags: [],
    links: [],
    source: item.source,
    description: item.description ?? "",
    isBillable: item.isBillable,
    isWaste: item.isWaste,
    startedAt: item.startedAt,
    endedAt: item.endedAt,
    durationSeconds: item.durationSeconds,
    createdAt: item.startedAt,
    updatedAt: item.endedAt,
  };
}

export function mergeTimelineItems(items: MemberProfileTimelineItem[]): MergedTimelineItem[] {
  const merged: MergedTimelineItem[] = [];
  const activityIndex = new Map<string, number>();

  for (const item of items) {
    if (item.kind === "review") {
      merged.push(item);
      continue;
    }

    if (item.eventType === "leave") {
      const entry = activityToReportEntry(item);
      merged.push({
        kind: "activity",
        mergeKey: memberProfileActivityMergeKey(item),
        entryCount: 1,
        title: item.title,
        body: item.body,
        meta: item.meta,
        description: item.description,
        timeLabel: item.timeLabel,
        durationLabel: item.durationLabel,
        durationSeconds: item.durationSeconds ?? 0,
        eventType: item.eventType,
        kindLabel: item.kindLabel,
        projectId: item.projectId,
        projectName: item.projectName,
        taskTitle: item.taskTitle,
        clientName: item.clientName,
        isWaste: item.isWaste,
        entries: entry ? [entry] : [],
      });
      continue;
    }

    const key = memberProfileActivityMergeKey(item);
    const existingAt = activityIndex.get(key);
    const entry = activityToReportEntry(item);

    if (existingAt != null) {
      const existing = merged[existingAt];
      if (existing?.kind !== "activity") continue;
      existing.entryCount += 1;
      existing.durationSeconds += item.durationSeconds ?? 0;
      existing.durationLabel = formatDuration(existing.durationSeconds, "clock");
      existing.isWaste = existing.isWaste || item.isWaste;
      if (existing.isWaste) existing.eventType = "waste_marked";
      if (entry) existing.entries.push(entry);
      continue;
    }

    activityIndex.set(key, merged.length);
    merged.push({
      kind: "activity",
      mergeKey: key,
      entryCount: 1,
      title: item.title,
      body: item.body,
      meta: item.meta,
      description: item.description,
      timeLabel: item.timeLabel,
      durationLabel:
        item.durationSeconds != null
          ? formatDuration(item.durationSeconds, "clock")
          : item.durationLabel,
      durationSeconds: item.durationSeconds ?? 0,
      eventType: item.eventType,
      kindLabel: item.kindLabel,
      projectId: item.projectId,
      projectName: item.projectName,
      taskTitle: item.taskTitle,
      clientName: item.clientName,
      isWaste: item.isWaste,
      entries: entry ? [entry] : [],
    });
  }

  return merged;
}
