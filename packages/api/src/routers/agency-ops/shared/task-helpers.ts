import { db } from "@orch/db";
import {
  user,
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsProjectTaskBlueprint,
  agencyOpsProjectTaskMemberStatus,
  agencyOpsProjectTaskAssignee,
  agencyOpsProjectTask,
} from "@orch/db/schema";
import { and, inArray, eq, asc } from "drizzle-orm";
import type { AgencyProjectTask } from "../../../schemas/agency-ops";
import { formatAvatarUrl } from "./avatar-helpers";
import { readStoredEntityIcon } from "./entity-icon-catalog";

export type AgencyProjectTaskAssigneeRecord = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  status: "open" | "in_progress" | "done";
};

export type AgencyProjectTaskBlueprintRecord = {
  id: string;
  description: string;
};

export type AgencyProjectTaskRecord = AgencyProjectTask;

export type MemberStatusEntry = {
  status: "open" | "in_progress" | "done";
  completionCount: number;
};

export function mapProjectTaskRow(row: {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  iconKey: string | null;
  iconSource: string;
  status: "open" | "in_progress" | "done" | "archived";
  taskKind: "standard" | "journey_anchor" | "journey_milestone";
  assignedToTeam: boolean;
  isWaste: boolean;
  estimateMinutes: number | null;
  billableRateAmount: number | null;
  sourceBillableRateAmount: number | null;
  currency: string;
  projectBillableRateAmount: number | null;
  projectSourceBillableRateAmount: number | null;
  projectCurrency: string;
  clientBillableRateAmount: number | null;
  clientSourceBillableRateAmount: number | null;
  clientCurrency: string;
  createdByUserId: string;
  assignees: AgencyProjectTaskAssigneeRecord[];
  viewerStatus?: "open" | "in_progress" | "done";
  viewerCompletionCount?: number;
  viewerBlueprints?: AgencyProjectTaskBlueprintRecord[];
  totalTrackedSeconds?: number;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AgencyProjectTaskRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    projectId: row.projectId,
    title: row.title,
    ...readStoredEntityIcon(row),
    status: row.status,
    taskKind: row.taskKind,
    assignedToTeam: row.assignedToTeam,
    isWaste: row.isWaste,
    estimateMinutes: row.estimateMinutes,
    billableRateAmount: row.billableRateAmount,
    sourceBillableRateAmount: row.sourceBillableRateAmount,
    currency: row.currency,
    projectBillableRateAmount: row.projectBillableRateAmount,
    projectSourceBillableRateAmount: row.projectSourceBillableRateAmount,
    projectCurrency: row.projectCurrency,
    clientBillableRateAmount: row.clientBillableRateAmount,
    clientSourceBillableRateAmount: row.clientSourceBillableRateAmount,
    clientCurrency: row.clientCurrency,
    createdByUserId: row.createdByUserId,
    assignees: row.assignees,
    ...(row.viewerStatus !== undefined ? { viewerStatus: row.viewerStatus } : {}),
    ...(row.viewerCompletionCount !== undefined
      ? { viewerCompletionCount: row.viewerCompletionCount }
      : {}),
    ...(row.viewerBlueprints !== undefined ? { viewerBlueprints: row.viewerBlueprints } : {}),
    ...(row.totalTrackedSeconds !== undefined
      ? { totalTrackedSeconds: row.totalTrackedSeconds }
      : {}),
    dueDate: row.dueDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadTaskBlueprintsForViewer(
  taskIds: string[],
  viewerUserId: string,
): Promise<Map<string, AgencyProjectTaskBlueprintRecord[]>> {
  const result = new Map<string, AgencyProjectTaskBlueprintRecord[]>();
  if (taskIds.length === 0 || !viewerUserId) return result;

  const rows = await db
    .select({
      id: agencyOpsProjectTaskBlueprint.id,
      taskId: agencyOpsProjectTaskBlueprint.taskId,
      description: agencyOpsProjectTaskBlueprint.description,
    })
    .from(agencyOpsProjectTaskBlueprint)
    .where(
      and(
        inArray(agencyOpsProjectTaskBlueprint.taskId, taskIds),
        eq(agencyOpsProjectTaskBlueprint.userId, viewerUserId),
      ),
    )
    .orderBy(asc(agencyOpsProjectTaskBlueprint.createdAt));

  for (const row of rows) {
    const existing = result.get(row.taskId) ?? [];
    existing.push({ id: row.id, description: row.description });
    result.set(row.taskId, existing);
  }

  return result;
}

export async function loadTaskMemberStatuses(
  taskIds: string[],
): Promise<Map<string, Map<string, MemberStatusEntry>>> {
  const result = new Map<string, Map<string, MemberStatusEntry>>();
  if (taskIds.length === 0) return result;

  const rows = await db
    .select({
      taskId: agencyOpsProjectTaskMemberStatus.taskId,
      userId: agencyOpsProjectTaskMemberStatus.userId,
      status: agencyOpsProjectTaskMemberStatus.status,
      completionCount: agencyOpsProjectTaskMemberStatus.completionCount,
    })
    .from(agencyOpsProjectTaskMemberStatus)
    .where(inArray(agencyOpsProjectTaskMemberStatus.taskId, taskIds));

  for (const row of rows) {
    const byUser = result.get(row.taskId) ?? new Map<string, MemberStatusEntry>();
    byUser.set(row.userId, {
      status: row.status,
      completionCount: row.completionCount,
    });
    result.set(row.taskId, byUser);
  }

  return result;
}

export async function loadTaskAssignees(
  taskIds: string[],
): Promise<Map<string, AgencyProjectTaskAssigneeRecord[]>> {
  const result = new Map<string, AgencyProjectTaskAssigneeRecord[]>();
  if (taskIds.length === 0) return result;

  const memberStatuses = await loadTaskMemberStatuses(taskIds);

  const rows = await db
    .select({
      taskId: agencyOpsProjectTaskAssignee.taskId,
      userId: agencyOpsProjectTaskAssignee.userId,
      userName: user.name,
      userAvatar: user.image,
    })
    .from(agencyOpsProjectTaskAssignee)
    .innerJoin(user, eq(user.id, agencyOpsProjectTaskAssignee.userId))
    .where(inArray(agencyOpsProjectTaskAssignee.taskId, taskIds))
    .orderBy(asc(user.name));

  for (const row of rows) {
    const assignees = result.get(row.taskId) ?? [];
    assignees.push({
      userId: row.userId,
      userName: row.userName ?? "Unknown",
      userAvatar: formatAvatarUrl(row.userAvatar),
      status: memberStatuses.get(row.taskId)?.get(row.userId)?.status ?? "open",
    });
    result.set(row.taskId, assignees);
  }

  return result;
}

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function upsertTaskMemberStatus(
  tx: DbTransaction,
  taskId: string,
  userId: string,
  status: "open" | "in_progress" | "done",
) {
  const now = new Date();
  await tx
    .insert(agencyOpsProjectTaskMemberStatus)
    .values({
      taskId,
      userId,
      status,
      completedAt: status === "done" ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsProjectTaskMemberStatus.taskId, agencyOpsProjectTaskMemberStatus.userId],
      set: {
        status,
        completedAt: status === "done" ? now : null,
        updatedAt: now,
      },
    });
}

export async function setTaskMemberStatusesForUsers(
  tx: DbTransaction,
  taskId: string,
  userIds: string[],
  status: "open" | "in_progress" | "done" = "open",
) {
  for (const userId of userIds) {
    await upsertTaskMemberStatus(tx, taskId, userId, status);
  }
}

export async function deleteTaskMemberStatusesForUsers(
  tx: DbTransaction,
  taskId: string,
  userIds: string[],
) {
  if (userIds.length === 0) return;
  await tx
    .delete(agencyOpsProjectTaskMemberStatus)
    .where(
      and(
        eq(agencyOpsProjectTaskMemberStatus.taskId, taskId),
        inArray(agencyOpsProjectTaskMemberStatus.userId, userIds),
      ),
    );
}

export function resolveViewerMemberStatus(
  task: {
    status: "open" | "in_progress" | "done" | "archived";
    assignedToTeam: boolean;
  },
  memberStatuses: Map<string, MemberStatusEntry> | undefined,
  viewerUserId: string,
): "open" | "in_progress" | "done" {
  if (task.status === "archived") return "done";
  return memberStatuses?.get(viewerUserId)?.status ?? "open";
}

export function resolveViewerCompletionCount(
  memberStatuses: Map<string, MemberStatusEntry> | undefined,
  viewerUserId: string,
): number {
  return memberStatuses?.get(viewerUserId)?.completionCount ?? 0;
}

export async function buildProjectTaskRecord(
  row: {
    id: string;
    teamId: string;
    projectId: string;
    title: string;
    iconKey: string | null;
    iconSource: string;
    status: "open" | "in_progress" | "done" | "archived";
    taskKind: "standard" | "journey_anchor" | "journey_milestone";
    assignedToTeam: boolean;
    isWaste: boolean;
    estimateMinutes: number | null;
    billableRateAmount: number | null;
    sourceBillableRateAmount: number | null;
    currency: string;
    projectBillableRateAmount: number | null;
    projectSourceBillableRateAmount: number | null;
    projectCurrency: string;
    clientBillableRateAmount: number | null;
    clientSourceBillableRateAmount: number | null;
    clientCurrency: string;
    createdByUserId: string;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  assignees: AgencyProjectTaskAssigneeRecord[],
  viewerUserId?: string,
  memberStatuses?: Map<string, MemberStatusEntry>,
  viewerBlueprints?: AgencyProjectTaskBlueprintRecord[],
): Promise<AgencyProjectTaskRecord> {
  return mapProjectTaskRow({
    ...row,
    assignees,
    ...(viewerUserId
      ? {
          viewerStatus: resolveViewerMemberStatus(row, memberStatuses, viewerUserId),
          viewerCompletionCount: resolveViewerCompletionCount(memberStatuses, viewerUserId),
          viewerBlueprints: viewerBlueprints ?? [],
        }
      : {}),
  });
}

export async function setTaskAssignees(tx: DbTransaction, taskId: string, userIds: string[]) {
  const existingRows = await tx
    .select({ userId: agencyOpsProjectTaskAssignee.userId })
    .from(agencyOpsProjectTaskAssignee)
    .where(eq(agencyOpsProjectTaskAssignee.taskId, taskId));
  const existingUserIds = existingRows.map((row) => row.userId);

  await tx
    .delete(agencyOpsProjectTaskAssignee)
    .where(eq(agencyOpsProjectTaskAssignee.taskId, taskId));

  const uniqueUserIds = [...new Set(userIds)];
  const removedUserIds = existingUserIds.filter((userId) => !uniqueUserIds.includes(userId));
  const addedUserIds = uniqueUserIds.filter((userId) => !existingUserIds.includes(userId));

  if (removedUserIds.length > 0) {
    await deleteTaskMemberStatusesForUsers(tx, taskId, removedUserIds);
  }

  if (uniqueUserIds.length === 0) return;

  await tx.insert(agencyOpsProjectTaskAssignee).values(
    uniqueUserIds.map((userId) => ({
      taskId,
      userId,
    })),
  );

  if (addedUserIds.length > 0) {
    await setTaskMemberStatusesForUsers(tx, taskId, addedUserIds, "open");
  }
}

export const projectTaskColumns = {
  id: agencyOpsProjectTask.id,
  teamId: agencyOpsProjectTask.teamId,
  projectId: agencyOpsProjectTask.projectId,
  title: agencyOpsProjectTask.title,
  iconKey: agencyOpsProjectTask.iconKey,
  iconSource: agencyOpsProjectTask.iconSource,
  status: agencyOpsProjectTask.status,
  taskKind: agencyOpsProjectTask.taskKind,
  assignedToTeam: agencyOpsProjectTask.assignedToTeam,
  isWaste: agencyOpsProjectTask.isWaste,
  estimateMinutes: agencyOpsProjectTask.estimateMinutes,
  billableRateAmount: agencyOpsProjectTask.billableRateAmount,
  sourceBillableRateAmount: agencyOpsProjectTask.sourceBillableRateAmount,
  currency: agencyOpsProjectTask.currency,
  createdByUserId: agencyOpsProjectTask.createdByUserId,
  dueDate: agencyOpsProjectTask.dueDate,
  createdAt: agencyOpsProjectTask.createdAt,
  updatedAt: agencyOpsProjectTask.updatedAt,
} as const;

export const projectTaskSelectWithParentRates = {
  ...projectTaskColumns,
  projectBillableRateAmount: agencyOpsProject.billableRateAmount,
  projectSourceBillableRateAmount: agencyOpsProject.sourceBillableRateAmount,
  projectCurrency: agencyOpsProject.currency,
  clientBillableRateAmount: agencyOpsClient.billableRateAmount,
  clientSourceBillableRateAmount: agencyOpsClient.sourceBillableRateAmount,
  clientCurrency: agencyOpsClient.currency,
} as const;

export type ProjectTaskRow = {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  iconKey: string | null;
  iconSource: string;
  status: "open" | "in_progress" | "done" | "archived";
  taskKind: "standard" | "journey_anchor" | "journey_milestone";
  assignedToTeam: boolean;
  isWaste: boolean;
  estimateMinutes: number | null;
  billableRateAmount: number | null;
  sourceBillableRateAmount: number | null;
  currency: string;
  createdByUserId: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectTaskRowWithParentRates = ProjectTaskRow & {
  projectBillableRateAmount: number | null;
  projectSourceBillableRateAmount: number | null;
  projectCurrency: string;
  clientBillableRateAmount: number | null;
  clientSourceBillableRateAmount: number | null;
  clientCurrency: string;
};

export async function attachParentRates(
  rows: ProjectTaskRow[],
): Promise<ProjectTaskRowWithParentRates[]> {
  if (rows.length === 0) return [];
  const projectIds = [...new Set(rows.map((row) => row.projectId))];
  const projects = await db
    .select({
      id: agencyOpsProject.id,
      billableRateAmount: agencyOpsProject.billableRateAmount,
      sourceBillableRateAmount: agencyOpsProject.sourceBillableRateAmount,
      currency: agencyOpsProject.currency,
      clientBillableRateAmount: agencyOpsClient.billableRateAmount,
      clientSourceBillableRateAmount: agencyOpsClient.sourceBillableRateAmount,
      clientCurrency: agencyOpsClient.currency,
    })
    .from(agencyOpsProject)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(inArray(agencyOpsProject.id, projectIds));
  const byId = new Map(projects.map((project) => [project.id, project]));
  return rows.map((row) => {
    const parent = byId.get(row.projectId);
    return {
      ...row,
      projectBillableRateAmount: parent?.billableRateAmount ?? null,
      projectSourceBillableRateAmount: parent?.sourceBillableRateAmount ?? null,
      projectCurrency: parent?.currency ?? "USD",
      clientBillableRateAmount: parent?.clientBillableRateAmount ?? null,
      clientSourceBillableRateAmount: parent?.clientSourceBillableRateAmount ?? null,
      clientCurrency: parent?.clientCurrency ?? "USD",
    };
  });
}
