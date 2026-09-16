import { ORPCError } from "@orpc/server";
import { eq, isNull, gte, lte, and, desc, inArray, asc } from "drizzle-orm";
import {
  agencyOpsTimeEntry,
  user,
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsProjectTask,
  workspaceTeamMember,
  agencyOpsActiveTimer,
} from "@orch/db/schema";
import { db } from "@orch/db";
import {
  type ReportEntityFilterInput,
  applyReportEntityFilters,
  resolveReportEntityIds,
} from "../shared/report-helpers";
import { parseIsoDateTime } from "../shared/date-helpers";
import { formatAvatarUrl } from "../shared/avatar-helpers";
import { requireTeamMembership } from "../shared/membership";
import { isAgencyEntityIconKey } from "../shared/entity-icon-catalog";
import {
  buildReportEntryFilters,
  queryDailyProjectBuckets,
  queryLatestCompletedEntryByMember,
  queryMemberProjectBreakdown,
  queryProjectShareMetrics,
  queryReportTotals,
  querySecondsByClient,
  querySecondsByMember,
  querySecondsByProject,
} from "./aggregate-queries";

type AgencyReportSummary = {
  totalHours: number;
  totalEntries: number;
  timeDistributionByClient: Array<{
    clientId: string;
    clientName: string;
    hours: number;
  }>;
  timeDistributionByProject: Array<{
    projectId: string;
    projectName: string;
    colorHueId: number | null;
    iconKey: string | null;
    clientId: string;
    clientName: string;
    hours: number;
  }>;
  teamActivity: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    hours: number;
  }>;
};

type AgencyDashboardSummary = AgencyReportSummary & {
  totalSeconds: number;
  projectShareMetrics: {
    externalSeconds: number;
    internalSeconds: number;
    internalBillableSeconds: number;
    paidSeconds: number;
  };
  activeTimerCount: number;
  topClient: { clientId: string; clientName: string; seconds: number } | null;
  topProject: {
    projectId: string;
    projectName: string;
    clientId: string;
    clientName: string;
    seconds: number;
  } | null;
  dailyBuckets: Array<{
    date: string;
    totalSeconds: number;
    segments: Array<{
      projectId: string;
      projectName: string;
      clientName: string;
      seconds: number;
    }>;
  }>;
  teamMembers: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    avatar: string | null;
    isActive: boolean;
    totalSeconds: number;
    latestEntry: {
      projectName: string;
      clientName: string;
      description: string;
      startedAt: string;
    } | null;
    projectBreakdown: Array<{
      projectId: string;
      projectName: string;
      clientName: string;
      seconds: number;
    }>;
  }>;
};

function addDaysUtc(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1_000);
}

