import { ORPCError } from "@orpc/server";
import { db } from "@orch/db";
import {
  agencyOpsActiveTimer,
  agencyOpsActiveTimerTag,
  agencyOpsActiveTimerLink,
  agencyOpsProjectTask,
  agencyOpsProject,
  agencyOpsProjectJourneyStep,
  agencyOpsProjectJourney,
  user,
  agencyOpsClient,
  agencyOpsTimeEntry,
  agencyOpsTimeEntryTag,
  agencyOpsTimeEntryLink,
  agencyOpsTag,
  workspaceTeamMember,
} from "@orch/db/schema";
import { eq, and, asc, isNull, desc, sql, gte, lte, inArray } from "drizzle-orm";
import { createWorkspaceId } from "@orch/workspace";
import { notifyTimerActivity } from "../../notifications/fanout";
import { flushDeferredNotificationPushes } from "../../notifications/service";
import { formatAvatarUrl } from "../shared/avatar-helpers";
import { getProjectByIdForTeam } from "../shared/lookup-helpers";
import { parseIsoDateTime } from "../shared/date-helpers";
import { type ReportEntityFilterInput, applyReportEntityFilters } from "../shared/report-helpers";
import { requireAgencyRole } from "../shared/membership";
import { groupTimeEntryTagRows } from "./group-time-entry-tag-rows";
import { normalizeTimeEntryLinkUrls } from "./normalize-time-entry-links";
import { loadTeamWorkSchedule } from "../resourcing/load-team-work-schedule";
import {
  addDaysToDateKey,
  applyDailyDurationTotals,
  getLocalWeekBounds,
  getLocalWeekStartKeyFromDateKey,
  localDateKeyFromInstant,
  localInstantFromDateKey,
} from "./local-week-bounds";
import { resolveAgencyTimerStopBinding } from "./resolve-agency-timer-stop-binding";
import { resolveAgencyActiveTimerTaskBinding } from "./resolve-agency-active-timer-task-binding";
import { isAgencyEntityIconKey, type AgencyEntityIconKey } from "../shared/entity-icon-catalog";
import { publishAgencyTimerUpdated } from "../live/live";

function asEntityIconKey(value: string | null | undefined): AgencyEntityIconKey | null {
  return isAgencyEntityIconKey(value) ? value : null;
}

type AgencyTimeEntrySource = "timer" | "manual";

type AgencyTagRecord = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyTimeEntryLinkRecord = {
  id: string;
  url: string;
};

type AgencyTimeEntryRecord = {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  taskIconKey: AgencyEntityIconKey | null;
  taskIsWaste: boolean | null;
  projectName: string;
  colorHueId: number | null;
  projectIconKey: AgencyEntityIconKey | null;
  clientId: string;
  clientName: string;
  source: AgencyTimeEntrySource;
  description: string;
  isBillable: boolean;
  isWaste: boolean;
  tags: AgencyTagRecord[];
  links: AgencyTimeEntryLinkRecord[];
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
};

function mapAgencyTimeEntryRow(
  row: {
    id: string;
    teamId: string;
    userId: string;
    userName: string | null;
    projectId: string;
    taskId: string | null;
    taskTitle: string | null;
    taskIconKey: string | null;
    taskIsWaste: boolean | null;
    projectName: string;
    colorHueId: number | null;
    projectIconKey: string | null;
    clientId: string;
    clientName: string;
    source: AgencyTimeEntrySource;
    description: string;
    isBillable: boolean;
    isWaste: boolean;
    startedAt: Date;
    endedAt: Date;
    durationSeconds: number;
    createdAt: Date;
    updatedAt: Date;
  },
  tags: AgencyTagRecord[],
  links: AgencyTimeEntryLinkRecord[],
): AgencyTimeEntryRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    userName: row.userName ?? "Unknown",
    projectId: row.projectId,
    taskId: row.taskId ?? null,
    taskTitle: row.taskTitle ?? null,
    taskIconKey: row.taskId ? asEntityIconKey(row.taskIconKey) : null,
    taskIsWaste: row.taskId ? (row.taskIsWaste ?? false) : null,
    projectName: row.projectName,
    colorHueId: row.colorHueId,
    projectIconKey: asEntityIconKey(row.projectIconKey),
    clientId: row.clientId,
    clientName: row.clientName,
    source: row.source,
    description: row.description,
    isBillable: row.isBillable,
    isWaste: row.isWaste,
    tags,
    links,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    durationSeconds: row.durationSeconds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type AgencyActiveTimerRecord = {
  id: string;
  teamId: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  taskIconKey: AgencyEntityIconKey | null;
  projectName: string;
  colorHueId: number | null;
  projectIconKey: AgencyEntityIconKey | null;
  description: string;
  isBillable: boolean;
  tags: AgencyTagRecord[];
  links: AgencyTimeEntryLinkRecord[];
  startedAt: string;
  createdAt: string;
  updatedAt: string;
};

function validateDateRange(startedAt: Date, endedAt: Date) {
  if (startedAt >= endedAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "startAt must be before endAt.",
    });
  }
}

function getDurationSeconds(startedAt: Date, endedAt: Date) {
  return Math.max(1, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1_000));
}

