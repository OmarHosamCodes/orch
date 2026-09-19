import type { KnowledgeAction } from "@orch/agent/knowledge-actions";
import { db } from "@orch/db";
import {
  dashboardWorkspace,
  workspaceObject,
  workspacePlacement,
  workspaceRelation,
  workspaceRevision,
} from "@orch/db/schema";
import {
  createWorkspaceId,
  defaultKnowledgePlacementSize,
  isAgencyObjectType,
  isCanvasNativeObjectType,
  knowledgeBoardCardSchema,
  knowledgeChipLabel,
  knowledgeFolderPropertiesSchema,
  knowledgeObjectHref,
  knowledgeObjectSchema,
  knowledgeObjectTypeSchema,
  knowledgeRelationSchema,
  knowledgeSourcePropertiesSchema,
  knowledgeToWorkspaceNode,
  parseKnowledgeSourceProperties,
  shouldProjectIntoWorkspaceBlob,
  WORKSPACE_NODE_LIMIT,
  workspaceNodeToKnowledge,
  type KnowledgeBoardCard,
  type KnowledgeObject,
  type KnowledgeObjectType,
  type KnowledgeObjectView,
  type KnowledgePlacement,
  type KnowledgeRelation,
  type WorkspaceNode,
} from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";

import { requireTeamMembership } from "../../lib/team-membership";
import {
  listCanvasWorkspaceTitleMap,
  requireOwnedCanvasWorkspace,
} from "./canvas-workspace-service";
import {
  assertAgencyTargetExists,
  getAgencyKnowledgeView,
  listAgencyKnowledgeViews,
} from "./knowledge-agency";

type QueryInput = {
  canvasWorkspaceId?: string | null;
  teamId?: string;
  objectType?: KnowledgeObjectType;
  query?: string;
  about?: { objectType: KnowledgeObjectType; id: string };
  limit?: number;
  includePlaced?: boolean;
  includeAgency?: boolean;
};

function toIso(value: Date) {
  return value.toISOString();
}

function rowToObject(row: typeof workspaceObject.$inferSelect): KnowledgeObject {
  return knowledgeObjectSchema.parse({
    id: row.id,
    objectType: row.objectType,
    title: row.title,
    ownerUserId: row.ownerUserId,
    canvasWorkspaceId: row.canvasWorkspaceId,
    visibility: row.visibility,
    teamId: row.teamId,
    properties: row.properties ?? {},
    content: row.content,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  });
}

function rowToRelation(row: typeof workspaceRelation.$inferSelect): KnowledgeRelation {
  return knowledgeRelationSchema.parse({
    id: row.id,
    fromObjectId: row.fromObjectId,
    fromObjectType: row.fromObjectType,
    toObjectType: row.toObjectType,
    toObjectId: row.toObjectId,
    relationType: row.relationType,
    ownerUserId: row.ownerUserId,
    canvasWorkspaceId: row.canvasWorkspaceId,
    teamId: row.teamId,
    properties: row.properties ?? {},
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  });
}

