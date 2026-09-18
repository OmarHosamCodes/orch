import type { AgencyEntityIconKey } from "../shared/entity-icon-catalog";
import { resolveEntryWaste } from "../shared/waste-helpers";

export type MemberProfileActivityEventType = "time_logged" | "waste_marked" | "leave";

export type MemberProfileLeaveType = "pto" | "sick" | "team_holiday" | "other";

export type MemberProfileTimeEntryActivity = {
  kind: "activity";
  id: string;
  date: string;
  createdAt: string;
  eventType: "time_logged" | "waste_marked";
  title: string;
  body: string | null;
  meta: string | null;
  durationSeconds: number;
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  taskIconKey: AgencyEntityIconKey | null;
  colorHueId: number | null;
  projectIconKey: AgencyEntityIconKey | null;
  clientId: string;
  clientName: string;
  description: string;
  isWaste: boolean;
  taskIsWaste: boolean | null;
  startedAt: string;
  endedAt: string;
  teamId: string;
  userId: string;
  userName: string;
  source: "timer" | "manual";
  isBillable: boolean;
};

export type MemberProfileLeaveActivity = {
  kind: "activity";
  id: string;
  date: string;
  createdAt: string;
  eventType: "leave";
  title: string;
  body: string | null;
  meta: string;
  durationSeconds: null;
  projectId: null;
  projectName: null;
  taskId: null;
  taskTitle: null;
  taskIconKey: null;
  colorHueId: null;
  projectIconKey: null;
  clientId: null;
  clientName: null;
  description: null;
  isWaste: false;
  taskIsWaste: null;
  startedAt: null;
  endedAt: null;
  teamId: null;
  userId: null;
  userName: null;
  source: null;
  isBillable: null;
};

export function leaveTypeTitle(type: MemberProfileLeaveType): string {
  switch (type) {
    case "pto":
      return "PTO";
    case "sick":
      return "Sick leave";
    case "team_holiday":
      return "Team holiday";
    case "other":
      return "Leave";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function buildTimeEntryActivity(input: {
  id: string;
  date: string;
  createdAt: string;
  description: string;
  projectId: string;
  projectName: string;
  taskId: string | null;
  taskTitle: string | null;
  taskIconKey: AgencyEntityIconKey | null;
  colorHueId: number | null;
  projectIconKey: AgencyEntityIconKey | null;
  clientId: string;
  clientName: string;
  durationSeconds: number;
  isWaste: boolean;
  taskIsWaste: boolean | null;
  startedAt: string;
  endedAt: string;
  teamId: string;
  userId: string;
  userName: string;
  source: "timer" | "manual";
  isBillable: boolean;
}): MemberProfileTimeEntryActivity {
  const hours = Math.floor(input.durationSeconds / 3600);
  const minutes = Math.floor((input.durationSeconds % 3600) / 60);
  const durationLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const description = input.description.trim();
  const taskLabel = input.taskTitle?.trim() || null;
  const projectMeta = `Project · ${input.projectName}`;
  const isWaste = resolveEntryWaste(input);

  const shared = {
    kind: "activity" as const,
    id: input.id,
    date: input.date,
    createdAt: input.createdAt,
    durationSeconds: input.durationSeconds,
    projectId: input.projectId,
    projectName: input.projectName,
    taskId: input.taskId,
    taskTitle: input.taskTitle,
    taskIconKey: input.taskIconKey,
    colorHueId: input.colorHueId,
    projectIconKey: input.projectIconKey,
    clientId: input.clientId,
    clientName: input.clientName,
    description: input.description,
    isWaste,
    taskIsWaste: input.taskIsWaste,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    teamId: input.teamId,
    userId: input.userId,
    userName: input.userName,
    source: input.source,
    isBillable: input.isBillable,
  };

  if (isWaste) {
    return {
      ...shared,
      eventType: "waste_marked",
      title: taskLabel || description || "Waste marked",
      body: description ? `${durationLabel} · ${description}` : `${durationLabel} marked as waste`,
      meta: projectMeta,
    };
  }

  return {
    ...shared,
    eventType: "time_logged",
    title: taskLabel || description || "Time logged",
    body: description && taskLabel ? description : description ? `Logged ${durationLabel}` : null,
    meta: projectMeta,
  };
}

/** One leave event on the first overlapping day inside the window. */
export function buildLeaveActivity(input: {
  id: string;
  type: MemberProfileLeaveType;
  reason: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  windowStart: string;
  windowEnd: string;
}): MemberProfileLeaveActivity | null {
  if (input.endDate < input.windowStart || input.startDate > input.windowEnd) return null;
  const date = input.startDate < input.windowStart ? input.windowStart : input.startDate;
  const rangeLabel =
    input.startDate === input.endDate ? input.startDate : `${input.startDate} → ${input.endDate}`;
  return {
    kind: "activity",
    id: `leave-${input.id}`,
    date,
    createdAt: input.createdAt,
    eventType: "leave",
    title: leaveTypeTitle(input.type),
    body: input.reason?.trim() || null,
    meta: rangeLabel,
    durationSeconds: null,
    projectId: null,
    projectName: null,
    taskId: null,
    taskTitle: null,
    taskIconKey: null,
    colorHueId: null,
    projectIconKey: null,
    clientId: null,
    clientName: null,
    description: null,
    isWaste: false,
    taskIsWaste: null,
    startedAt: null,
    endedAt: null,
    teamId: null,
    userId: null,
    userName: null,
    source: null,
    isBillable: null,
  };
}