function mapAgencyTagRow(row: {
  id: string;
  teamId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): AgencyTagRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function listTagsByTimeEntryIds(timeEntryIds: string[]) {
  if (timeEntryIds.length === 0) {
    return new Map<string, AgencyTagRecord[]>();
  }

  const rows = await db
    .select({
      timeEntryId: agencyOpsTimeEntryTag.timeEntryId,
      id: agencyOpsTag.id,
      teamId: agencyOpsTag.teamId,
      name: agencyOpsTag.name,
      createdAt: agencyOpsTag.createdAt,
      updatedAt: agencyOpsTag.updatedAt,
    })
    .from(agencyOpsTimeEntryTag)
    .innerJoin(agencyOpsTag, eq(agencyOpsTag.id, agencyOpsTimeEntryTag.tagId))
    .where(inArray(agencyOpsTimeEntryTag.timeEntryId, timeEntryIds))
    .orderBy(asc(agencyOpsTag.name));

  return groupTimeEntryTagRows(
    rows.map(({ timeEntryId, ...tag }) => ({ timeEntryId, tag: mapAgencyTagRow(tag) })),
  );
}

async function listTagsForTimeEntry(timeEntryId: string) {
  const grouped = await listTagsByTimeEntryIds([timeEntryId]);
  return grouped.get(timeEntryId) ?? [];
}

async function listTagsForActiveTimer(activeTimerId: string) {
  const rows = await db
    .select({
      id: agencyOpsTag.id,
      teamId: agencyOpsTag.teamId,
      name: agencyOpsTag.name,
      createdAt: agencyOpsTag.createdAt,
      updatedAt: agencyOpsTag.updatedAt,
    })
    .from(agencyOpsActiveTimerTag)
    .innerJoin(agencyOpsTag, eq(agencyOpsTag.id, agencyOpsActiveTimerTag.tagId))
    .where(eq(agencyOpsActiveTimerTag.activeTimerId, activeTimerId))
    .orderBy(asc(agencyOpsTag.name));

  return rows.map(mapAgencyTagRow);
}

async function listLinksByTimeEntryIds(timeEntryIds: string[]) {
  if (timeEntryIds.length === 0) {
    return new Map<string, AgencyTimeEntryLinkRecord[]>();
  }

  const rows = await db
    .select({
      timeEntryId: agencyOpsTimeEntryLink.timeEntryId,
      id: agencyOpsTimeEntryLink.id,
      url: agencyOpsTimeEntryLink.url,
      sortOrder: agencyOpsTimeEntryLink.sortOrder,
    })
    .from(agencyOpsTimeEntryLink)
    .where(inArray(agencyOpsTimeEntryLink.timeEntryId, timeEntryIds))
    .orderBy(asc(agencyOpsTimeEntryLink.sortOrder), asc(agencyOpsTimeEntryLink.createdAt));

  return groupTimeEntryTagRows(
    rows.map(({ timeEntryId, id, url }) => ({
      timeEntryId,
      tag: { id, url } satisfies AgencyTimeEntryLinkRecord,
    })),
  );
}

async function listLinksForTimeEntry(timeEntryId: string) {
  const grouped = await listLinksByTimeEntryIds([timeEntryId]);
  return grouped.get(timeEntryId) ?? [];
}

async function listLinksForActiveTimer(activeTimerId: string) {
  const rows = await db
    .select({
      id: agencyOpsActiveTimerLink.id,
      url: agencyOpsActiveTimerLink.url,
    })
    .from(agencyOpsActiveTimerLink)
    .where(eq(agencyOpsActiveTimerLink.activeTimerId, activeTimerId))
    .orderBy(asc(agencyOpsActiveTimerLink.sortOrder), asc(agencyOpsActiveTimerLink.createdAt));

  return rows.map(({ id, url }) => ({ id, url }) satisfies AgencyTimeEntryLinkRecord);
}

async function insertTimeEntryLinks(
  // ponytail: drizzle tx typing is verbose; upgrade with ExtractTablesWithRelations if needed
  tx: { insert: typeof db.insert },
  timeEntryId: string,
  urls: string[],
) {
  if (urls.length === 0) return;
  await tx.insert(agencyOpsTimeEntryLink).values(
    urls.map((url, sortOrder) => ({
      id: createWorkspaceId("agency-time-link"),
      timeEntryId,
      url,
      sortOrder,
    })),
  );
}

async function replaceTimeEntryLinks(
  tx: { insert: typeof db.insert; delete: typeof db.delete },
  timeEntryId: string,
  urls: string[],
) {
  await tx
    .delete(agencyOpsTimeEntryLink)
    .where(eq(agencyOpsTimeEntryLink.timeEntryId, timeEntryId));
  await insertTimeEntryLinks(tx, timeEntryId, urls);
}

async function insertActiveTimerLinks(
  tx: { insert: typeof db.insert },
  activeTimerId: string,
  urls: string[],
) {
  if (urls.length === 0) return;
  await tx.insert(agencyOpsActiveTimerLink).values(
    urls.map((url, sortOrder) => ({
      id: createWorkspaceId("agency-timer-link"),
      activeTimerId,
      url,
      sortOrder,
    })),
  );
}

async function replaceActiveTimerLinks(
  tx: { insert: typeof db.insert; delete: typeof db.delete },
  activeTimerId: string,
  urls: string[],
) {
  await tx
    .delete(agencyOpsActiveTimerLink)
    .where(eq(agencyOpsActiveTimerLink.activeTimerId, activeTimerId));
  await insertActiveTimerLinks(tx, activeTimerId, urls);
}

async function validateAgencyTagIds(teamId: string, tagIds: string[] | undefined) {
  if (tagIds === undefined) return [];

  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length === 0) return uniqueTagIds;

  const rows = await db
    .select({ id: agencyOpsTag.id })
    .from(agencyOpsTag)
    .where(and(eq(agencyOpsTag.teamId, teamId), inArray(agencyOpsTag.id, uniqueTagIds)));

  if (rows.length !== uniqueTagIds.length) {
    throw new ORPCError("BAD_REQUEST", { message: "One or more tags do not belong to this team." });
  }

  return uniqueTagIds;
}

async function getActiveTimerByUser(userId: string) {
  const [timer] = await db
    .select({
      id: agencyOpsActiveTimer.id,
      teamId: agencyOpsActiveTimer.teamId,
      userId: agencyOpsActiveTimer.userId,
      projectId: agencyOpsActiveTimer.projectId,
      taskId: agencyOpsActiveTimer.taskId,
      taskTitle: agencyOpsProjectTask.title,
      taskIconKey: agencyOpsProjectTask.iconKey,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      projectName: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      projectIconKey: agencyOpsProject.iconKey,
      description: agencyOpsActiveTimer.description,
      isBillable: agencyOpsActiveTimer.isBillable,
      startedAt: agencyOpsActiveTimer.startedAt,
      createdAt: agencyOpsActiveTimer.createdAt,
      updatedAt: agencyOpsActiveTimer.updatedAt,
    })
    .from(agencyOpsActiveTimer)
    .leftJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsActiveTimer.projectId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsActiveTimer.taskId))
    .where(eq(agencyOpsActiveTimer.userId, userId))
    .limit(1);

  if (!timer) {
    return null;
  }

  const tags = await listTagsForActiveTimer(timer.id);
  const links = await listLinksForActiveTimer(timer.id);

  return {
    id: timer.id,
    teamId: timer.teamId,
    userId: timer.userId,
    projectId: timer.projectId ?? "",
    taskId: timer.taskId,
    taskTitle: timer.taskTitle ?? null,
    taskIconKey: timer.taskId ? asEntityIconKey(timer.taskIconKey) : null,
    projectName: timer.projectName ?? "",
    colorHueId: timer.colorHueId,
    projectIconKey: asEntityIconKey(timer.projectIconKey),
    description: timer.description,
    isBillable: timer.isBillable,
    tags,
    links,
    startedAt: timer.startedAt.toISOString(),
    createdAt: timer.createdAt.toISOString(),
    updatedAt: timer.updatedAt.toISOString(),
  } satisfies AgencyActiveTimerRecord;
}

async function resolveTaskProjectId(teamId: string, taskId: string) {
  const [task] = await db
    .select({ projectId: agencyOpsProjectTask.projectId })
    .from(agencyOpsProjectTask)
    .where(and(eq(agencyOpsProjectTask.id, taskId), eq(agencyOpsProjectTask.teamId, teamId)))
    .limit(1);
  if (!task) {
    throw new ORPCError("NOT_FOUND", { message: "Task was not found." });
  }
  return task.projectId;
}

async function resolveJourneyStepIdForTask(teamId: string, taskId: string | null | undefined) {
  if (!taskId) return null;

  const [step] = await db
    .select({ id: agencyOpsProjectJourneyStep.id })
    .from(agencyOpsProjectJourneyStep)
    .innerJoin(
      agencyOpsProjectJourney,
      eq(agencyOpsProjectJourney.id, agencyOpsProjectJourneyStep.journeyId),
    )
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectJourney.projectId))
    .where(and(eq(agencyOpsProjectJourneyStep.taskId, taskId), eq(agencyOpsProject.teamId, teamId)))
    .limit(1);

  return step?.id ?? null;
}

export async function getAgencyActiveTimer(actorUserId: string, input: { teamId?: string }) {
  const timer = await getActiveTimerByUser(actorUserId);

  if (!timer) {
    return {
      timer: null,
    };
  }

  await requireAgencyRole(actorUserId, timer.teamId, "viewer");

  if (input.teamId && timer.teamId !== input.teamId) {
    return {
      timer: null,
    };
  }

  return {
    timer,
  };
}

export async function listAgencyActiveMembers(
  actorUserId: string,
  input: {
    teamId: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const rows = await db
    .select({
      userId: agencyOpsActiveTimer.userId,
      userName: user.name,
      userAvatar: user.image,
      projectName: agencyOpsProject.name,
      clientName: agencyOpsClient.name,
      description: agencyOpsActiveTimer.description,
      startedAt: agencyOpsActiveTimer.startedAt,
    })
    .from(agencyOpsActiveTimer)
    .innerJoin(user, eq(user.id, agencyOpsActiveTimer.userId))
    .leftJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsActiveTimer.projectId))
    .leftJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(eq(agencyOpsActiveTimer.teamId, input.teamId))
    .orderBy(asc(user.name));

  return {
    items: rows.map((row) => ({
      userId: row.userId,
      userName: row.userName ?? "Unknown",
      userAvatar: formatAvatarUrl(row.userAvatar),
      projectName: row.projectName ?? "No project",
      clientName: row.clientName ?? "No client",
      description: row.description,
      startedAt: row.startedAt.toISOString(),
    })),
  };
}

