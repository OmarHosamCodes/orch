import { db } from "@orch/db";
import {
  agencyOpsReport,
  agencyOpsReportActivity,
  type AgencyOpsReportActivityAction,
  user,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";

import { requireAgencyRole } from "../shared/membership";

export type SavedReportSnapshotInput = {
  teamId: string;
  name: string;
  rangePreset: string;
  customFromDate?: string;
  customToDate?: string;
  rangeFrom: string;
  rangeTo: string;
  clientId?: string;
  projectId?: string;
  memberUserId?: string;
  fieldIds: string[];
};

export type SavedReportActivityInput = {
  action: AgencyOpsReportActivityAction;
  payload?: Record<string, unknown>;
};

export type SavedReportListItem = {
  id: string;
  name: string;
  rangeFrom: string;
  rangeTo: string;
  clientId: string;
  projectId: string;
  memberUserId: string;
  createdByUserName: string;
  updatedAt: string;
};

export type SavedReportRecord = SavedReportListItem & {
  teamId: string;
  rangePreset: string;
  customFromDate: string;
  customToDate: string;
  fieldIds: string[];
  excludedEntryIds: string[];
  createdAt: string;
};

export type SavedReportActivityRecord = {
  id: string;
  action: AgencyOpsReportActivityAction;
  payload: Record<string, unknown>;
  actorUserName: string;
  createdAt: string;
};

function parseIsoDateTime(value: string, fieldName: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ORPCError("BAD_REQUEST", { message: `Invalid ${fieldName}.` });
  }
  return parsed;
}

function mapReportRow(
  row: typeof agencyOpsReport.$inferSelect,
  createdByUserName: string,
): SavedReportRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    name: row.name,
    rangePreset: row.rangePreset,
    customFromDate: row.customFromDate,
    customToDate: row.customToDate,
    rangeFrom: row.rangeFrom.toISOString(),
    rangeTo: row.rangeTo.toISOString(),
    clientId: row.clientId,
    projectId: row.projectId,
    memberUserId: row.memberUserId,
    fieldIds: row.fieldIds,
    excludedEntryIds: row.excludedEntryIds,
    createdByUserName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getReportForTeam(teamId: string, reportId: string) {
  const [row] = await db
    .select({ report: agencyOpsReport, createdByUserName: user.name })
    .from(agencyOpsReport)
    .innerJoin(user, eq(user.id, agencyOpsReport.createdByUserId))
    .where(and(eq(agencyOpsReport.id, reportId), eq(agencyOpsReport.teamId, teamId)))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND");
  }

  return row;
}

export async function createSavedReport(
  actorUserId: string,
  input: SavedReportSnapshotInput,
): Promise<SavedReportRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const now = new Date();
  const reportId = createWorkspaceId("agency-report");
  const activityId = createWorkspaceId("agency-report-act");

  await db.transaction(async (tx) => {
    await tx.insert(agencyOpsReport).values({
      id: reportId,
      teamId: input.teamId,
      name: input.name.trim(),
      rangePreset: input.rangePreset,
      customFromDate: input.customFromDate ?? "",
      customToDate: input.customToDate ?? "",
      rangeFrom: parseIsoDateTime(input.rangeFrom, "rangeFrom"),
      rangeTo: parseIsoDateTime(input.rangeTo, "rangeTo"),
      clientId: input.clientId ?? "",
      projectId: input.projectId ?? "",
      memberUserId: input.memberUserId ?? "",
      fieldIds: input.fieldIds,
      excludedEntryIds: [],
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(agencyOpsReportActivity).values({
      id: activityId,
      reportId,
      actorUserId,
      action: "created",
      payload: { name: input.name.trim() },
      createdAt: now,
    });
  });

  const row = await getReportForTeam(input.teamId, reportId);
  return mapReportRow(row.report, row.createdByUserName);
}

export async function listSavedReports(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ items: SavedReportListItem[] }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const rows = await db
    .select({
      report: agencyOpsReport,
      createdByUserName: user.name,
    })
    .from(agencyOpsReport)
    .innerJoin(user, eq(user.id, agencyOpsReport.createdByUserId))
    .where(eq(agencyOpsReport.teamId, input.teamId))
    .orderBy(desc(agencyOpsReport.updatedAt));

  return {
    items: rows.map((row) => ({
      id: row.report.id,
      name: row.report.name,
      rangeFrom: row.report.rangeFrom.toISOString(),
      rangeTo: row.report.rangeTo.toISOString(),
      clientId: row.report.clientId,
      projectId: row.report.projectId,
      memberUserId: row.report.memberUserId,
      createdByUserName: row.createdByUserName,
      updatedAt: row.report.updatedAt.toISOString(),
    })),
  };
}