function rowToPlacement(row: typeof workspacePlacement.$inferSelect): KnowledgePlacement {
  return {
    id: row.id,
    objectId: row.objectId,
    canvasWorkspaceId: row.canvasWorkspaceId,
    objectType: row.objectType ? knowledgeObjectTypeSchema.parse(row.objectType) : undefined,
    teamId: row.teamId,
    viewId: row.viewId,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    ownerUserId: row.ownerUserId,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function assertCanReadObject(
  actorUserId: string,
  object: { ownerUserId: string; visibility: string; teamId?: string | null },
) {
  if (object.ownerUserId === actorUserId) return;
  if (object.visibility !== "team" || !object.teamId) {
    throw new ORPCError("NOT_FOUND");
  }
  await requireTeamMembership(actorUserId, object.teamId, "viewer");
}

async function assertCanWriteObject(
  actorUserId: string,
  object: { ownerUserId: string; teamId?: string | null },
) {
  if (object.ownerUserId === actorUserId) return;
  if (!object.teamId) throw new ORPCError("UNAUTHORIZED");
  await requireTeamMembership(actorUserId, object.teamId, "editor");
}

async function attachWorkspaceTitles(actorUserId: string, items: KnowledgeObjectView[]) {
  const ids = items.map((item) => item.canvasWorkspaceId).filter((id): id is string => Boolean(id));
  const titles = await listCanvasWorkspaceTitleMap(actorUserId, { workspaceIds: ids });
  return items.map((item) => ({
    ...item,
    canvasWorkspaceTitle: item.canvasWorkspaceId ? titles.get(item.canvasWorkspaceId) : undefined,
  }));
}

export async function syncKnowledgeFromNodes(
  actorUserId: string,
  input: { canvasWorkspaceId: string; nodes: WorkspaceNode[] },
) {
  void actorUserId;
  const canvasWorkspaceId = input.canvasWorkspaceId;
  await db.transaction(async (tx) => {
    for (const node of input.nodes) {
      const { object, placement, relations } = workspaceNodeToKnowledge(node);
      await tx
        .insert(workspaceObject)
        .values({
          id: object.id,
          ownerUserId: object.ownerUserId,
          canvasWorkspaceId,
          objectType: object.objectType,
          title: object.title,
          visibility: object.visibility,
          teamId: object.teamId ?? null,
          properties: object.properties,
          content: object.content ?? null,
          createdAt: new Date(object.createdAt),
          updatedAt: new Date(object.updatedAt),
        })
        .onConflictDoUpdate({
          target: workspaceObject.id,
          set: {
            title: object.title,
            canvasWorkspaceId,
            visibility: object.visibility,
            teamId: object.teamId ?? null,
            properties: object.properties,
            content: object.content ?? null,
            updatedAt: new Date(object.updatedAt),
          },
        });

      await tx
        .insert(workspacePlacement)
        .values({
          id: placement.id,
          objectId: placement.objectId,
          canvasWorkspaceId,
          objectType: placement.objectType ?? object.objectType,
          teamId: placement.teamId ?? object.teamId ?? null,
          viewId: placement.viewId,
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
          ownerUserId: placement.ownerUserId,
          createdAt: new Date(placement.createdAt),
          updatedAt: new Date(placement.updatedAt),
        })
        .onConflictDoUpdate({
          target: [
            workspacePlacement.objectId,
            workspacePlacement.viewId,
            workspacePlacement.ownerUserId,
          ],
          set: {
            objectType: placement.objectType ?? object.objectType,
            canvasWorkspaceId,
            teamId: placement.teamId ?? object.teamId ?? null,
            x: placement.x,
            y: placement.y,
            width: placement.width,
            height: placement.height,
            updatedAt: new Date(placement.updatedAt),
          },
        });

      await tx
        .delete(workspaceRelation)
        .where(
          and(
            eq(workspaceRelation.fromObjectId, object.id),
            or(
              eq(workspaceRelation.relationType, "related"),
              and(
                eq(workspaceRelation.relationType, "about"),
                inArray(workspaceRelation.toObjectType, ["agency.project", "agency.task"]),
              ),
            ),
          ),
        );

      for (const relation of relations) {
        await tx
          .insert(workspaceRelation)
          .values({
            id: relation.id,
            fromObjectId: relation.fromObjectId,
            canvasWorkspaceId,
            fromObjectType: relation.fromObjectType,
            toObjectType: relation.toObjectType,
            toObjectId: relation.toObjectId,
            relationType: relation.relationType,
            ownerUserId: relation.ownerUserId,
            teamId: relation.teamId ?? null,
            properties: relation.properties,
            createdAt: new Date(relation.createdAt),
            updatedAt: new Date(relation.updatedAt),
          })
          .onConflictDoUpdate({
            target: [
              workspaceRelation.fromObjectId,
              workspaceRelation.toObjectType,
              workspaceRelation.toObjectId,
              workspaceRelation.relationType,
            ],
            set: {
              canvasWorkspaceId,
              teamId: relation.teamId ?? null,
              properties: relation.properties,
              updatedAt: new Date(relation.updatedAt),
            },
          });
      }
    }
  });
}

export async function deleteKnowledgeForNode(actorUserId: string, input: { objectId: string }) {
  const objectId = input.objectId;
  void actorUserId;
  await db.transaction(async (tx) => {
    await tx.delete(workspaceRelation).where(eq(workspaceRelation.fromObjectId, objectId));
    await tx
      .delete(workspaceRelation)
      .where(
        and(
          eq(workspaceRelation.toObjectId, objectId),
          eq(workspaceRelation.toObjectType, "document"),
        ),
      );
    await tx.delete(workspacePlacement).where(eq(workspacePlacement.objectId, objectId));
    await tx.delete(workspaceObject).where(eq(workspaceObject.id, objectId));
  });
}

export async function backfillWorkspaceKnowledge(
  actorUserId: string,
  _input: Record<string, never>,
) {
  void actorUserId;
  const rows = await db.select().from(dashboardWorkspace);
  for (const row of rows) {
    await syncKnowledgeFromNodes(row.ownerUserId, {
      canvasWorkspaceId: row.workspaceId,
      nodes: row.nodes as WorkspaceNode[],
    });
  }
  return { workspaceCount: rows.length };
}

export async function queryKnowledgeObjects(
  actorUserId: string,
  input: QueryInput,
): Promise<{ items: KnowledgeObjectView[] }> {
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  if (input.teamId) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");
  }
  if (input.canvasWorkspaceId) {
    await requireOwnedCanvasWorkspace(actorUserId, {
      canvasWorkspaceId: input.canvasWorkspaceId,
    });
  }

  if (input.objectType && isAgencyObjectType(input.objectType)) {
    if (!input.teamId) {
      throw new ORPCError("BAD_REQUEST", { message: "Agency projections require teamId." });
    }
    const items = await listAgencyKnowledgeViews(actorUserId, {
      teamId: input.teamId,
      objectType: input.objectType,
      query: input.query,
      limit,
    });
    return { items };
  }

  const filters = [];
  if (input.objectType && isCanvasNativeObjectType(input.objectType)) {
    filters.push(eq(workspaceObject.objectType, input.objectType));
  }
  if (input.query?.trim()) {
    filters.push(ilike(workspaceObject.title, `%${input.query.trim()}%`));
  }
  if (input.about) {
    const aboutRows = await db
      .select({ fromObjectId: workspaceRelation.fromObjectId })
      .from(workspaceRelation)
      .where(
        and(
          eq(workspaceRelation.relationType, "about"),
          eq(workspaceRelation.toObjectType, input.about.objectType),
          eq(workspaceRelation.toObjectId, input.about.id),
        ),
      );
    const ids = aboutRows.map((row) => row.fromObjectId);
    if (ids.length === 0) {
      return { items: [] };
    }
    filters.push(inArray(workspaceObject.id, ids));
  }

  const visibilityFilter = input.teamId
    ? or(
        eq(workspaceObject.ownerUserId, actorUserId),
        and(eq(workspaceObject.visibility, "team"), eq(workspaceObject.teamId, input.teamId)),
      )
    : eq(workspaceObject.ownerUserId, actorUserId);

  if (input.canvasWorkspaceId) {
    filters.push(eq(workspaceObject.canvasWorkspaceId, input.canvasWorkspaceId));
  }

  const rows = await db
    .select()
    .from(workspaceObject)
    .where(and(visibilityFilter, ...filters))
    .orderBy(desc(workspaceObject.updatedAt))
    .limit(limit);

  const objectIds = rows.map((row) => row.id);
  const placements =
    input.includePlaced === false || objectIds.length === 0
      ? []
      : await db
          .select()
          .from(workspacePlacement)
          .where(
            and(
              inArray(workspacePlacement.objectId, objectIds),
              eq(workspacePlacement.ownerUserId, actorUserId),
              eq(workspacePlacement.viewId, "board"),
            ),
          );
  const placementByObject = new Map(placements.map((row) => [row.objectId, rowToPlacement(row)]));

  const relationRows =
    objectIds.length === 0
      ? []
      : await db
          .select()
          .from(workspaceRelation)
          .where(
            or(
              inArray(workspaceRelation.fromObjectId, objectIds),
              inArray(workspaceRelation.toObjectId, objectIds),
            ),
          );
  const counts = new Map<string, { in: number; out: number }>();
  for (const id of objectIds) {
    counts.set(id, { in: 0, out: 0 });
  }
  for (const row of relationRows) {
    const out = counts.get(row.fromObjectId);
    if (out) out.out += 1;
    const inbound = counts.get(row.toObjectId);
    if (inbound) inbound.in += 1;
  }

  const canvasItems: KnowledgeObjectView[] = rows.map((row) => ({
    origin: "canvas" as const,
    objectType: knowledgeObjectTypeSchema.parse(row.objectType),
    id: row.id,
    title: row.title,
    canvasWorkspaceId: row.canvasWorkspaceId,
    teamId: row.teamId,
    properties: row.properties ?? {},
    placement: placementByObject.get(row.id) ?? null,
    relationCounts: counts.get(row.id) ?? { in: 0, out: 0 },
  }));
  const titledCanvasItems = await attachWorkspaceTitles(actorUserId, canvasItems);

  if (!input.teamId || input.includeAgency === false || input.objectType || input.about) {
    return { items: titledCanvasItems.slice(0, limit) };
  }

  const remaining = limit - titledCanvasItems.length;
  if (remaining <= 0) {
    return { items: titledCanvasItems.slice(0, limit) };
  }
  const teamId = input.teamId;
  const agencyTypes = [
    "agency.project",
    "agency.task",
    "agency.member",
    "agency.client",
    "agency.timeEntry",
  ] as const;
  const agencyBatches = await Promise.all(
    agencyTypes.map((objectType) =>
      listAgencyKnowledgeViews(actorUserId, {
        teamId,
        objectType,
        query: input.query,
        limit: remaining,
      }),
    ),
  );
  return { items: [...titledCanvasItems, ...agencyBatches.flat()].slice(0, limit) };
}

export async function getKnowledgeObject(
  actorUserId: string,
  input: { id: string; objectType?: KnowledgeObjectType; teamId?: string },
) {
  if (input.objectType && isAgencyObjectType(input.objectType)) {
    if (!input.teamId) {
      throw new ORPCError("BAD_REQUEST", { message: "Agency projections require teamId." });
    }
    await requireTeamMembership(actorUserId, input.teamId, "viewer");
    const view = await getAgencyKnowledgeView(actorUserId, {
      teamId: input.teamId,
      objectType: input.objectType,
      id: input.id,
    });
    const inbound = await db
      .select()
      .from(workspaceRelation)
      .where(
        and(
          eq(workspaceRelation.toObjectType, input.objectType),
          eq(workspaceRelation.toObjectId, input.id),
        ),
      )
      .limit(50);
    return {
      view,
      object: null,
      relations: inbound.map(rowToRelation),
      revisions: [],
    };
  }

  const [row] = await db
    .select()
    .from(workspaceObject)
    .where(eq(workspaceObject.id, input.id))
    .limit(1);
  if (!row) {
    throw new ORPCError("NOT_FOUND");
  }
  await assertCanReadObject(actorUserId, row);
  const object = rowToObject(row);
  const relations = await db
    .select()
    .from(workspaceRelation)
    .where(
      or(
        eq(workspaceRelation.fromObjectId, object.id),
        and(
          eq(workspaceRelation.toObjectId, object.id),
          eq(workspaceRelation.toObjectType, object.objectType),
        ),
      ),
    );
  const revisions = await db
    .select()
    .from(workspaceRevision)
    .where(eq(workspaceRevision.objectId, object.id))
    .orderBy(desc(workspaceRevision.createdAt))
    .limit(5);
  const [placement] = await db
    .select()
    .from(workspacePlacement)
    .where(
      and(
        eq(workspacePlacement.objectId, object.id),
        eq(workspacePlacement.ownerUserId, actorUserId),
        eq(workspacePlacement.viewId, "board"),
      ),
    )
    .limit(1);

  return {
    view: {
      origin: "canvas" as const,
      objectType: object.objectType,
      id: object.id,
      title: object.title,
      canvasWorkspaceId: object.canvasWorkspaceId ?? null,
      teamId: object.teamId ?? null,
      properties: object.properties,
      placement: placement ? rowToPlacement(placement) : null,
      href: knowledgeObjectHref(object.objectType, object.id),
      missing: false,
    } satisfies KnowledgeObjectView,
    object,
    relations: relations.map(rowToRelation),
    revisions: revisions.map((revision) => ({
      id: revision.id,
      objectId: revision.objectId,
      actorUserId: revision.actorUserId,
      proposalId: revision.proposalId,
      before: revision.before,
      after: revision.after,
      createdAt: toIso(revision.createdAt),
    })),
  };
}

async function loadObject(id: string) {
  const [row] = await db.select().from(workspaceObject).where(eq(workspaceObject.id, id)).limit(1);
  return row ? rowToObject(row) : null;
}

async function projectObjectIntoWorkspace(actorUserId: string, objectId: string) {
  const object = await loadObject(objectId);
  if (!object || !shouldProjectIntoWorkspaceBlob(object.objectType)) return;
  const relations = (
    await db.select().from(workspaceRelation).where(eq(workspaceRelation.fromObjectId, objectId))
  ).map(rowToRelation);
  const [placementRow] = await db
    .select()
    .from(workspacePlacement)
    .where(
      and(
        eq(workspacePlacement.objectId, objectId),
        eq(workspacePlacement.ownerUserId, object.ownerUserId),
        eq(workspacePlacement.viewId, "board"),
      ),
    )
    .limit(1);
  const node = knowledgeToWorkspaceNode(
    object,
    placementRow ? rowToPlacement(placementRow) : null,
    relations,
  );
  // ponytail: graph rows are uncapped; board cards still share WORKSPACE_NODE_LIMIT (200). Plan 2 lifts the board cap with clustering.
  const workspaceId = object.canvasWorkspaceId;
  if (!workspaceId) return;
  const [workspace] = await db
    .select()
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.workspaceId, workspaceId))
    .limit(1);
  const existing = (workspace?.nodes ?? []) as WorkspaceNode[];
  const replacing = existing.some((entry) => entry.id === node.id);
  if (!replacing && existing.length >= WORKSPACE_NODE_LIMIT) {
    return;
  }
  const next = replacing
    ? existing.map((entry) => (entry.id === node.id ? node : entry))
    : [...existing, node];
  await db
    .insert(dashboardWorkspace)
    .values({
      workspaceId,
      ownerUserId: object.ownerUserId,
      nodes: next,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: dashboardWorkspace.workspaceId,
      set: { nodes: next, updatedAt: new Date() },
    });
  void actorUserId;
}