export async function startAgencyTimer(
  actorUserId: string,
  input: {
    teamId: string;
    projectId?: string;
    taskId?: string;
    description?: string;
    tagIds?: string[];
    links?: string[];
    isBillable?: boolean;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");
  const tagIds = await validateAgencyTagIds(input.teamId, input.tagIds);
  const links = normalizeTimeEntryLinkUrls(input.links);

  let projectId: string | null = input.projectId ?? null;
  if (input.taskId) {
    projectId = await resolveTaskProjectId(input.teamId, input.taskId);
  }

  if (projectId) {
    await getProjectByIdForTeam(input.teamId, projectId);
  }

  const now = new Date();

  const [existing] = await db
    .select({
      id: agencyOpsActiveTimer.id,
      teamId: agencyOpsActiveTimer.teamId,
      projectId: agencyOpsActiveTimer.projectId,
      taskId: agencyOpsActiveTimer.taskId,
      description: agencyOpsActiveTimer.description,
      isBillable: agencyOpsActiveTimer.isBillable,
      startedAt: agencyOpsActiveTimer.startedAt,
    })
    .from(agencyOpsActiveTimer)
    .where(eq(agencyOpsActiveTimer.userId, actorUserId))
    .limit(1);

  let rolledOverEntryId: string | null = null;

  await db.transaction(async (tx) => {
    if (existing) {
      if (existing.projectId) {
        // Save the previous timer — including project-only (no task) — so start
        // never silently discards bound time when replacing an active run.
        const durationSeconds = getDurationSeconds(existing.startedAt, now);
        rolledOverEntryId = createWorkspaceId("agency-time");
        const journeyStepId = await resolveJourneyStepIdForTask(existing.teamId, existing.taskId);

        await tx.insert(agencyOpsTimeEntry).values({
          id: rolledOverEntryId,
          teamId: existing.teamId,
          projectId: existing.projectId,
          taskId: existing.taskId,
          journeyStepId,
          userId: actorUserId,
          source: "timer",
          description: existing.description,
          isBillable: existing.isBillable,
          startedAt: existing.startedAt,
          endedAt: now,
          durationSeconds,
          createdAt: now,
          updatedAt: now,
        });

        const previousTagIds = await tx
          .select({ tagId: agencyOpsActiveTimerTag.tagId })
          .from(agencyOpsActiveTimerTag)
          .where(eq(agencyOpsActiveTimerTag.activeTimerId, existing.id));
        if (previousTagIds.length > 0) {
          await tx
            .insert(agencyOpsTimeEntryTag)
            .values(
              previousTagIds.map(({ tagId }) => ({ timeEntryId: rolledOverEntryId!, tagId })),
            );
        }

        const previousLinks = await tx
          .select({
            url: agencyOpsActiveTimerLink.url,
            sortOrder: agencyOpsActiveTimerLink.sortOrder,
          })
          .from(agencyOpsActiveTimerLink)
          .where(eq(agencyOpsActiveTimerLink.activeTimerId, existing.id))
          .orderBy(asc(agencyOpsActiveTimerLink.sortOrder));
        if (previousLinks.length > 0) {
          await insertTimeEntryLinks(
            tx,
            rolledOverEntryId!,
            previousLinks.map((row) => row.url),
          );
        }
      }
      // Unbound previous timer can't become an entry (entries require a project).

      await tx.delete(agencyOpsActiveTimer).where(eq(agencyOpsActiveTimer.id, existing.id));
    }

    const [createdTimer] = await tx
      .insert(agencyOpsActiveTimer)
      .values({
        id: createWorkspaceId("agency-active-timer"),
        teamId: input.teamId,
        projectId,
        taskId: input.taskId ?? null,
        userId: actorUserId,
        description: input.description?.trim() ?? "",
        isBillable: input.isBillable ?? true,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsActiveTimer.id });

    if (createdTimer && tagIds.length > 0) {
      await tx
        .insert(agencyOpsActiveTimerTag)
        .values(tagIds.map((tagId) => ({ activeTimerId: createdTimer.id, tagId })));
    }
    if (createdTimer && links.length > 0) {
      await insertActiveTimerLinks(tx, createdTimer.id, links);
    }

    if (input.taskId) {
      await tx
        .update(agencyOpsProjectTask)
        .set({ status: "in_progress", updatedAt: now })
        .where(
          and(
            eq(agencyOpsProjectTask.id, input.taskId),
            eq(agencyOpsProjectTask.teamId, input.teamId),
            eq(agencyOpsProjectTask.status, "open"),
          ),
        );
    }
  });

  const timer = await getActiveTimerByUser(actorUserId);
  const createdEntry = rolledOverEntryId
    ? await fetchAgencyTimeEntryRecord(rolledOverEntryId)
    : null;

  await publishAgencyTimerUpdated(input.teamId, actorUserId, timer);

  if (timer?.projectId) {
    await notifyTimerActivity({
      teamId: input.teamId,
      actorUserId,
      projectId: timer.projectId,
      projectName: timer.projectName,
      taskId: timer.taskId,
      taskTitle: timer.taskTitle,
      timerAction: "started",
    });
  }

  return {
    timer,
    createdEntry,
  };
}

async function emitTimerStoppedNotification(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
    taskId: string | null;
    taskTitle: string | null;
  },
) {
  const [project] = await db
    .select({ name: agencyOpsProject.name })
    .from(agencyOpsProject)
    .where(eq(agencyOpsProject.id, input.projectId))
    .limit(1);

  await notifyTimerActivity({
    teamId: input.teamId,
    actorUserId,
    projectId: input.projectId,
    projectName: project?.name ?? "Project",
    taskId: input.taskId,
    taskTitle: input.taskTitle,
    timerAction: "stopped",
  });
}

async function fetchAgencyTimeEntryRecords(entryIds: string[]) {
  if (entryIds.length === 0) return [];

  const rows = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      taskIconKey: agencyOpsProjectTask.iconKey,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      projectName: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      projectIconKey: agencyOpsProject.iconKey,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      isBillable: agencyOpsTimeEntry.isBillable,
      isWaste: agencyOpsTimeEntry.isWaste,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(inArray(agencyOpsTimeEntry.id, entryIds));

  const tagsByEntryId = await listTagsByTimeEntryIds(rows.map((row) => row.id));
  const linksByEntryId = await listLinksByTimeEntryIds(rows.map((row) => row.id));
  const recordsById = new Map(
    rows.map((row) => [
      row.id,
      mapAgencyTimeEntryRow(row, tagsByEntryId.get(row.id) ?? [], linksByEntryId.get(row.id) ?? []),
    ]),
  );
  const records: AgencyTimeEntryRecord[] = [];
  for (const entryId of entryIds) {
    const record = recordsById.get(entryId);
    if (record) records.push(record);
  }
  return records;
}

async function fetchAgencyTimeEntryRecord(entryId: string) {
  const [record] = await fetchAgencyTimeEntryRecords([entryId]);
  return record ?? null;
}