export async function getSavedReport(
  actorUserId: string,
  input: { teamId: string; reportId: string },
): Promise<SavedReportRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  const row = await getReportForTeam(input.teamId, input.reportId);
  return mapReportRow(row.report, row.createdByUserName);
}

export async function updateSavedReport(
  actorUserId: string,
  input: {
    teamId: string;
    reportId: string;
    name?: string;
    excludedEntryIds?: string[];
    actions?: SavedReportActivityInput[];
  },
): Promise<SavedReportRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const existing = await getReportForTeam(input.teamId, input.reportId);
  const now = new Date();

  const patch: Partial<typeof agencyOpsReport.$inferInsert> = {
    updatedByUserId: actorUserId,
    updatedAt: now,
  };

  if (input.name !== undefined) {
    patch.name = input.name.trim();
  }
  if (input.excludedEntryIds !== undefined) {
    patch.excludedEntryIds = input.excludedEntryIds;
  }

  const hasRowPatch = input.name !== undefined || input.excludedEntryIds !== undefined;
  const activities = input.actions ?? [];

  if (!hasRowPatch && activities.length === 0) {
    return mapReportRow(existing.report, existing.createdByUserName);
  }

  await db.transaction(async (tx) => {
    if (hasRowPatch) {
      await tx
        .update(agencyOpsReport)
        .set(patch)
        .where(
          and(eq(agencyOpsReport.id, input.reportId), eq(agencyOpsReport.teamId, input.teamId)),
        );
    }

    if (activities.length > 0) {
      await tx.insert(agencyOpsReportActivity).values(
        activities.map((activity) => ({
          id: createWorkspaceId("agency-report-act"),
          reportId: input.reportId,
          actorUserId,
          action: activity.action,
          payload: activity.payload ?? {},
          createdAt: now,
        })),
      );
    }
  });

  const row = await getReportForTeam(input.teamId, input.reportId);
  return mapReportRow(row.report, row.createdByUserName);
}

export async function deleteSavedReport(
  actorUserId: string,
  input: { teamId: string; reportId: string },
): Promise<{ reportId: string; deleted: boolean }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const [deleted] = await db
    .delete(agencyOpsReport)
    .where(and(eq(agencyOpsReport.id, input.reportId), eq(agencyOpsReport.teamId, input.teamId)))
    .returning({ id: agencyOpsReport.id });

  if (!deleted) {
    throw new ORPCError("NOT_FOUND");
  }

  return { reportId: deleted.id, deleted: true };
}

export async function listSavedReportActivity(
  actorUserId: string,
  input: { teamId: string; reportId: string; limit?: number },
): Promise<{ items: SavedReportActivityRecord[] }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  await getReportForTeam(input.teamId, input.reportId);

  const limit = Math.min(input.limit ?? 50, 50);

  const rows = await db
    .select({
      activity: agencyOpsReportActivity,
      actorUserName: user.name,
    })
    .from(agencyOpsReportActivity)
    .innerJoin(user, eq(user.id, agencyOpsReportActivity.actorUserId))
    .where(eq(agencyOpsReportActivity.reportId, input.reportId))
    .orderBy(desc(agencyOpsReportActivity.createdAt))
    .limit(limit);

  return {
    items: rows.map((row) => ({
      id: row.activity.id,
      action: row.activity.action,
      payload: row.activity.payload,
      actorUserName: row.actorUserName,
      createdAt: row.activity.createdAt.toISOString(),
    })),
  };
}
