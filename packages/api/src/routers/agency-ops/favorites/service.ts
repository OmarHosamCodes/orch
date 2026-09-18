import { ORPCError } from "@orpc/server";
import { db } from "@orch/db";
import { agencyOpsProject, agencyOpsProjectTask, agencyOpsUserFavorite } from "@orch/db/schema";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { createWorkspaceId } from "@orch/workspace";
import { requireAgencyRole } from "../shared/membership";
import { getProjectByIdForTeam } from "../shared/lookup-helpers";

export type AgencyFavoritesRecord = {
  projectIds: string[];
  taskIds: string[];
};

async function listFavoriteRows(teamId: string, userId: string) {
  return db
    .select({
      kind: agencyOpsUserFavorite.kind,
      projectId: agencyOpsUserFavorite.projectId,
      taskId: agencyOpsUserFavorite.taskId,
    })
    .from(agencyOpsUserFavorite)
    .where(and(eq(agencyOpsUserFavorite.teamId, teamId), eq(agencyOpsUserFavorite.userId, userId)))
    .orderBy(asc(agencyOpsUserFavorite.sortOrder), asc(agencyOpsUserFavorite.createdAt));
}

function mapFavoriteRows(
  rows: Array<{
    kind: "project" | "task";
    projectId: string | null;
    taskId: string | null;
  }>,
): AgencyFavoritesRecord {
  const projectIds: string[] = [];
  const taskIds: string[] = [];
  for (const row of rows) {
    if (row.kind === "project" && row.projectId) projectIds.push(row.projectId);
    if (row.kind === "task" && row.taskId) taskIds.push(row.taskId);
  }
  return { projectIds, taskIds };
}

async function nextFavoriteSortOrder(teamId: string, userId: string) {
  const rows = await db
    .select({ sortOrder: agencyOpsUserFavorite.sortOrder })
    .from(agencyOpsUserFavorite)
    .where(and(eq(agencyOpsUserFavorite.teamId, teamId), eq(agencyOpsUserFavorite.userId, userId)));
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}

export async function listAgencyFavorites(
  actorUserId: string,
  input: { teamId: string },
): Promise<AgencyFavoritesRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");
  const mapped = mapFavoriteRows(await listFavoriteRows(input.teamId, actorUserId));
  if (mapped.projectIds.length === 0) return mapped;

  const activeProjects = await db
    .select({ id: agencyOpsProject.id })
    .from(agencyOpsProject)
    .where(
      and(
        eq(agencyOpsProject.teamId, input.teamId),
        inArray(agencyOpsProject.id, mapped.projectIds),
        isNull(agencyOpsProject.deletedAt),
      ),
    );
  const activeIds = new Set(activeProjects.map((row) => row.id));
  return {
    ...mapped,
    projectIds: mapped.projectIds.filter((id) => activeIds.has(id)),
  };
}

export async function toggleAgencyFavorite(
  actorUserId: string,
  input: {
    teamId: string;
    kind: "project" | "task";
    projectId?: string;
    taskId?: string;
  },
): Promise<AgencyFavoritesRecord & { favorited: boolean }> {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  if (input.kind === "project") {
    if (!input.projectId) {
      throw new ORPCError("BAD_REQUEST", { message: "projectId is required." });
    }

    await getProjectByIdForTeam(input.teamId, input.projectId);

    const [existing] = await db
      .select({ id: agencyOpsUserFavorite.id })
      .from(agencyOpsUserFavorite)
      .where(
        and(
          eq(agencyOpsUserFavorite.teamId, input.teamId),
          eq(agencyOpsUserFavorite.userId, actorUserId),
          eq(agencyOpsUserFavorite.kind, "project"),
          eq(agencyOpsUserFavorite.projectId, input.projectId),
        ),
      )
      .limit(1);

    if (existing) {
      await db.delete(agencyOpsUserFavorite).where(eq(agencyOpsUserFavorite.id, existing.id));
      return {
        ...mapFavoriteRows(await listFavoriteRows(input.teamId, actorUserId)),
        favorited: false,
      };
    }

    await db.insert(agencyOpsUserFavorite).values({
      id: createWorkspaceId("agency-favorite"),
      teamId: input.teamId,
      userId: actorUserId,
      kind: "project",
      projectId: input.projectId,
      taskId: null,
      sortOrder: await nextFavoriteSortOrder(input.teamId, actorUserId),
      createdAt: new Date(),
    });

    return {
      ...mapFavoriteRows(await listFavoriteRows(input.teamId, actorUserId)),
      favorited: true,
    };
  }

  if (!input.taskId) {
    throw new ORPCError("BAD_REQUEST", { message: "taskId is required." });
  }

  const [task] = await db
    .select({ id: agencyOpsProjectTask.id })
    .from(agencyOpsProjectTask)
    .where(
      and(eq(agencyOpsProjectTask.id, input.taskId), eq(agencyOpsProjectTask.teamId, input.teamId)),
    )
    .limit(1);
  if (!task) {
    throw new ORPCError("NOT_FOUND", { message: "Task was not found." });
  }

  const [existing] = await db
    .select({ id: agencyOpsUserFavorite.id })
    .from(agencyOpsUserFavorite)
    .where(
      and(
        eq(agencyOpsUserFavorite.teamId, input.teamId),
        eq(agencyOpsUserFavorite.userId, actorUserId),
        eq(agencyOpsUserFavorite.kind, "task"),
        eq(agencyOpsUserFavorite.taskId, input.taskId),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(agencyOpsUserFavorite).where(eq(agencyOpsUserFavorite.id, existing.id));
    return {
      ...mapFavoriteRows(await listFavoriteRows(input.teamId, actorUserId)),
      favorited: false,
    };
  }

  await db.insert(agencyOpsUserFavorite).values({
    id: createWorkspaceId("agency-favorite"),
    teamId: input.teamId,
    userId: actorUserId,
    kind: "task",
    projectId: null,
    taskId: input.taskId,
    sortOrder: await nextFavoriteSortOrder(input.teamId, actorUserId),
    createdAt: new Date(),
  });

  return {
    ...mapFavoriteRows(await listFavoriteRows(input.teamId, actorUserId)),
    favorited: true,
  };
}