export async function stopAgencyTimer(
  actorUserId: string,
  input: {
    teamId?: string;
    taskId?: string;
    description?: string;
    tagIds?: string[];
    links?: string[];
    isBillable?: boolean;
    discard?: boolean;
  },
) {
  const [active] = await db
    .select({
      id: agencyOpsActiveTimer.id,
      teamId: agencyOpsActiveTimer.teamId,
      projectId: agencyOpsActiveTimer.projectId,
      taskId: agencyOpsActiveTimer.taskId,
      description: agencyOpsActiveTimer.description,
      isBillable: agencyOpsActiveTimer.isBillable,
      startedAt: agencyOpsActiveTimer.startedAt,
    })
    .from(agencyOpsActiveTimer)
    .where(eq(agencyOpsActiveTimer.userId, actorUserId))
    .limit(1);

  if (!active) {
    return {
      timer: null,
      createdEntry: null,
    };
  }

  await requireAgencyRole(actorUserId, active.teamId, "viewer");

  if (input.teamId && active.teamId !== input.teamId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Active timer belongs to a different team.",
    });
  }

  const tagIds = await validateAgencyTagIds(active.teamId, input.tagIds);
  const links = input.links === undefined ? undefined : normalizeTimeEntryLinkUrls(input.links);

  let taskId = active.taskId ?? null;
  let entryProjectId = active.projectId;
  const binding = resolveAgencyTimerStopBinding({
    activeProjectId: active.projectId,
    activeTaskId: active.taskId,
    ...(input.taskId
      ? {
          inputTaskId: input.taskId,
          inputTaskProjectId: await resolveTaskProjectId(active.teamId, input.taskId),
        }
      : {}),
  });
  taskId = binding.taskId;
  entryProjectId = binding.projectId;

  const now = new Date();
  let description = (input.description?.trim() || active.description || "").trim();

  // Project-only timers are allowed; fall back to the project name so stop/save never dead-ends.
  if (!input.discard && !description && entryProjectId) {
    const [project] = await db
      .select({ name: agencyOpsProject.name })
      .from(agencyOpsProject)
      .where(eq(agencyOpsProject.id, entryProjectId))
      .limit(1);
    description = project?.name?.trim() || "Time entry";
  }

  const durationSeconds = getDurationSeconds(active.startedAt, now);

  if (input.discard) {
    await db.delete(agencyOpsActiveTimer).where(eq(agencyOpsActiveTimer.id, active.id));

    await publishAgencyTimerUpdated(active.teamId, actorUserId, null);
    await flushDeferredNotificationPushes(actorUserId, {});

    return {
      timer: null,
      createdEntry: null,
    };
  }

  if (!entryProjectId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Choose a task before stopping the timer.",
    });
  }

  if (!description) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Add a description before stopping the timer.",
    });
  }

  const [entry] = await db.transaction(async (tx) => {
    const journeyStepId = await resolveJourneyStepIdForTask(active.teamId, taskId);
    const [created] = await tx
      .insert(agencyOpsTimeEntry)
      .values({
        id: createWorkspaceId("agency-time"),
        teamId: active.teamId,
        projectId: entryProjectId,
        taskId,
        journeyStepId,
        userId: actorUserId,
        source: "timer",
        description,
        isBillable: input.isBillable ?? active.isBillable,
        startedAt: active.startedAt,
        endedAt: now,
        durationSeconds,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsTimeEntry.id });

    const tagsToInsert =
      input.tagIds === undefined
        ? await tx
            .select({ tagId: agencyOpsActiveTimerTag.tagId })
            .from(agencyOpsActiveTimerTag)
            .where(eq(agencyOpsActiveTimerTag.activeTimerId, active.id))
        : tagIds.map((tagId) => ({ tagId }));
    if (tagsToInsert.length > 0 && created) {
      await tx
        .insert(agencyOpsTimeEntryTag)
        .values(tagsToInsert.map(({ tagId }) => ({ timeEntryId: created.id, tagId })));
    }

    if (created) {
      const linksToInsert =
        links === undefined
          ? (
              await tx
                .select({
                  url: agencyOpsActiveTimerLink.url,
                  sortOrder: agencyOpsActiveTimerLink.sortOrder,
                })
                .from(agencyOpsActiveTimerLink)
                .where(eq(agencyOpsActiveTimerLink.activeTimerId, active.id))
                .orderBy(asc(agencyOpsActiveTimerLink.sortOrder))
            ).map((row) => row.url)
          : links;
      await insertTimeEntryLinks(tx, created.id, linksToInsert);
    }

    await tx.delete(agencyOpsActiveTimer).where(eq(agencyOpsActiveTimer.id, active.id));

    if (taskId) {
      await tx
        .update(agencyOpsProjectTask)
        .set({ status: "in_progress", updatedAt: now })
        .where(
          and(
            eq(agencyOpsProjectTask.id, taskId),
            eq(agencyOpsProjectTask.teamId, active.teamId),
            eq(agencyOpsProjectTask.status, "open"),
          ),
        );
    }

    return [created];
  });

  if (!entry) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const createdEntry = await fetchAgencyTimeEntryRecord(entry.id);

  await publishAgencyTimerUpdated(active.teamId, actorUserId, null);
  await emitTimerStoppedNotification(actorUserId, {
    teamId: active.teamId,
    projectId: entryProjectId,
    taskId,
    taskTitle: createdEntry?.taskTitle ?? null,
  });
  // Breakpoint delivery: release pushes held while this timer was running.
  await flushDeferredNotificationPushes(actorUserId, {});

  return {
    timer: null,
    createdEntry,
  };
}

export async function updateAgencyActiveTimerDescription(
  actorUserId: string,
  input: {
    teamId: string;
    description: string;
  },
) {
  const [active] = await db
    .select({ id: agencyOpsActiveTimer.id, teamId: agencyOpsActiveTimer.teamId })
    .from(agencyOpsActiveTimer)
    .where(eq(agencyOpsActiveTimer.userId, actorUserId))
    .limit(1);

  if (!active) {
    throw new ORPCError("NOT_FOUND", { message: "No active timer." });
  }

  await requireAgencyRole(actorUserId, active.teamId, "viewer");

  if (active.teamId !== input.teamId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Active timer belongs to a different team.",
    });
  }

  const now = new Date();

  await db
    .update(agencyOpsActiveTimer)
    .set({ description: input.description.trim(), updatedAt: now })
    .where(eq(agencyOpsActiveTimer.id, active.id));

  const timer = await getActiveTimerByUser(actorUserId);

  if (!timer) {
    throw new ORPCError("NOT_FOUND", { message: "No active timer." });
  }

  await publishAgencyTimerUpdated(input.teamId, actorUserId, timer);

  return { timer };
}

export async function updateAgencyActiveTimerLinks(
  actorUserId: string,
  input: {
    teamId: string;
    links: string[];
  },
) {
  const [active] = await db
    .select({ id: agencyOpsActiveTimer.id, teamId: agencyOpsActiveTimer.teamId })
    .from(agencyOpsActiveTimer)
    .where(eq(agencyOpsActiveTimer.userId, actorUserId))
    .limit(1);

  if (!active) {
    throw new ORPCError("NOT_FOUND", { message: "No active timer." });
  }

  await requireAgencyRole(actorUserId, active.teamId, "viewer");

  if (active.teamId !== input.teamId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Active timer belongs to a different team.",
    });
  }

  const links = normalizeTimeEntryLinkUrls(input.links);
  const now = new Date();

  await db.transaction(async (tx) => {
    await replaceActiveTimerLinks(tx, active.id, links);
    await tx
      .update(agencyOpsActiveTimer)
      .set({ updatedAt: now })
      .where(eq(agencyOpsActiveTimer.id, active.id));
  });

  const timer = await getActiveTimerByUser(actorUserId);

  if (!timer) {
    throw new ORPCError("NOT_FOUND", { message: "No active timer." });
  }

  await publishAgencyTimerUpdated(input.teamId, actorUserId, timer);

  return { timer };
}

