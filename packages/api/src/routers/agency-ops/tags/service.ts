import { ORPCError } from "@orpc/server";
import { db } from "@orch/db";
import { agencyOpsTag } from "@orch/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { createWorkspaceId } from "@orch/workspace";
import { requireAgencyRole } from "../shared/membership";

type AgencyTagRecord = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

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

export async function listAgencyTags(actorUserId: string, input: { teamId: string }) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const rows = await db
    .select({
      id: agencyOpsTag.id,
      teamId: agencyOpsTag.teamId,
      name: agencyOpsTag.name,
      createdAt: agencyOpsTag.createdAt,
      updatedAt: agencyOpsTag.updatedAt,
    })
    .from(agencyOpsTag)
    .where(eq(agencyOpsTag.teamId, input.teamId))
    .orderBy(asc(agencyOpsTag.name));

  return { items: rows.map(mapAgencyTagRow) };
}

export async function createAgencyTag(
  actorUserId: string,
  input: { teamId: string; name: string },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const now = new Date();
  const [created] = await db
    .insert(agencyOpsTag)
    .values({
      id: createWorkspaceId("agency-tag"),
      teamId: input.teamId,
      name: input.name.trim(),
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: agencyOpsTag.id,
      teamId: agencyOpsTag.teamId,
      name: agencyOpsTag.name,
      createdAt: agencyOpsTag.createdAt,
      updatedAt: agencyOpsTag.updatedAt,
    });

  if (!created) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return mapAgencyTagRow(created);
}

export async function deleteAgencyTag(
  actorUserId: string,
  input: { teamId: string; tagId: string },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const [tag] = await db
    .select({ id: agencyOpsTag.id })
    .from(agencyOpsTag)
    .where(and(eq(agencyOpsTag.id, input.tagId), eq(agencyOpsTag.teamId, input.teamId)))
    .limit(1);

  if (!tag) throw new ORPCError("NOT_FOUND", { message: "Tag was not found." });

  await db.delete(agencyOpsTag).where(eq(agencyOpsTag.id, input.tagId));
  return { tagId: input.tagId, deleted: true };
}