async function insertRevision(input: {
  objectId: string;
  actorUserId: string;
  proposalId?: string | null;
  before: unknown;
  after: unknown;
}) {
  await db.insert(workspaceRevision).values({
    id: createWorkspaceId("krev"),
    objectId: input.objectId,
    actorUserId: input.actorUserId,
    proposalId: input.proposalId ?? null,
    before: input.before,
    after: input.after,
  });
}

export async function applyKnowledgeAction(
  actorUserId: string,
  input: {
    action: KnowledgeAction;
    proposalId?: string | null;
    teamId?: string | null;
    canvasWorkspaceId?: string | null;
  },
) {
  const action = input.action;
  const teamId = input.teamId ?? null;
  const canvasWorkspaceId = input.canvasWorkspaceId ?? null;
  if (!canvasWorkspaceId) {
    throw new ORPCError("BAD_REQUEST", { message: "Knowledge writes require a brain." });
  }
  await requireOwnedCanvasWorkspace(actorUserId, { canvasWorkspaceId });
  switch (action.type) {
    case "object.create": {
      if (!isCanvasNativeObjectType(action.objectType)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot create Agency records from knowledge actions.",
        });
      }
      const visibility = action.visibility ?? (action.teamId ? "team" : "private");
      const objectTeamId = action.teamId ?? (visibility === "team" ? teamId : null);
      if (visibility === "team") {
        if (!objectTeamId) {
          throw new ORPCError("BAD_REQUEST", { message: "Team-visible objects require teamId." });
        }
        await requireTeamMembership(actorUserId, objectTeamId, "editor");
      }
      if (action.about && isAgencyObjectType(action.about.objectType)) {
        const relationTeamId = objectTeamId ?? teamId;
        if (!relationTeamId) {
          throw new ORPCError("BAD_REQUEST", { message: "Agency links require teamId." });
        }
        await requireTeamMembership(actorUserId, relationTeamId, "editor");
        await assertAgencyTargetExists(actorUserId, {
          teamId: relationTeamId,
          objectType: action.about.objectType,
          id: action.about.id,
        });
      }
      const properties =
        action.objectType === "folder"
          ? knowledgeFolderPropertiesSchema.parse({
              title: action.title,
              ...(action.properties ?? {}),
            })
          : action.objectType === "source"
            ? knowledgeSourcePropertiesSchema.parse(action.properties ?? {})
            : (action.properties ?? {});
      const now = new Date();
      const id = action.id ?? createWorkspaceId("kobj");
      const object = knowledgeObjectSchema.parse({
        id,
        objectType: action.objectType,
        title: action.title,
        ownerUserId: actorUserId,
        canvasWorkspaceId,
        visibility,
        teamId: objectTeamId,
        properties,
        content: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      await db.insert(workspaceObject).values({
        id: object.id,
        ownerUserId: object.ownerUserId,
        canvasWorkspaceId,
        objectType: object.objectType,
        title: object.title,
        visibility: object.visibility,
        teamId: object.teamId ?? null,
        properties: object.properties,
        content: object.content ?? null,
        createdAt: now,
        updatedAt: now,
      });
      if (action.placement) {
        const size = defaultKnowledgePlacementSize(object.objectType);
        await db.insert(workspacePlacement).values({
          id: createWorkspaceId("kplc"),
          objectId: object.id,
          canvasWorkspaceId,
          objectType: object.objectType,
          teamId: object.teamId ?? null,
          viewId: "board",
          x: action.placement.x,
          y: action.placement.y,
          width: action.placement.width ?? size.width,
          height: action.placement.height ?? size.height,
          ownerUserId: actorUserId,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (action.about) {
        const nowRelation = new Date();
        await db.insert(workspaceRelation).values({
          id: createWorkspaceId("krel"),
          fromObjectId: object.id,
          canvasWorkspaceId,
          fromObjectType: object.objectType,
          toObjectType: action.about.objectType,
          toObjectId: action.about.id,
          relationType: "about",
          ownerUserId: actorUserId,
          teamId: object.teamId ?? teamId,
          properties: {},
          createdAt: nowRelation,
          updatedAt: nowRelation,
        });
      }
      await insertRevision({
        objectId: object.id,
        actorUserId,
        proposalId: input.proposalId,
        before: null,
        after: object,
      });
      await projectObjectIntoWorkspace(actorUserId, object.id);
      return { before: null, after: object, objectId: object.id };
    }
    case "object.update": {
      if (action.objectType && isAgencyObjectType(action.objectType)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot update Agency records from knowledge actions.",
        });
      }
      const existing = await loadObject(action.objectId);
      if (!existing) throw new ORPCError("NOT_FOUND");
      await assertCanReadObject(actorUserId, existing);
      await assertCanWriteObject(actorUserId, existing);
      const next = knowledgeObjectSchema.parse({
        ...existing,
        title: action.title ?? existing.title,
        visibility: action.visibility ?? existing.visibility,
        teamId: action.teamId === undefined ? existing.teamId : action.teamId,
        properties: action.properties
          ? { ...existing.properties, ...action.properties }
          : existing.properties,
        updatedAt: new Date().toISOString(),
      });
      await db
        .update(workspaceObject)
        .set({
          title: next.title,
          visibility: next.visibility,
          teamId: next.teamId ?? null,
          properties: next.properties,
          updatedAt: new Date(),
        })
        .where(eq(workspaceObject.id, next.id));
      await insertRevision({
        objectId: next.id,
        actorUserId,
        proposalId: input.proposalId,
        before: existing,
        after: next,
      });
      await projectObjectIntoWorkspace(actorUserId, next.id);
      return { before: existing, after: next, objectId: next.id };
    }
    case "object.delete": {
      if (action.objectType && isAgencyObjectType(action.objectType)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot delete Agency records from knowledge actions.",
        });
      }
      const existing = await loadObject(action.objectId);
      if (!existing) throw new ORPCError("NOT_FOUND");
      await assertCanWriteObject(actorUserId, existing);
      await insertRevision({
        objectId: existing.id,
        actorUserId,
        proposalId: input.proposalId,
        before: existing,
        after: null,
      });
      await deleteKnowledgeForNode(actorUserId, { objectId: existing.id });
      if (existing.canvasWorkspaceId) {
        const [workspace] = await db
          .select()
          .from(dashboardWorkspace)
          .where(eq(dashboardWorkspace.workspaceId, existing.canvasWorkspaceId))
          .limit(1);
        const next = ((workspace?.nodes ?? []) as WorkspaceNode[]).filter(
          (node) => node.id !== existing.id,
        );
        if (workspace) {
          await db
            .update(dashboardWorkspace)
            .set({ nodes: next, updatedAt: new Date() })
            .where(eq(dashboardWorkspace.workspaceId, existing.canvasWorkspaceId));
        }
      }
      return { before: existing, after: null, objectId: existing.id };
    }
    case "relation.create": {
      const from = await loadObject(action.fromObjectId);
      if (!from) throw new ORPCError("NOT_FOUND");
      await assertCanWriteObject(actorUserId, from);
      const relationTeamId = from.teamId ?? teamId;
      if (action.relationType === "in") {
        if (action.to.objectType !== "folder") {
          throw new ORPCError("BAD_REQUEST", { message: "in relations must target a folder." });
        }
        const folder = await loadObject(action.to.id);
        if (!folder || folder.objectType !== "folder") {
          throw new ORPCError("BAD_REQUEST", { message: "in relations must target a folder." });
        }
        await assertCanReadObject(actorUserId, folder);
      }
      if (isAgencyObjectType(action.to.objectType)) {
        if (!relationTeamId) {
          throw new ORPCError("BAD_REQUEST", { message: "Agency links require teamId." });
        }
        await requireTeamMembership(actorUserId, relationTeamId, "editor");
        await assertAgencyTargetExists(actorUserId, {
          teamId: relationTeamId,
          objectType: action.to.objectType,
          id: action.to.id,
        });
      }
      const now = new Date();
      const relation: KnowledgeRelation = {
        id: createWorkspaceId("krel"),
        fromObjectId: from.id,
        fromObjectType: from.objectType,
        toObjectType: action.to.objectType,
        toObjectId: action.to.id,
        relationType: action.relationType,
        ownerUserId: actorUserId,
        canvasWorkspaceId: from.canvasWorkspaceId ?? canvasWorkspaceId,
        teamId: relationTeamId,
        properties: {},
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await db
        .insert(workspaceRelation)
        .values({
          id: relation.id,
          fromObjectId: relation.fromObjectId,
          canvasWorkspaceId: relation.canvasWorkspaceId ?? canvasWorkspaceId,
          fromObjectType: relation.fromObjectType,
          toObjectType: relation.toObjectType,
          toObjectId: relation.toObjectId,
          relationType: relation.relationType,
          ownerUserId: relation.ownerUserId,
          teamId: relation.teamId,
          properties: {},
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      await projectObjectIntoWorkspace(actorUserId, from.id);
      return { before: null, after: relation, objectId: from.id };
    }
    case "relation.delete": {
      const [row] = await db
        .select()
        .from(workspaceRelation)
        .where(eq(workspaceRelation.id, action.relationId))
        .limit(1);
      if (!row) throw new ORPCError("NOT_FOUND");
      const from = await loadObject(row.fromObjectId);
      if (!from) throw new ORPCError("NOT_FOUND");
      await assertCanWriteObject(actorUserId, from);
      await db.delete(workspaceRelation).where(eq(workspaceRelation.id, action.relationId));
      await projectObjectIntoWorkspace(actorUserId, row.fromObjectId);
      return { before: rowToRelation(row), after: null, objectId: row.fromObjectId };
    }
    case "placement.upsert": {
      if (action.objectType && isAgencyObjectType(action.objectType)) {
        const pinTeamId = action.teamId ?? teamId;
        if (!pinTeamId) {
          throw new ORPCError("BAD_REQUEST", { message: "Agency pins require teamId." });
        }
        await requireTeamMembership(actorUserId, pinTeamId, "editor");
        await assertAgencyTargetExists(actorUserId, {
          teamId: pinTeamId,
          objectType: action.objectType,
          id: action.objectId,
        });
        const canvasObject = await loadObject(action.objectId);
        if (canvasObject) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Agency pins cannot reuse a canvas object id.",
          });
        }
        const size = defaultKnowledgePlacementSize(action.objectType);
        const now = new Date();
        await db
          .insert(workspacePlacement)
          .values({
            id: createWorkspaceId("kplc"),
            objectId: action.objectId,
            canvasWorkspaceId,
            objectType: action.objectType,
            teamId: pinTeamId,
            viewId: "board",
            x: action.x,
            y: action.y,
            width: action.width ?? size.width,
            height: action.height ?? size.height,
            ownerUserId: actorUserId,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              workspacePlacement.objectId,
              workspacePlacement.viewId,
              workspacePlacement.ownerUserId,
            ],
            set: {
              objectType: action.objectType,
              canvasWorkspaceId,
              teamId: pinTeamId,
              x: action.x,
              y: action.y,
              width: action.width ?? size.width,
              height: action.height ?? size.height,
              updatedAt: now,
            },
          });
        return {
          before: null,
          after: {
            objectId: action.objectId,
            objectType: action.objectType,
            teamId: pinTeamId,
            x: action.x,
            y: action.y,
          },
          objectId: action.objectId,
        };
      }
      const existing = await loadObject(action.objectId);
      if (!existing) throw new ORPCError("NOT_FOUND");
      await assertCanWriteObject(actorUserId, existing);
      const size = defaultKnowledgePlacementSize(existing.objectType);
      const now = new Date();
      await db
        .insert(workspacePlacement)
        .values({
          id: createWorkspaceId("kplc"),
          objectId: action.objectId,
          canvasWorkspaceId: existing.canvasWorkspaceId ?? canvasWorkspaceId,
          objectType: existing.objectType,
          teamId: existing.teamId ?? teamId,
          viewId: "board",
          x: action.x,
          y: action.y,
          width: action.width ?? size.width,
          height: action.height ?? size.height,
          ownerUserId: actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            workspacePlacement.objectId,
            workspacePlacement.viewId,
            workspacePlacement.ownerUserId,
          ],
          set: {
            objectType: existing.objectType,
            canvasWorkspaceId: existing.canvasWorkspaceId ?? canvasWorkspaceId,
            teamId: existing.teamId ?? teamId,
            x: action.x,
            y: action.y,
            width: action.width ?? size.width,
            height: action.height ?? size.height,
            updatedAt: now,
          },
        });
      await projectObjectIntoWorkspace(actorUserId, action.objectId);
      return { before: existing, after: existing, objectId: action.objectId };
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

