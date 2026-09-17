import { ORPCError } from "@orpc/server";
import { db } from "@orch/db";
import { agencyOpsProjectTemplate } from "@orch/db/schema";
import type { AgencyOpsProjectTemplateMilestone } from "@orch/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { createWorkspaceId } from "@orch/workspace";
import { requireAgencyRole } from "../shared/membership";

export type AgencyProjectTemplateRecord = {
  id: string;
  teamId: string;
  name: string;
  milestones: AgencyOpsProjectTemplateMilestone[];
  milestoneCount: number;
  createdAt: string;
  updatedAt: string;
};

function mapTemplateRow(row: {
  id: string;
  teamId: string;
  name: string;
  milestones: AgencyOpsProjectTemplateMilestone[];
  createdAt: Date;
  updatedAt: Date;
}): AgencyProjectTemplateRecord {
  const milestones = Array.isArray(row.milestones) ? row.milestones : [];
  return {
    id: row.id,
    teamId: row.teamId,
    name: row.name,
    milestones,
    milestoneCount: milestones.length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeMilestones(
  milestones: Array<{ title: string; assigneeUserIds?: string[] }>,
): AgencyOpsProjectTemplateMilestone[] {
  return milestones.map((milestone) => ({
    title: milestone.title.trim(),
    assigneeUserIds: [...new Set(milestone.assigneeUserIds ?? [])],
  }));
}

export async function listAgencyProjectTemplates(actorUserId: string, input: { teamId: string }) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const rows = await db
    .select({
      id: agencyOpsProjectTemplate.id,
      teamId: agencyOpsProjectTemplate.teamId,
      name: agencyOpsProjectTemplate.name,
      milestones: agencyOpsProjectTemplate.milestones,
      createdAt: agencyOpsProjectTemplate.createdAt,
      updatedAt: agencyOpsProjectTemplate.updatedAt,
    })
    .from(agencyOpsProjectTemplate)
    .where(eq(agencyOpsProjectTemplate.teamId, input.teamId))
    .orderBy(asc(agencyOpsProjectTemplate.name));

  return { items: rows.map(mapTemplateRow) };
}

export async function getAgencyProjectTemplateForTeam(
  actorUserId: string,
  input: { teamId: string; templateId: string },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const [row] = await db
    .select({
      id: agencyOpsProjectTemplate.id,
      teamId: agencyOpsProjectTemplate.teamId,
      name: agencyOpsProjectTemplate.name,
      milestones: agencyOpsProjectTemplate.milestones,
      createdAt: agencyOpsProjectTemplate.createdAt,
      updatedAt: agencyOpsProjectTemplate.updatedAt,
    })
    .from(agencyOpsProjectTemplate)
    .where(
      and(
        eq(agencyOpsProjectTemplate.id, input.templateId),
        eq(agencyOpsProjectTemplate.teamId, input.teamId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Project template was not found." });
  }

  return mapTemplateRow(row);
}

export async function createAgencyProjectTemplate(
  actorUserId: string,
  input: {
    teamId: string;
    name: string;
    milestones: Array<{ title: string; assigneeUserIds?: string[] }>;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const name = input.name.trim();
  if (!name) {
    throw new ORPCError("BAD_REQUEST", { message: "Template name is required." });
  }

  const milestones = normalizeMilestones(input.milestones);
  if (milestones.length === 0 || milestones.some((m) => !m.title)) {
    throw new ORPCError("BAD_REQUEST", { message: "Add at least one milestone with a title." });
  }

  const now = new Date();
  const [created] = await db
    .insert(agencyOpsProjectTemplate)
    .values({
      id: createWorkspaceId("agency-project-template"),
      teamId: input.teamId,
      name,
      milestones,
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: agencyOpsProjectTemplate.id,
      teamId: agencyOpsProjectTemplate.teamId,
      name: agencyOpsProjectTemplate.name,
      milestones: agencyOpsProjectTemplate.milestones,
      createdAt: agencyOpsProjectTemplate.createdAt,
      updatedAt: agencyOpsProjectTemplate.updatedAt,
    });

  if (!created) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return mapTemplateRow(created);
}

export async function updateAgencyProjectTemplate(
  actorUserId: string,
  input: {
    teamId: string;
    templateId: string;
    name?: string;
    milestones?: Array<{ title: string; assigneeUserIds?: string[] }>;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  await getAgencyProjectTemplateForTeam(actorUserId, {
    teamId: input.teamId,
    templateId: input.templateId,
  });

  const patch: {
    name?: string;
    milestones?: AgencyOpsProjectTemplateMilestone[];
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new ORPCError("BAD_REQUEST", { message: "Template name is required." });
    }
    patch.name = name;
  }

  if (input.milestones !== undefined) {
    const milestones = normalizeMilestones(input.milestones);
    if (milestones.length === 0 || milestones.some((m) => !m.title)) {
      throw new ORPCError("BAD_REQUEST", { message: "Add at least one milestone with a title." });
    }
    patch.milestones = milestones;
  }

  const [updated] = await db
    .update(agencyOpsProjectTemplate)
    .set(patch)
    .where(
      and(
        eq(agencyOpsProjectTemplate.id, input.templateId),
        eq(agencyOpsProjectTemplate.teamId, input.teamId),
      ),
    )
    .returning({
      id: agencyOpsProjectTemplate.id,
      teamId: agencyOpsProjectTemplate.teamId,
      name: agencyOpsProjectTemplate.name,
      milestones: agencyOpsProjectTemplate.milestones,
      createdAt: agencyOpsProjectTemplate.createdAt,
      updatedAt: agencyOpsProjectTemplate.updatedAt,
    });

  if (!updated) throw new ORPCError("NOT_FOUND");
  return mapTemplateRow(updated);
}

export async function deleteAgencyProjectTemplate(
  actorUserId: string,
  input: { teamId: string; templateId: string },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  await getAgencyProjectTemplateForTeam(actorUserId, {
    teamId: input.teamId,
    templateId: input.templateId,
  });

  await db
    .delete(agencyOpsProjectTemplate)
    .where(
      and(
        eq(agencyOpsProjectTemplate.id, input.templateId),
        eq(agencyOpsProjectTemplate.teamId, input.teamId),
      ),
    );

  return { templateId: input.templateId, deleted: true };
}