function formatUtcDateKey(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeCsvCell(value: string | number) {
  const stringified = String(value ?? "");

  if (/[",\n]/.test(stringified)) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }

  return stringified;
}

async function getReportRows(
  actorUserId: string,
  input: ReportEntityFilterInput & {
    teamId: string;
    from: string;
    to: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const from = parseIsoDateTime(input.from, "from");
  const to = parseIsoDateTime(input.to, "to");

  if (from > to) {
    throw new ORPCError("BAD_REQUEST", {
      message: "from must be before or equal to to.",
    });
  }

  const filters = [
    eq(agencyOpsTimeEntry.teamId, input.teamId),
    isNull(agencyOpsTimeEntry.deletedAt),
    gte(agencyOpsTimeEntry.startedAt, from),
    lte(agencyOpsTimeEntry.startedAt, to),
  ];

  applyReportEntityFilters(filters, input);

  const rows = await db
    .select({
      entryId: agencyOpsTimeEntry.id,
      startedAt: agencyOpsTimeEntry.startedAt,
      endedAt: agencyOpsTimeEntry.endedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      memberName: user.name,
      memberEmail: user.email,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      clientCategory: agencyOpsClient.category,
      projectId: agencyOpsProject.id,
      taskId: agencyOpsTimeEntry.taskId,
      taskTitle: agencyOpsProjectTask.title,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      projectName: agencyOpsProject.name,
      isBillable: agencyOpsTimeEntry.isBillable,
      isWaste: agencyOpsTimeEntry.isWaste,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .innerJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .where(and(...filters))
    .orderBy(desc(agencyOpsTimeEntry.startedAt));

  const scopedProjects = await db
    .select({
      id: agencyOpsProject.id,
      name: agencyOpsProject.name,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
    })
    .from(agencyOpsProject)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(
      and(
        eq(agencyOpsProject.teamId, input.teamId),
        isNull(agencyOpsProject.deletedAt),
        ...(() => {
          const scopedFilters: Parameters<typeof and>[0][] = [];
          const clientIds = resolveReportEntityIds(input.clientId, input.clientIds);
          if (clientIds.length === 1) {
            scopedFilters.push(eq(agencyOpsProject.clientId, clientIds[0]!));
          } else if (clientIds.length > 1) {
            scopedFilters.push(inArray(agencyOpsProject.clientId, clientIds));
          }
          const projectIds = resolveReportEntityIds(input.projectId, input.projectIds);
          if (projectIds.length === 1) {
            scopedFilters.push(eq(agencyOpsProject.id, projectIds[0]!));
          } else if (projectIds.length > 1) {
            scopedFilters.push(inArray(agencyOpsProject.id, projectIds));
          }
          return scopedFilters;
        })(),
      ),
    )
    .orderBy(asc(agencyOpsProject.name));

  return {
    rows,
    scopedProjects,
  };
}

export async function getAgencyReportsSummary(
  actorUserId: string,
  input: ReportEntityFilterInput & {
    teamId: string;
    from: string;
    to: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const from = parseIsoDateTime(input.from, "from");
  const to = parseIsoDateTime(input.to, "to");
  if (from > to) {
    throw new ORPCError("BAD_REQUEST", {
      message: "from must be before or equal to to.",
    });
  }

  const filters = buildReportEntryFilters(input.teamId, from, to, input);
  const [totals, byClient, byProject, byMember, share] = await Promise.all([
    queryReportTotals(filters),
    querySecondsByClient(filters),
    querySecondsByProject(filters),
    querySecondsByMember(filters),
    queryProjectShareMetrics(filters),
  ]);

  const summary: AgencyReportSummary = {
    totalHours: Number((totals.totalSeconds / 3_600).toFixed(2)),
    totalEntries: totals.totalEntries,
    timeDistributionByClient: byClient.map((entry) => ({
      clientId: entry.clientId,
      clientName: entry.clientName,
      hours: Number((entry.seconds / 3_600).toFixed(2)),
    })),
    timeDistributionByProject: byProject.map((entry) => ({
      projectId: entry.projectId,
      projectName: entry.projectName,
      colorHueId: entry.colorHueId,
      iconKey: isAgencyEntityIconKey(entry.iconKey) ? entry.iconKey : null,
      clientId: entry.clientId,
      clientName: entry.clientName,
      hours: Number((entry.seconds / 3_600).toFixed(2)),
    })),
    // Preserve prior API quirk: teamActivity.userId was the member email.
    teamActivity: byMember.map((entry) => ({
      userId: entry.userEmail,
      userName: entry.userName ?? "Unknown",
      userEmail: entry.userEmail,
      hours: Number((entry.seconds / 3_600).toFixed(2)),
    })),
  };

  return {
    summary,
    composition: {
      paidSeconds: share.paidSeconds,
      wasteSeconds: totals.wasteSeconds,
      internalSeconds: share.internalSeconds,
      totalSeconds: totals.totalSeconds,
    },
    byProjectDetail: byProject.map((entry) => ({
      projectId: entry.projectId,
      projectName: entry.projectName,
      clientName: entry.clientName,
      seconds: entry.seconds,
      wasteSeconds: entry.wasteSeconds,
      nonWasteSeconds: Math.max(0, entry.seconds - entry.wasteSeconds),
    })),
    byMemberDetail: byMember.map((entry) => ({
      userId: entry.userEmail,
      userName: entry.userName ?? "Unknown",
      seconds: entry.seconds,
      wasteSeconds: entry.wasteSeconds,
      nonWasteSeconds: Math.max(0, entry.seconds - entry.wasteSeconds),
    })),
  };
}

export async function getAgencyDashboardSummary(
  actorUserId: string,
  input: ReportEntityFilterInput & {
    teamId: string;
    from: string;
    to: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const from = parseIsoDateTime(input.from, "from");
  const to = parseIsoDateTime(input.to, "to");
  if (from > to) {
    throw new ORPCError("BAD_REQUEST", {
      message: "from must be before or equal to to.",
    });
  }

  const filters = buildReportEntryFilters(input.teamId, from, to, input);

  const [
    totals,
    byClient,
    byProject,
    byMember,
    share,
    dailyRows,
    latestRows,
    memberProjectRows,
    members,
    activeTimers,
  ] = await Promise.all([
    queryReportTotals(filters),
    querySecondsByClient(filters),
    querySecondsByProject(filters),
    querySecondsByMember(filters),
    queryProjectShareMetrics(filters),
    queryDailyProjectBuckets(filters),
    queryLatestCompletedEntryByMember(filters),
    queryMemberProjectBreakdown(filters),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(workspaceTeamMember)
      .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
      .where(eq(workspaceTeamMember.teamId, input.teamId))
      .orderBy(asc(user.name)),
    db
      .select({
        userId: agencyOpsActiveTimer.userId,
        projectName: agencyOpsProject.name,
        clientName: agencyOpsClient.name,
        description: agencyOpsActiveTimer.description,
        startedAt: agencyOpsActiveTimer.startedAt,
      })
      .from(agencyOpsActiveTimer)
      .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsActiveTimer.projectId))
      .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
      .where(eq(agencyOpsActiveTimer.teamId, input.teamId)),
  ]);

  const activeTimerByUser = new Map(activeTimers.map((timer) => [timer.userId, timer]));
  const memberSeconds = new Map(byMember.map((row) => [row.userEmail, row.seconds]));
  const latestEntryByMember = new Map(
    latestRows.map((row) => [
      row.userEmail,
      {
        projectName: row.projectName,
        clientName: row.clientName,
        description: row.description,
        startedAt: row.startedAt.toISOString(),
      },
    ]),
  );
  const memberProjectSeconds = new Map<
    string,
    Array<{ projectId: string; projectName: string; clientName: string; seconds: number }>
  >();
  for (const row of memberProjectRows) {
    const list = memberProjectSeconds.get(row.userEmail) ?? [];
    list.push({
      projectId: row.projectId,
      projectName: row.projectName,
      clientName: row.clientName,
      seconds: row.seconds,
    });
    memberProjectSeconds.set(row.userEmail, list);
  }

  const dailyBucketsMap = new Map<
    string,
    Map<string, { projectId: string; projectName: string; clientName: string; seconds: number }>
  >();
  for (const row of dailyRows) {
    const dayProjects = dailyBucketsMap.get(row.date) ?? new Map();
    dayProjects.set(row.projectId, {
      projectId: row.projectId,
      projectName: row.projectName,
      clientName: row.clientName,
      seconds: row.seconds,
    });
    dailyBucketsMap.set(row.date, dayProjects);
  }

  const filledDailyBuckets = [];
  for (
    let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    cursor <= to && filledDailyBuckets.length < 370;
    cursor = addDaysUtc(cursor, 1)
  ) {
    const date = formatUtcDateKey(cursor);
    const projects = dailyBucketsMap.get(date) ?? new Map();
    filledDailyBuckets.push({
      date,
      totalSeconds: [...projects.values()].reduce(
        (sumSeconds, project) => sumSeconds + project.seconds,
        0,
      ),
      segments: [...projects.values()].sort((left, right) => right.seconds - left.seconds),
    });
  }

  const topClient = byClient[0]
    ? {
        clientId: byClient[0].clientId,
        clientName: byClient[0].clientName,
        seconds: byClient[0].seconds,
      }
    : null;
  const topProject = byProject[0]
    ? {
        projectId: byProject[0].projectId,
        projectName: byProject[0].projectName,
        clientId: byProject[0].clientId,
        clientName: byProject[0].clientName,
        seconds: byProject[0].seconds,
      }
    : null;

  const summary: AgencyDashboardSummary = {
    totalHours: Number((totals.totalSeconds / 3_600).toFixed(2)),
    totalSeconds: totals.totalSeconds,
    projectShareMetrics: share,
    totalEntries: totals.totalEntries,
    activeTimerCount: activeTimers.length,
    topClient,
    topProject,
    timeDistributionByClient: byClient.map((entry) => ({
      clientId: entry.clientId,
      clientName: entry.clientName,
      hours: Number((entry.seconds / 3_600).toFixed(2)),
    })),
    timeDistributionByProject: byProject.map((entry) => ({
      projectId: entry.projectId,
      projectName: entry.projectName,
      colorHueId: entry.colorHueId,
      iconKey: isAgencyEntityIconKey(entry.iconKey) ? entry.iconKey : null,
      clientId: entry.clientId,
      clientName: entry.clientName,
      hours: Number((entry.seconds / 3_600).toFixed(2)),
    })),
    teamActivity: byMember.map((entry) => ({
      userId: entry.userEmail,
      userName: entry.userName ?? "Unknown",
      userEmail: entry.userEmail,
      hours: Number((entry.seconds / 3_600).toFixed(2)),
    })),
    dailyBuckets: filledDailyBuckets,
    teamMembers: members
      .map((member) => {
        const activeTimer = activeTimerByUser.get(member.id);
        return {
          userId: member.id,
          userName: member.name ?? "Unknown",
          userEmail: member.email,
          avatar: formatAvatarUrl(member.image),
          isActive: Boolean(activeTimer),
          totalSeconds: memberSeconds.get(member.email) ?? 0,
          latestEntry: activeTimer
            ? {
                projectName: activeTimer.projectName,
                clientName: activeTimer.clientName,
                description: activeTimer.description,
                startedAt: activeTimer.startedAt.toISOString(),
              }
            : (latestEntryByMember.get(member.email) ?? null),
          projectBreakdown: [...(memberProjectSeconds.get(member.email) ?? [])].sort(
            (left, right) => right.seconds - left.seconds,
          ),
        };
      })
      .sort(
        (left, right) =>
          Number(right.isActive) - Number(left.isActive) || right.totalSeconds - left.totalSeconds,
      ),
  };

  return { summary };
}

export async function exportAgencyReportsCsv(
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
  const { rows } = await getReportRows(actorUserId, input);

  const records = rows.map((row) => ({
    entryId: row.entryId,
    date: formatUtcDateKey(row.startedAt),
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    durationHours: Number((row.durationSeconds / 3_600).toFixed(2)),
    memberName: row.memberName,
    memberEmail: row.memberEmail,
    clientName: row.clientName,
    projectName: row.projectName,
    source: row.source,
    description: row.description,
  }));

  const header = [
    "entry_id",
    "date",
    "started_at",
    "ended_at",
    "duration_hours",
    "member_name",
    "member_email",
    "client_name",
    "project_name",
    "source",
    "description",
  ];

  const lines = [
    header.join(","),
    ...records.map((record) =>
      [
        record.entryId,
        record.date,
        record.startedAt,
        record.endedAt,
        record.durationHours,
        record.memberName,
        record.memberEmail,
        record.clientName,
        record.projectName,
        record.source,
        record.description,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ];

  return {
    contentType: "text/csv",
    fileName: `agency-report-${input.teamId}-${Date.now()}.csv`,
    csv: `${lines.join("\n")}\n`,
    totalRows: records.length,
  };
}

import {
  listAllAgencyTimeEntries as listAllTimeEntries,
  updateAnyAgencyTimeEntry as updateAnyTimeEntry,
  deleteAnyAgencyTimeEntry as deleteAnyTimeEntry,
  duplicateAnyAgencyTimeEntry as duplicateAnyTimeEntry,
} from "../time-tracking/service";

export async function listAllAgencyTimeEntries(
  actorUserId: string,
  input: Parameters<typeof listAllTimeEntries>[1],
) {
  return listAllTimeEntries(actorUserId, input);
}

export async function updateAnyAgencyTimeEntry(
  actorUserId: string,
  input: Parameters<typeof updateAnyTimeEntry>[1],
) {
  return updateAnyTimeEntry(actorUserId, input);
}

export async function deleteAnyAgencyTimeEntry(
  actorUserId: string,
  input: Parameters<typeof deleteAnyTimeEntry>[1],
) {
  return deleteAnyTimeEntry(actorUserId, input);
}

export async function duplicateAnyAgencyTimeEntry(
  actorUserId: string,
  input: Parameters<typeof duplicateAnyTimeEntry>[1],
) {
  return duplicateAnyTimeEntry(actorUserId, input);
}