function knowledgeBodyPreview(object: KnowledgeObject): string | undefined {
  const body = object.properties.body;
  if (typeof body === "string" && body.trim()) return body.trim().slice(0, 160);
  if (object.objectType === "source") {
    const source = parseKnowledgeSourceProperties(object.properties);
    if (source?.filename) return source.filename;
    if (source?.url) return source.url;
    if (source?.uploadId) return source.uploadId;
  }
  const recommendation = object.properties.recommendation;
  if (typeof recommendation === "string" && recommendation.trim()) {
    return recommendation.trim().slice(0, 160);
  }
  return undefined;
}

function toBoardCard(input: {
  id: string;
  objectType: KnowledgeObjectType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId?: string | null;
  origin: "canvas" | "agency" | "inbox";
  teamId?: string | null;
  agencyHref?: string | null;
  bodyPreview?: string;
  unplaced?: boolean;
  readOnly?: boolean;
}): KnowledgeBoardCard {
  const kind = isAgencyObjectType(input.objectType)
    ? "agency"
    : input.objectType === "folder"
      ? "folder"
      : input.objectType === "document"
        ? "document"
        : "knowledge";
  return knowledgeBoardCardSchema.parse({
    id: input.id,
    kind,
    objectType: input.objectType,
    title: input.title,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    parentId: input.parentId ?? null,
    href: knowledgeObjectHref(input.objectType, input.id),
    agencyHref: input.agencyHref ?? null,
    chip: knowledgeChipLabel(input.objectType),
    bodyPreview: input.bodyPreview,
    readOnly: input.readOnly ?? kind === "agency",
    unplaced: input.unplaced ?? false,
    origin: input.origin,
    teamId: input.teamId ?? null,
  });
}