export async function updateAgencyActiveTimerTask(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string | null;
    projectId?: string;
  },
) {
  const [active] = await db
    .select({ id: agencyOpsActiveTimer.id, teamId: agencyOpsActiveTimer.teamId })
    .from(agencyOpsActiveTimer)
    .where(eq(agencyOpsActiveTimer.userId, actorUserId))
    .limit(1);

  if (!active) {
    throw new ORPCError("NOT_FOUND", { message: "No active timer." });
  }

  await requireAgencyRole(actorUserId, active.teamId, "viewer");

  if (active.teamId !== input.teamId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Active timer belongs to a different team.",
    });
  }

  let taskProjectId: string | null | undefined;
  if (input.taskId) {
    taskProjectId = await resolveTaskProjectId(input.teamId, input.taskId);
  }

  const binding = resolveAgencyActiveTimerTaskBinding({
    taskId: input.taskId,
    taskProjectId,
    projectId: input.projectId,
  });

  if (binding.taskId && !binding.projectId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "taskId requires a resolvable projectId.",
    });
  }

  if (binding.projectId) {
    await getProjectByIdForTeam(input.teamId, binding.projectId);
  }

  const now = new Date();

  await db
    .update(agencyOpsActiveTimer)
    .set({
      taskId: binding.taskId,
      projectId: binding.projectId,
      updatedAt: now,
    })
    .where(eq(agencyOpsActiveTimer.id, active.id));

  const timer = await getActiveTimerByUser(actorUserId);

  if (!timer) {
    throw new ORPCError("NOT_FOUND", { message: "No active timer." });
  }

  await publishAgencyTimerUpdated(input.teamId, actorUserId, timer);

  return { timer };
}

export async function updateAgencyActiveTimerStart(
  actorUserId: string,
  input: {
    teamId: string;
    startedAt: string;
  },
) {
  const [active] = await db
    .select({ id: agencyOpsActiveTimer.id, teamId: agencyOpsActiveTimer.teamId })
    .from(agencyOpsActiveTimer)
    .where(eq(agencyOpsActiveTimer.userId, actorUserId))
    .limit(1);

  if (!active) {
    throw new ORPCError("NOT_FOUND", { message: "No active timer." });
  }

  await requireAgencyRole(actorUserId, active.teamId, "viewer");

  if (active.teamId !== input.teamId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Active timer belongs to a different team.",
    });
  }

  const nextStartedAt = parseIsoDateTime(input.startedAt, "startedAt");
  const now = new Date();

  if (nextStartedAt.getTime() > now.getTime()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Start time can't be in the future.",
    });
  }

  await db
    .update(agencyOpsActiveTimer)
    .set({ startedAt: nextStartedAt, updatedAt: now })
    .where(eq(agencyOpsActiveTimer.id, active.id));

  const timer = await getActiveTimerByUser(actorUserId);

  if (!timer) {
    throw new ORPCError("NOT_FOUND", { message: "No active timer." });
  }

  await publishAgencyTimerUpdated(input.teamId, actorUserId, timer);

  return { timer };
}

export async function getMyAgencyTimeEntry(
  actorUserId: string,
  input: { teamId: string; entryId: string },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");
  const [row] = await db
    .select({ id: agencyOpsTimeEntry.id })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.id, input.entryId),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, actorUserId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return fetchAgencyTimeEntryRecord(row.id);
}

