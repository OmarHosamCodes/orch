import { and, eq, gte, isNull, lte, sql, desc, asc } from "drizzle-orm";
import {
  agencyOpsTimeEntry,
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsProjectTask,
  user,
} from "@orch/db/schema";
import { db } from "@orch/db";
import { type ReportEntityFilterInput, applyReportEntityFilters } from "../shared/report-helpers";
import { reportEntryIsWasteSql } from "../shared/waste-helpers";

export { reportEntryIsWasteSql } from "../shared/waste-helpers";

export function buildReportEntryFilters(
  teamId: string,
  from: Date,
  to: Date,
  input: ReportEntityFilterInput,
) {
  const filters = [
    eq(agencyOpsTimeEntry.teamId, teamId),
    isNull(agencyOpsTimeEntry.deletedAt),
    gte(agencyOpsTimeEntry.startedAt, from),
    lte(agencyOpsTimeEntry.startedAt, to),
  ];
  applyReportEntityFilters(filters, input);
  return filters;
}

export async function queryReportTotals(filters: ReturnType<typeof buildReportEntryFilters>) {
  const [row] = await db
    .select({
      totalSeconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`.mapWith(
        Number,
      ),
      totalEntries: sql<number>`count(*)`.mapWith(Number),
      wasteSeconds:
        sql<number>`coalesce(sum(case when ${reportEntryIsWasteSql} then ${agencyOpsTimeEntry.durationSeconds} else 0 end), 0)`.mapWith(
          Number,
        ),
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .where(and(...filters));

  return {
    totalSeconds: row?.totalSeconds ?? 0,
    totalEntries: row?.totalEntries ?? 0,
    wasteSeconds: row?.wasteSeconds ?? 0,
  };
}

export async function querySecondsByClient(filters: ReturnType<typeof buildReportEntryFilters>) {
  return db
    .select({
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      seconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`.mapWith(Number),
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(and(...filters))
    .groupBy(agencyOpsClient.id, agencyOpsClient.name)
    .orderBy(desc(sql`sum(${agencyOpsTimeEntry.durationSeconds})`));
}

export async function queryClientPreviewStats(filters: ReturnType<typeof buildReportEntryFilters>) {
  return db
    .select({
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      category: agencyOpsClient.category,
      billableRateAmount: agencyOpsClient.billableRateAmount,
      sourceBillableRateAmount: agencyOpsClient.sourceBillableRateAmount,
      currency: agencyOpsClient.currency,
      seconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`.mapWith(Number),
      wasteSeconds:
        sql<number>`coalesce(sum(case when ${reportEntryIsWasteSql} then ${agencyOpsTimeEntry.durationSeconds} else 0 end), 0)`.mapWith(
          Number,
        ),
      entryCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .where(and(...filters))
    .groupBy(
      agencyOpsClient.id,
      agencyOpsClient.name,
      agencyOpsClient.category,
      agencyOpsClient.billableRateAmount,
      agencyOpsClient.sourceBillableRateAmount,
      agencyOpsClient.currency,
    )
    .orderBy(asc(agencyOpsClient.name));
}

export async function querySecondsByProject(filters: ReturnType<typeof buildReportEntryFilters>) {
  return db
    .select({
      projectId: agencyOpsProject.id,
      projectName: agencyOpsProject.name,
      colorHueId: agencyOpsProject.colorHueId,
      iconKey: agencyOpsProject.iconKey,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      seconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`.mapWith(Number),
      wasteSeconds:
        sql<number>`coalesce(sum(case when ${reportEntryIsWasteSql} then ${agencyOpsTimeEntry.durationSeconds} else 0 end), 0)`.mapWith(
          Number,
        ),
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .where(and(...filters))
    .groupBy(
      agencyOpsProject.id,
      agencyOpsProject.name,
      agencyOpsProject.colorHueId,
      agencyOpsProject.iconKey,
      agencyOpsClient.id,
      agencyOpsClient.name,
    )
    .orderBy(desc(sql`sum(${agencyOpsTimeEntry.durationSeconds})`));
}

export async function querySecondsByMember(filters: ReturnType<typeof buildReportEntryFilters>) {
  return db
    .select({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      seconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`.mapWith(Number),
      wasteSeconds:
        sql<number>`coalesce(sum(case when ${reportEntryIsWasteSql} then ${agencyOpsTimeEntry.durationSeconds} else 0 end), 0)`.mapWith(
          Number,
        ),
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .innerJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .where(and(...filters))
    .groupBy(user.id, user.name, user.email)
    .orderBy(desc(sql`sum(${agencyOpsTimeEntry.durationSeconds})`));
}

export async function queryProjectShareMetrics(
  filters: ReturnType<typeof buildReportEntryFilters>,
) {
  const [row] = await db
    .select({
      externalSeconds:
        sql<number>`coalesce(sum(case when ${agencyOpsClient.category} = 'external' then ${agencyOpsTimeEntry.durationSeconds} else 0 end), 0)`.mapWith(
          Number,
        ),
      internalSeconds:
        sql<number>`coalesce(sum(case when ${agencyOpsClient.category} = 'internal' then ${agencyOpsTimeEntry.durationSeconds} else 0 end), 0)`.mapWith(
          Number,
        ),
      internalBillableSeconds:
        sql<number>`coalesce(sum(case when ${agencyOpsClient.category} = 'internal' and ${agencyOpsTimeEntry.isBillable} = true then ${agencyOpsTimeEntry.durationSeconds} else 0 end), 0)`.mapWith(
          Number,
        ),
      externalWasteSeconds:
        sql<number>`coalesce(sum(case when ${agencyOpsClient.category} = 'external' and ${reportEntryIsWasteSql} then ${agencyOpsTimeEntry.durationSeconds} else 0 end), 0)`.mapWith(
          Number,
        ),
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .where(and(...filters));

  const externalSeconds = row?.externalSeconds ?? 0;
  const externalWasteSeconds = row?.externalWasteSeconds ?? 0;
  return {
    externalSeconds,
    internalSeconds: row?.internalSeconds ?? 0,
    internalBillableSeconds: row?.internalBillableSeconds ?? 0,
    paidSeconds: Math.max(0, externalSeconds - externalWasteSeconds),
  };
}

export async function queryDailyProjectBuckets(
  filters: ReturnType<typeof buildReportEntryFilters>,
) {
  return db
    .select({
      date: sql<string>`to_char((${agencyOpsTimeEntry.startedAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
      projectId: agencyOpsProject.id,
      projectName: agencyOpsProject.name,
      clientName: agencyOpsClient.name,
      seconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`.mapWith(Number),
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(and(...filters))
    .groupBy(
      sql`to_char((${agencyOpsTimeEntry.startedAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
      agencyOpsProject.id,
      agencyOpsProject.name,
      agencyOpsClient.name,
    )
    .orderBy(asc(sql`to_char((${agencyOpsTimeEntry.startedAt} at time zone 'UTC'), 'YYYY-MM-DD')`));
}

export async function queryLatestCompletedEntryByMember(
  filters: ReturnType<typeof buildReportEntryFilters>,
) {
  // Subquery must alias both `name` columns — Postgres rejects duplicate names in FROM.
  const ranked = db
    .select({
      userEmail: user.email,
      projectName: sql<string>`${agencyOpsProject.name}`.as("project_name"),
      clientName: sql<string>`${agencyOpsClient.name}`.as("client_name"),
      description: agencyOpsTimeEntry.description,
      startedAt: agencyOpsTimeEntry.startedAt,
      rn: sql<number>`row_number() over (partition by ${user.email} order by ${agencyOpsTimeEntry.startedAt} desc)`.as(
        "rn",
      ),
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .innerJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(and(...filters))
    .as("report_latest_ranked");

  return db.select().from(ranked).where(eq(ranked.rn, 1));
}

export async function queryMemberProjectBreakdown(
  filters: ReturnType<typeof buildReportEntryFilters>,
) {
  return db
    .select({
      userEmail: user.email,
      projectId: agencyOpsProject.id,
      projectName: agencyOpsProject.name,
      clientName: agencyOpsClient.name,
      seconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`.mapWith(Number),
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .innerJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(and(...filters))
    .groupBy(user.email, agencyOpsProject.id, agencyOpsProject.name, agencyOpsClient.name);
}