export async function listKnowledgeBoard(
  actorUserId: string,
  input: { canvasWorkspaceId: string; teamId?: string | null },
): Promise<{ items: KnowledgeBoardCard[]; unplaced: KnowledgeBoardCard[] }> {
  const teamId = input.teamId ?? null;
  await requireOwnedCanvasWorkspace(actorUserId, { canvasWorkspaceId: input.canvasWorkspaceId });
  if (teamId) {
    await requireTeamMembership(actorUserId, teamId, "viewer");
  }
  const visibilityFilter = teamId
    ? or(
        eq(workspaceObject.ownerUserId, actorUserId),
        and(eq(workspaceObject.visibility, "team"), eq(workspaceObject.teamId, teamId)),
      )
    : eq(workspaceObject.ownerUserId, actorUserId);

  const rows = await db
    .select()
    .from(workspaceObject)
    .where(
      and(
        visibilityFilter,
        eq(workspaceObject.canvasWorkspaceId, input.canvasWorkspaceId),
        ne(workspaceObject.objectType, "document"),
      ),
    )
    .orderBy(desc(workspaceObject.updatedAt))
    .limit(WORKSPACE_NODE_LIMIT);

  const objectIds = rows.map((row) => row.id);
  const placements = await db
    .select()
    .from(workspacePlacement)
    .where(
      and(
        eq(workspacePlacement.ownerUserId, actorUserId),
        eq(workspacePlacement.canvasWorkspaceId, input.canvasWorkspaceId),
        eq(workspacePlacement.viewId, "board"),
      ),
    );
  const placementByObject = new Map(placements.map((row) => [row.objectId, rowToPlacement(row)]));

  const folderLinks =
    objectIds.length === 0
      ? []
      : await db
          .select()
          .from(workspaceRelation)
          .where(
            and(
              inArray(workspaceRelation.fromObjectId, objectIds),
              eq(workspaceRelation.relationType, "in"),
              eq(workspaceRelation.toObjectType, "folder"),
            ),
          );
  const folderByChild = new Map(folderLinks.map((row) => [row.fromObjectId, row.toObjectId]));

  const items: KnowledgeBoardCard[] = [];
  const unplaced: KnowledgeBoardCard[] = [];
  for (const row of rows) {
    const object = rowToObject(row);
    const placement = placementByObject.get(object.id);
    if (!placement) {
      const size = defaultKnowledgePlacementSize(object.objectType);
      unplaced.push(
        toBoardCard({
          id: object.id,
          objectType: object.objectType,
          title: object.title,
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          origin: "canvas",
          teamId: object.teamId,
          bodyPreview: knowledgeBodyPreview(object),
          unplaced: true,
        }),
      );
      continue;
    }
    items.push(
      toBoardCard({
        id: object.id,
        objectType: object.objectType,
        title: object.title,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        parentId: folderByChild.get(object.id) ?? null,
        origin: "canvas",
        teamId: object.teamId,
        bodyPreview: knowledgeBodyPreview(object),
      }),
    );
  }

  const canvasIds = new Set(rows.map((row) => row.id));
  const pinPlacements = placements.filter((row) => {
    const objectType = row.objectType;
    return objectType && isAgencyObjectType(objectType) && !canvasIds.has(row.objectId);
  });
  const pinViews = await Promise.all(
    pinPlacements.map(async (row) => {
      const objectType = knowledgeObjectTypeSchema.parse(row.objectType);
      if (!isAgencyObjectType(objectType) || !row.teamId) return null;
      if (teamId && row.teamId !== teamId) return null;
      try {
        await requireTeamMembership(actorUserId, row.teamId, "viewer");
      } catch {
        return null;
      }
      const view = await getAgencyKnowledgeView(actorUserId, {
        teamId: row.teamId,
        objectType,
        id: row.objectId,
      });
      const placement = rowToPlacement(row);
      return toBoardCard({
        id: row.objectId,
        objectType,
        title: view.title,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        origin: "agency",
        teamId: row.teamId,
        agencyHref: view.href ?? null,
        readOnly: true,
      });
    }),
  );
  for (const card of pinViews) {
    if (card) items.push(card);
  }

  return { items, unplaced };
}