export async function listMyAgencyTimeEntries(
  actorUserId: string,
  input: {
    teamId: string;
    page?: number;
    pageSize?: number;
    anchorDate?: string;
    utcOffsetMinutes?: number;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, input.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const mineWhere = and(
    eq(agencyOpsTimeEntry.teamId, input.teamId),
    eq(agencyOpsTimeEntry.userId, actorUserId),
    isNull(agencyOpsTimeEntry.deletedAt),
  );

  const listQuery = db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      taskIconKey: agencyOpsProjectTask.iconKey,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      projectName: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      projectIconKey: agencyOpsProject.iconKey,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      isBillable: agencyOpsTimeEntry.isBillable,
      isWaste: agencyOpsTimeEntry.isWaste,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(mineWhere)
    .orderBy(desc(agencyOpsTimeEntry.startedAt))
    .limit(pageSize)
    .offset(offset);

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(agencyOpsTimeEntry)
    .where(mineWhere);

  const [rows, countRows] = await Promise.all([listQuery, countQuery]);
  const [countRow] = countRows;

  const parsedTotal = Number(countRow?.count ?? 0);
  const total = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;

  const utcOffsetMinutes = input.utcOffsetMinutes ?? 0;
  const { weekStartsOn } = await loadTeamWorkSchedule(input.teamId);
  const anchor = input.anchorDate ? parseIsoDateTime(input.anchorDate, "anchorDate") : new Date();
  const anchorWeek = getLocalWeekBounds(anchor, utcOffsetMinutes, weekStartsOn);
  const summaryWeekStartKeys = [
    ...new Set([
      anchorWeek.weekStartKey,
      ...rows.map((row) =>
        getLocalWeekStartKeyFromDateKey(
          localDateKeyFromInstant(row.startedAt, utcOffsetMinutes),
          weekStartsOn,
        ),
      ),
    ]),
  ];
  const summaryWeeks = new Map<
    string,
    { start: Date; end: Date; daily: Map<string, number>; totalSeconds: number }
  >();
  for (const weekStartKey of summaryWeekStartKeys) {
    const weekEndKey = addDaysToDateKey(weekStartKey, 6);
    const daily = new Map<string, number>();
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      daily.set(addDaysToDateKey(weekStartKey, dayIndex), 0);
    }
    summaryWeeks.set(weekStartKey, {
      start: localInstantFromDateKey(weekStartKey, utcOffsetMinutes),
      end: localInstantFromDateKey(weekEndKey, utcOffsetMinutes, true),
      daily,
      totalSeconds: 0,
    });
  }

  const weekStarts = [...summaryWeeks.values()].map((week) => week.start);
  const weekEnds = [...summaryWeeks.values()].map((week) => week.end);
  const summaryStart = weekStarts.reduce((earliest, start) =>
    start < earliest ? start : earliest,
  );
  const summaryEnd = weekEnds.reduce((latest, end) => (end > latest ? end : latest));
  // Naive UTC timestamp minus getTimezoneOffset() minutes, matching localDateKeyFromInstant.
  // Offset is inlined so SELECT and GROUP BY share one expression; distinct $n slots make
  // Postgres treat them as different and reject started_at.
  const offsetMinutesSql = sql.raw(String(Math.trunc(utcOffsetMinutes)));
  const localDateSql = sql`to_char((${agencyOpsTimeEntry.startedAt} - (${offsetMinutesSql} * interval '1 minute')), 'YYYY-MM-DD')`;

  const [tagsByEntryId, linksByEntryId, dailyRows] = await Promise.all([
    listTagsByTimeEntryIds(rows.map((row) => row.id)),
    listLinksByTimeEntryIds(rows.map((row) => row.id)),
    db
      .select({
        dateKey: sql<string>`${localDateSql}`.as("date_key"),
        totalSeconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`,
      })
      .from(agencyOpsTimeEntry)
      .where(
        and(
          mineWhere,
          gte(agencyOpsTimeEntry.startedAt, summaryStart),
          lte(agencyOpsTimeEntry.startedAt, summaryEnd),
        ),
      )
      .groupBy(sql.raw("date_key")),
  ]);

  applyDailyDurationTotals(
    summaryWeeks,
    dailyRows.map((row) => ({
      dateKey: row.dateKey,
      totalSeconds: Number(row.totalSeconds) || 0,
    })),
    weekStartsOn,
  );

  const items = rows.map((row) =>
    mapAgencyTimeEntryRow(row, tagsByEntryId.get(row.id) ?? [], linksByEntryId.get(row.id) ?? []),
  );

  const weekSummaries = [...summaryWeeks.entries()].map(([weekStartKey, summary]) => ({
    weekStartKey,
    startDate: summary.start.toISOString(),
    endDate: summary.end.toISOString(),
    totalSeconds: summary.totalSeconds,
    daily: [...summary.daily.entries()].map(([date, totalSeconds]) => ({ date, totalSeconds })),
  }));
  const weekSummary = weekSummaries.find(
    (summary) => summary.weekStartKey === anchorWeek.weekStartKey,
  )!;

  return {
    items,
    page,
    pageSize,
    total,
    weekSummary,
    weekSummaries,
  };
}

function parseAgencyDateRangeBound(value: string, fieldName: string, bound: "start" | "end") {
  const trimmed = value.trim();
  const iso = trimmed.includes("T")
    ? trimmed
    : bound === "start"
      ? `${trimmed}T00:00:00.000Z`
      : `${trimmed}T23:59:59.999Z`;
  return parseIsoDateTime(iso, fieldName);
}

export async function listMyAgencyTimeEntriesInRange(
  actorUserId: string,
  input: {
    teamId: string;
    from: string;
    to: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const from = parseAgencyDateRangeBound(input.from, "from", "start");
  const to = parseAgencyDateRangeBound(input.to, "to", "end");

  if (from > to) {
    throw new ORPCError("BAD_REQUEST", {
      message: "from must be before or equal to to.",
    });
  }

  const rows = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      taskIconKey: agencyOpsProjectTask.iconKey,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      projectName: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      projectIconKey: agencyOpsProject.iconKey,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      isBillable: agencyOpsTimeEntry.isBillable,
      isWaste: agencyOpsTimeEntry.isWaste,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, actorUserId),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, from),
        lte(agencyOpsTimeEntry.endedAt, to),
      ),
    )
    .orderBy(asc(agencyOpsTimeEntry.startedAt))
    .limit(500);

  const tagsByEntryId = await listTagsByTimeEntryIds(rows.map((row) => row.id));
  const linksByEntryId = await listLinksByTimeEntryIds(rows.map((row) => row.id));
  const items = rows.map((row) =>
    mapAgencyTimeEntryRow(row, tagsByEntryId.get(row.id) ?? [], linksByEntryId.get(row.id) ?? []),
  );

  return { items };
}

export async function createManualAgencyTimeEntry(
  actorUserId: string,
  input: {
    teamId: string;
    projectId?: string;
    taskId?: string;
    startAt: string;
    endAt: string;
    description?: string;
    tagIds?: string[];
    links?: string[];
    isBillable?: boolean;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");
  const tagIds = await validateAgencyTagIds(input.teamId, input.tagIds);
  const links = normalizeTimeEntryLinkUrls(input.links);

  let projectId = input.projectId;
  if (input.taskId) {
    projectId = await resolveTaskProjectId(input.teamId, input.taskId);
  } else if (!projectId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "projectId or taskId is required.",
    });
  }

  await getProjectByIdForTeam(input.teamId, projectId);

  const startAt = parseIsoDateTime(input.startAt, "startAt");
  const endAt = parseIsoDateTime(input.endAt, "endAt");
  validateDateRange(startAt, endAt);

  const now = new Date();
  const durationSeconds = getDurationSeconds(startAt, endAt);
  const journeyStepId = await resolveJourneyStepIdForTask(input.teamId, input.taskId ?? null);

  const [created] = await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(agencyOpsTimeEntry)
      .values({
        id: createWorkspaceId("agency-time"),
        teamId: input.teamId,
        projectId,
        taskId: input.taskId ?? null,
        journeyStepId,
        userId: actorUserId,
        source: "manual",
        description: input.description?.trim() ?? "",
        isBillable: input.isBillable ?? true,
        startedAt: startAt,
        endedAt: endAt,
        durationSeconds,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsTimeEntry.id });
    if (entry && tagIds.length > 0) {
      await tx
        .insert(agencyOpsTimeEntryTag)
        .values(tagIds.map((tagId) => ({ timeEntryId: entry.id, tagId })));
    }
    if (entry && links.length > 0) {
      await insertTimeEntryLinks(tx, entry.id, links);
    }
    return [entry];
  });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const [row] = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      taskIconKey: agencyOpsProjectTask.iconKey,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      projectName: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      projectIconKey: agencyOpsProject.iconKey,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      isBillable: agencyOpsTimeEntry.isBillable,
      isWaste: agencyOpsTimeEntry.isWaste,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(eq(agencyOpsTimeEntry.id, created.id))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND");
  }

  return mapAgencyTimeEntryRow(
    row,
    await listTagsForTimeEntry(row.id),
    await listLinksForTimeEntry(row.id),
  );
}

export async function updateMyAgencyTimeEntry(
  actorUserId: string,
  input: {
    teamId: string;
    entryId: string;
    projectId?: string;
    taskId?: string | null;
    startAt?: string;
    endAt?: string;
    description?: string;
    tagIds?: string[];
    links?: string[];
    isBillable?: boolean;
    isWaste?: boolean;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");
  const tagIds = await validateAgencyTagIds(input.teamId, input.tagIds);
  const links = input.links === undefined ? undefined : normalizeTimeEntryLinkUrls(input.links);

  const [current] = await db
    .select({
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.id, input.entryId),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, actorUserId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .limit(1);

  if (!current) {
    throw new ORPCError("NOT_FOUND");
  }

  if (input.projectId) {
    await getProjectByIdForTeam(input.teamId, input.projectId);
  }

  let resolvedProjectId = input.projectId;
  let taskIdUpdate: { taskId: string | null } | undefined;
  if (input.taskId !== undefined) {
    if (input.taskId === null) {
      taskIdUpdate = { taskId: null };
    } else {
      const taskProjectId = await resolveTaskProjectId(input.teamId, input.taskId);
      resolvedProjectId = taskProjectId;
      taskIdUpdate = { taskId: input.taskId };
    }
  } else if (input.projectId && input.projectId !== current.projectId && current.taskId) {
    taskIdUpdate = { taskId: null };
  }

  const nextStartedAt = input.startAt
    ? parseIsoDateTime(input.startAt, "startAt")
    : current.startedAt;
  const nextEndedAt = input.endAt ? parseIsoDateTime(input.endAt, "endAt") : current.endedAt;
  validateDateRange(nextStartedAt, nextEndedAt);

  const now = new Date();
  const durationSeconds = getDurationSeconds(nextStartedAt, nextEndedAt);

  const [updated] = await db.transaction(async (tx) => {
    const [entry] = await tx
      .update(agencyOpsTimeEntry)
      .set({
        ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
        ...(taskIdUpdate ? { taskId: taskIdUpdate.taskId } : {}),
        startedAt: nextStartedAt,
        endedAt: nextEndedAt,
        durationSeconds,
        description: input.description?.trim(),
        ...(input.isBillable !== undefined ? { isBillable: input.isBillable } : {}),
        ...(input.isWaste !== undefined ? { isWaste: input.isWaste } : {}),
        updatedAt: now,
      })
      .where(
        and(
          eq(agencyOpsTimeEntry.id, input.entryId),
          eq(agencyOpsTimeEntry.teamId, input.teamId),
          eq(agencyOpsTimeEntry.userId, actorUserId),
          isNull(agencyOpsTimeEntry.deletedAt),
        ),
      )
      .returning({ id: agencyOpsTimeEntry.id });
    if (entry && input.tagIds !== undefined) {
      await tx.delete(agencyOpsTimeEntryTag).where(eq(agencyOpsTimeEntryTag.timeEntryId, entry.id));
      if (tagIds.length > 0) {
        await tx
          .insert(agencyOpsTimeEntryTag)
          .values(tagIds.map((tagId) => ({ timeEntryId: entry.id, tagId })));
      }
    }
    if (entry && links !== undefined) {
      await replaceTimeEntryLinks(tx, entry.id, links);
    }
    return [entry];
  });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  const [row] = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      taskIconKey: agencyOpsProjectTask.iconKey,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      projectName: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      projectIconKey: agencyOpsProject.iconKey,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      isBillable: agencyOpsTimeEntry.isBillable,
      isWaste: agencyOpsTimeEntry.isWaste,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(eq(agencyOpsTimeEntry.id, updated.id))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND");
  }

  return mapAgencyTimeEntryRow(
    row,
    await listTagsForTimeEntry(row.id),
    await listLinksForTimeEntry(row.id),
  );
}

export async function updateMyAgencyTimeEntriesBulk(
  actorUserId: string,
  input: {
    teamId: string;
    entryIds: string[];
    patch: {
      projectId?: string;
      taskId?: string | null;
      description?: string;
      tagIds?: string[];
      links?: string[];
      isBillable?: boolean;
      isWaste?: boolean;
    };
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const entryIds = [...new Set(input.entryIds)];
  if (entryIds.length === 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Choose at least one time entry." });
  }

  const tagIds = await validateAgencyTagIds(input.teamId, input.patch.tagIds);
  const links =
    input.patch.links === undefined ? undefined : normalizeTimeEntryLinkUrls(input.patch.links);

  if (input.patch.projectId) {
    await getProjectByIdForTeam(input.teamId, input.patch.projectId);
  }

  let projectId = input.patch.projectId;
  let taskId: string | null | undefined;
  if (input.patch.taskId) {
    projectId = await resolveTaskProjectId(input.teamId, input.patch.taskId);
    taskId = input.patch.taskId;
  } else if (input.patch.projectId) {
    taskId = null;
  }

  const entries = await db
    .select({
      id: agencyOpsTimeEntry.id,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        inArray(agencyOpsTimeEntry.id, entryIds),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, actorUserId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    );

  if (entries.length !== entryIds.length) {
    throw new ORPCError("NOT_FOUND", {
      message: "One or more time entries were not found.",
    });
  }

  const journeyStepId =
    taskId === undefined ? undefined : await resolveJourneyStepIdForTask(input.teamId, taskId);
  const now = new Date();
  await db.transaction(async (tx) => {
    for (const entry of entries) {
      await tx
        .update(agencyOpsTimeEntry)
        .set({
          ...(projectId ? { projectId } : {}),
          ...(taskId !== undefined ? { taskId } : {}),
          ...(journeyStepId !== undefined ? { journeyStepId } : {}),
          ...(input.patch.description !== undefined
            ? { description: input.patch.description.trim() }
            : {}),
          ...(input.patch.isBillable !== undefined ? { isBillable: input.patch.isBillable } : {}),
          ...(input.patch.isWaste !== undefined ? { isWaste: input.patch.isWaste } : {}),
          updatedAt: now,
        })
        .where(eq(agencyOpsTimeEntry.id, entry.id));

      if (input.patch.tagIds !== undefined) {
        await tx
          .delete(agencyOpsTimeEntryTag)
          .where(eq(agencyOpsTimeEntryTag.timeEntryId, entry.id));
        if (tagIds.length > 0) {
          await tx
            .insert(agencyOpsTimeEntryTag)
            .values(tagIds.map((tagId) => ({ timeEntryId: entry.id, tagId })));
        }
      }
      if (links !== undefined) {
        await replaceTimeEntryLinks(tx, entry.id, links);
      }
    }
  });

  const items = await fetchAgencyTimeEntryRecords(entryIds);
  if (items.length !== entryIds.length) {
    throw new ORPCError("NOT_FOUND");
  }

  return { items };
}

export async function deleteMyAgencyTimeEntry(
  actorUserId: string,
  input: {
    teamId: string;
    entryId: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const now = new Date();
  const [deleted] = await db
    .update(agencyOpsTimeEntry)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(agencyOpsTimeEntry.id, input.entryId),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, actorUserId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .returning({ id: agencyOpsTimeEntry.id });

  return {
    entryId: deleted?.id ?? input.entryId,
    deleted: Boolean(deleted),
  };
}

export async function getAgencyTimeSummary(
  actorUserId: string,
  input: {
    teamId: string;
    from: string;
    to: string;
    clientId?: string;
    projectId?: string;
    memberUserId?: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const from = parseIsoDateTime(input.from, "from");
  const to = parseIsoDateTime(input.to, "to");

  // Team members
  const members = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  // Active timers for the whole team
  const activeTimers = await db
    .select({
      userId: agencyOpsActiveTimer.userId,
      projectName: agencyOpsProject.name,
      description: agencyOpsActiveTimer.description,
    })
    .from(agencyOpsActiveTimer)
    .leftJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsActiveTimer.projectId))
    .where(eq(agencyOpsActiveTimer.teamId, input.teamId));

  const activeTimerByUser = new Map(activeTimers.map((t) => [t.userId, t]));

  // Time entry filters
  const entryFilters = [
    eq(agencyOpsTimeEntry.teamId, input.teamId),
    isNull(agencyOpsTimeEntry.deletedAt),
    gte(agencyOpsTimeEntry.startedAt, from),
    lte(agencyOpsTimeEntry.startedAt, to),
  ];

  if (input.clientId) {
    entryFilters.push(eq(agencyOpsProject.clientId, input.clientId));
  }
  if (input.projectId) {
    entryFilters.push(eq(agencyOpsProject.id, input.projectId));
  }
  if (input.memberUserId) {
    entryFilters.push(eq(agencyOpsTimeEntry.userId, input.memberUserId));
  }

  const entries = await db
    .select({
      userId: agencyOpsTimeEntry.userId,
      projectName: agencyOpsProject.name,
      description: agencyOpsTimeEntry.description,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .where(and(...entryFilters))
    .orderBy(desc(agencyOpsTimeEntry.startedAt));

  const totalSecondsPerMember = new Map<string, number>();
  const latestEntryPerMember = new Map<string, { projectName: string; description: string }>();

  for (const entry of entries) {
    totalSecondsPerMember.set(
      entry.userId,
      (totalSecondsPerMember.get(entry.userId) ?? 0) + Number(entry.durationSeconds),
    );
    if (!latestEntryPerMember.has(entry.userId)) {
      latestEntryPerMember.set(entry.userId, {
        projectName: entry.projectName,
        description: entry.description,
      });
    }
  }

  const totalSeconds = [...totalSecondsPerMember.values()].reduce((a, b) => a + b, 0);

  return {
    summary: {
      totalSeconds,
      activeCount: activeTimers.length,
      teamMembers: members.map((member) => {
        const activeTimer = activeTimerByUser.get(member.id);
        return {
          id: member.id,
          avatar: formatAvatarUrl(member.image),
          name: member.name ?? "Unknown",
          email: member.email,
          isActive: Boolean(activeTimer),
          totalSeconds: totalSecondsPerMember.get(member.id) ?? 0,
          // Prefer the live timer over the last completed entry in-range.
          latestEntry: activeTimer
            ? {
                projectName: activeTimer.projectName ?? "No project",
                description: activeTimer.description,
              }
            : (latestEntryPerMember.get(member.id) ?? null),
        };
      }),
    },
  };
}

export async function listAllAgencyTimeEntries(
  actorUserId: string,
  input: ReportEntityFilterInput & {
    teamId: string;
    from: string;
    to: string;
    page?: number;
    pageSize?: number;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "editor");

  const from = parseIsoDateTime(input.from, "from");
  const to = parseIsoDateTime(input.to, "to");

  if (from > to) {
    throw new ORPCError("BAD_REQUEST", {
      message: "from must be before or equal to to.",
    });
  }

  const page = Math.max(1, input.page ?? 1);
  // Reports bulk fetch allows up to 5k; Tracker/other callers pass ≤100.
  const pageSize = Math.min(5_000, Math.max(1, input.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const filters = [
    eq(agencyOpsTimeEntry.teamId, input.teamId),
    isNull(agencyOpsTimeEntry.deletedAt),
    gte(agencyOpsTimeEntry.startedAt, from),
    lte(agencyOpsTimeEntry.startedAt, to),
  ];

  applyReportEntityFilters(filters, input);

  const rows = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      taskIconKey: agencyOpsProjectTask.iconKey,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      projectName: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      projectIconKey: agencyOpsProject.iconKey,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      isBillable: agencyOpsTimeEntry.isBillable,
      isWaste: agencyOpsTimeEntry.isWaste,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(and(...filters))
    .orderBy(desc(agencyOpsTimeEntry.startedAt))
    .limit(pageSize)
    .offset(offset);

  const tagsByEntryId = await listTagsByTimeEntryIds(rows.map((row) => row.id));
  const linksByEntryId = await listLinksByTimeEntryIds(rows.map((row) => row.id));
  const items = rows.map((row) =>
    mapAgencyTimeEntryRow(row, tagsByEntryId.get(row.id) ?? [], linksByEntryId.get(row.id) ?? []),
  );

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .where(and(...filters));

  const parsedTotal = Number(countRow?.count ?? 0);
  const total = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;

  return {
    items,
    page,
    pageSize,
    total,
  };
}

export async function updateAnyAgencyTimeEntry(
  actorUserId: string,
  input: {
    teamId: string;
    entryId: string;
    startAt?: string;
    endAt?: string;
    description?: string;
    projectId?: string;
    taskId?: string | null;
    tagIds?: string[];
    links?: string[];
    isBillable?: boolean;
    isWaste?: boolean;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  const tagIds = await validateAgencyTagIds(input.teamId, input.tagIds);
  const links = input.links === undefined ? undefined : normalizeTimeEntryLinkUrls(input.links);

  const [current] = await db
    .select({
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.id, input.entryId),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .limit(1);

  if (!current) {
    throw new ORPCError("NOT_FOUND");
  }

  if (input.projectId) {
    await getProjectByIdForTeam(input.teamId, input.projectId);
  }

  let resolvedProjectId = input.projectId;
  let taskIdUpdate: { taskId: string | null } | undefined;
  if (input.taskId !== undefined) {
    if (input.taskId === null) {
      taskIdUpdate = { taskId: null };
    } else {
      const taskProjectId = await resolveTaskProjectId(input.teamId, input.taskId);
      resolvedProjectId = taskProjectId;
      taskIdUpdate = { taskId: input.taskId };
    }
  } else if (input.projectId && input.projectId !== current.projectId && current.taskId) {
    taskIdUpdate = { taskId: null };
  }

  const nextStartedAt = input.startAt
    ? parseIsoDateTime(input.startAt, "startAt")
    : current.startedAt;
  const nextEndedAt = input.endAt ? parseIsoDateTime(input.endAt, "endAt") : current.endedAt;
  validateDateRange(nextStartedAt, nextEndedAt);

  const now = new Date();
  const durationSeconds = getDurationSeconds(nextStartedAt, nextEndedAt);

  const [updated] = await db.transaction(async (tx) => {
    const [entry] = await tx
      .update(agencyOpsTimeEntry)
      .set({
        ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
        ...(taskIdUpdate ? { taskId: taskIdUpdate.taskId } : {}),
        startedAt: nextStartedAt,
        endedAt: nextEndedAt,
        durationSeconds,
        description: input.description?.trim(),
        ...(input.isBillable !== undefined ? { isBillable: input.isBillable } : {}),
        ...(input.isWaste !== undefined ? { isWaste: input.isWaste } : {}),
        updatedAt: now,
      })
      .where(
        and(
          eq(agencyOpsTimeEntry.id, input.entryId),
          eq(agencyOpsTimeEntry.teamId, input.teamId),
          isNull(agencyOpsTimeEntry.deletedAt),
        ),
      )
      .returning({ id: agencyOpsTimeEntry.id });
    if (entry && input.tagIds !== undefined) {
      await tx.delete(agencyOpsTimeEntryTag).where(eq(agencyOpsTimeEntryTag.timeEntryId, entry.id));
      if (tagIds.length > 0) {
        await tx
          .insert(agencyOpsTimeEntryTag)
          .values(tagIds.map((tagId) => ({ timeEntryId: entry.id, tagId })));
      }
    }
    if (entry && links !== undefined) {
      await replaceTimeEntryLinks(tx, entry.id, links);
    }
    return [entry];
  });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  const [row] = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      taskIconKey: agencyOpsProjectTask.iconKey,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      projectName: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      projectIconKey: agencyOpsProject.iconKey,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
      isBillable: agencyOpsTimeEntry.isBillable,
      isWaste: agencyOpsTimeEntry.isWaste,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      createdAt: agencyOpsTimeEntry.createdAt,
      updatedAt: agencyOpsTimeEntry.updatedAt,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(eq(agencyOpsTimeEntry.id, updated.id))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND");
  }

  return mapAgencyTimeEntryRow(
    row,
    await listTagsForTimeEntry(row.id),
    await listLinksForTimeEntry(row.id),
  );
}

export async function deleteAnyAgencyTimeEntry(
  actorUserId: string,
  input: {
    teamId: string;
    entryId: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const now = new Date();
  const [deleted] = await db
    .update(agencyOpsTimeEntry)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(agencyOpsTimeEntry.id, input.entryId),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .returning({ id: agencyOpsTimeEntry.id });

  if (!deleted) {
    throw new ORPCError("NOT_FOUND");
  }

  return {
    entryId: deleted.id,
    deleted: true,
  };
}

export async function duplicateAnyAgencyTimeEntry(
  actorUserId: string,
  input: {
    teamId: string;
    entryId: string;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const [source] = await db
    .select({
      id: agencyOpsTimeEntry.id,
      teamId: agencyOpsTimeEntry.teamId,
      userId: agencyOpsTimeEntry.userId,
      projectId: agencyOpsTimeEntry.projectId,
      taskId: agencyOpsTimeEntry.taskId,
      journeyStepId: agencyOpsTimeEntry.journeyStepId,
      description: agencyOpsTimeEntry.description,
      isBillable: agencyOpsTimeEntry.isBillable,
      isWaste: agencyOpsTimeEntry.isWaste,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.id, input.entryId),
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .limit(1);

  if (!source) {
    throw new ORPCError("NOT_FOUND");
  }

  const tagRows = await db
    .select({ tagId: agencyOpsTimeEntryTag.tagId })
    .from(agencyOpsTimeEntryTag)
    .where(eq(agencyOpsTimeEntryTag.timeEntryId, source.id));
  const tagIds = tagRows.map((row) => row.tagId);

  const linkRows = await db
    .select({ url: agencyOpsTimeEntryLink.url, sortOrder: agencyOpsTimeEntryLink.sortOrder })
    .from(agencyOpsTimeEntryLink)
    .where(eq(agencyOpsTimeEntryLink.timeEntryId, source.id))
    .orderBy(asc(agencyOpsTimeEntryLink.sortOrder));
  const linkUrls = linkRows.map((row) => row.url);

  const now = new Date();
  const [created] = await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(agencyOpsTimeEntry)
      .values({
        id: createWorkspaceId("agency-time"),
        teamId: source.teamId,
        projectId: source.projectId,
        taskId: source.taskId,
        journeyStepId: source.journeyStepId,
        userId: source.userId,
        source: "manual",
        description: source.description,
        isBillable: source.isBillable,
        isWaste: source.isWaste,
        startedAt: source.startedAt,
        endedAt: source.endedAt,
        durationSeconds: source.durationSeconds,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsTimeEntry.id });

    if (entry && tagIds.length > 0) {
      await tx
        .insert(agencyOpsTimeEntryTag)
        .values(tagIds.map((tagId) => ({ timeEntryId: entry.id, tagId })));
    }
    if (entry && linkUrls.length > 0) {
      await insertTimeEntryLinks(tx, entry.id, linkUrls);
    }

    return [entry];
  });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const record = await fetchAgencyTimeEntryRecord(created.id);
  if (!record) {
    throw new ORPCError("NOT_FOUND");
  }

  return record;
}
