import { db } from "@orch/db";
import { dashboardWorkspace, workspaceMarketplaceItem, workspaceTeamMember } from "@orch/db/schema";
import {
  createWorkspaceId,
  normalizeWorkspaceNode,
  workspaceMarketplaceItemSchema,
  workspaceNodeVisibilitySchema,
  type WorkspaceMarketplaceListInput,
  type WorkspaceMarketplaceListOutput,
  type WorkspaceMarketplaceSaveInput,
  type WorkspaceNode,
  type WorkspaceNodeVisibility,
  type WorkspaceTeamRole,
} from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, ilike, inArray, lt, or } from "drizzle-orm";

import { getTeamBilling } from "../../billing-team";
import { requireAgencyRole, requireTeamMembership } from "../../lib/team-membership";
import { getBillingStateForUser } from "../../billing-guard";
import { deleteKnowledgeForNode, syncKnowledgeFromNodes } from "./knowledge-service";

export async function assertCanSaveWorkspaceNodes(
  actorUserId: string,
  input: { nodeCount: number },
) {
  const billing = await getBillingStateForUser(actorUserId);
  const { nodeCount } = input;
  if (nodeCount > billing.limits.workspaceNodes) {
    throw new ORPCError("FORBIDDEN", {
      message: `Your ${billing.tier} plan allows up to ${billing.limits.workspaceNodes} workspace nodes`,
      data: { limit: billing.limits.workspaceNodes, current: nodeCount },
    });
  }
}

const TEAM_ROLE_WEIGHT: Record<WorkspaceTeamRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

function hasRoleAtLeast(role: WorkspaceTeamRole, required: WorkspaceTeamRole) {
  return TEAM_ROLE_WEIGHT[role] >= TEAM_ROLE_WEIGHT[required];
}

function normalizeVisibility(
  visibility: WorkspaceNodeVisibility | undefined,
  teamId: string | null,
) {
  const parsedVisibility = workspaceNodeVisibilitySchema.parse(visibility ?? "private");

  if (!teamId) {
    return "private" as const;
  }

  return parsedVisibility === "team" ? "team" : "private";
}

function withOwnerDefaults(node: WorkspaceNode, ownerUserId: string): WorkspaceNode {
  return normalizeWorkspaceNode({
    ...node,
    ownerUserId: node.ownerUserId ?? ownerUserId,
    visibility: normalizeVisibility(node.visibility, node.teamId ?? null),
    teamId: node.teamId ?? null,
  });
}

function assertValidNodeConnections(
  persistedNodes: WorkspaceNode[],
  accessibleNodesById: Map<string, WorkspaceNode>,
) {
  for (const node of persistedNodes) {
    if (node.nodeType !== "orchestrator") {
      if (node.connections.length > 0) {
        throw new ORPCError("BAD_REQUEST");
      }

      continue;
    }

    for (const connection of node.connections) {
      const targetNode = accessibleNodesById.get(connection.targetNodeId);

      if (!targetNode || targetNode.id === node.id || targetNode.nodeType === "orchestrator") {
        throw new ORPCError("BAD_REQUEST");
      }
    }
  }
}

async function getMembershipMapByUser(userId: string) {
  const memberships = await db
    .select({
      teamId: workspaceTeamMember.teamId,
      role: workspaceTeamMember.role,
    })
    .from(workspaceTeamMember)
    .where(eq(workspaceTeamMember.userId, userId));

  return new Map(memberships.map((membership) => [membership.teamId, membership.role]));
}

async function upsertWorkspaceNodes(userId: string, nodes: WorkspaceNode[], now: Date) {
  await db
    .insert(dashboardWorkspace)
    .values({
      userId,
      nodes,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: dashboardWorkspace.userId,
      set: {
        nodes,
        updatedAt: now,
      },
    });
  await syncKnowledgeFromNodes(userId, { nodes });
}

async function getWorkspaceRowsByUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  return db
    .select({
      userId: dashboardWorkspace.userId,
      nodes: dashboardWorkspace.nodes,
      updatedAt: dashboardWorkspace.updatedAt,
    })
    .from(dashboardWorkspace)
    .where(inArray(dashboardWorkspace.userId, userIds));
}

function getNodeOwnerKey(node: WorkspaceNode) {
  return `${node.ownerUserId ?? ""}:${node.id}`;
}

function getLatestUpdatedAtIso(rows: Array<{ updatedAt: Date }>) {
  if (rows.length === 0) {
    return null;
  }

  return rows
    .reduce((latest, row) => (row.updatedAt > latest ? row.updatedAt : latest), rows[0]!.updatedAt)
    .toISOString();
}

export async function getWorkspaceSnapshot(actorUserId: string, _input: Record<string, never>) {
  const userId = actorUserId;
  const [workspace] = await db
    .select({
      nodes: dashboardWorkspace.nodes,
      updatedAt: dashboardWorkspace.updatedAt,
    })
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.userId, userId))
    .limit(1);

  const membershipMap = await getMembershipMapByUser(userId);
  const teamIds = [...membershipMap.keys()];
  const memberRows =
    teamIds.length > 0
      ? await db
          .select({ userId: workspaceTeamMember.userId })
          .from(workspaceTeamMember)
          .where(inArray(workspaceTeamMember.teamId, teamIds))
      : [];
  const relatedUserIds = [
    ...new Set(memberRows.map((row) => row.userId).filter((id) => id !== userId)),
  ];
  const relatedWorkspaces = await getWorkspaceRowsByUserIds(relatedUserIds);

  const ownNodes = (workspace?.nodes ?? []).map((node) =>
    withOwnerDefaults(node as WorkspaceNode, userId),
  );
  const visibleRelatedWorkspaces = relatedWorkspaces
    .map((relatedWorkspace) => ({
      nodes: (relatedWorkspace.nodes ?? [])
        .map((node) => withOwnerDefaults(node as WorkspaceNode, relatedWorkspace.userId))
        .filter((node) => {
          if (node.visibility !== "team" || !node.teamId) {
            return false;
          }

          return membershipMap.has(node.teamId);
        }),
      updatedAt: relatedWorkspace.updatedAt,
    }))
    .filter((relatedWorkspace) => relatedWorkspace.nodes.length > 0);
  const sharedNodes = visibleRelatedWorkspaces.flatMap(
    (relatedWorkspace) => relatedWorkspace.nodes,
  );

  const dedupedNodes = new Map<string, WorkspaceNode>();

  for (const node of [...ownNodes, ...sharedNodes]) {
    dedupedNodes.set(getNodeOwnerKey(node), node);
  }

  const latestUpdatedAt = getLatestUpdatedAtIso(
    [
      ...(workspace?.updatedAt ? [{ updatedAt: workspace.updatedAt }] : []),
      ...visibleRelatedWorkspaces.map((row) => ({ updatedAt: row.updatedAt })),
    ].filter((row): row is { updatedAt: Date } => Boolean(row.updatedAt)),
  );

  return {
    nodes: [...dedupedNodes.values()],
    updatedAt: latestUpdatedAt,
  };
}

export async function saveWorkspaceNodes(actorUserId: string, input: { nodes: WorkspaceNode[] }) {
  const userId = actorUserId;
  const { nodes } = input;
  const now = new Date();
  const membershipMap = await getMembershipMapByUser(userId);
  const verifiedEditorTeams = new Set<string>();
  const ownedNodes: WorkspaceNode[] = [];
  const sharedNodesByOwner = new Map<string, WorkspaceNode[]>();
  const sharedWorkspaceNodesByOwner = new Map<string, Map<string, WorkspaceNode>>();
  const accessibleNodesById = new Map<string, WorkspaceNode>();

  for (const nodeInput of nodes) {
    const node = normalizeWorkspaceNode(nodeInput);
    const ownerUserId = node.ownerUserId ?? userId;

    if (ownerUserId === userId) {
      const teamId = node.teamId ?? null;
      const visibility = normalizeVisibility(node.visibility, teamId);

      if (visibility === "team") {
        if (!teamId) {
          throw new ORPCError("BAD_REQUEST");
        }

        if (!verifiedEditorTeams.has(teamId)) {
          await requireTeamMembership(userId, teamId, "editor");
          verifiedEditorTeams.add(teamId);
        }
      }

      const ownedNode = withOwnerDefaults(
        {
          ...node,
          ownerUserId,
          visibility,
          teamId: visibility === "team" ? teamId : null,
        },
        ownerUserId,
      );
      ownedNodes.push(ownedNode);
      accessibleNodesById.set(ownedNode.id, ownedNode);

      continue;
    }

    const teamId = node.teamId ?? null;

    if (!teamId || node.visibility !== "team") {
      throw new ORPCError("UNAUTHORIZED");
    }

    const memberRole = membershipMap.get(teamId);

    if (!memberRole) {
      throw new ORPCError("UNAUTHORIZED");
    }

    if (!hasRoleAtLeast(memberRole, "editor")) {
      continue;
    }

    const candidateSharedNode = withOwnerDefaults(
      {
        ...node,
        ownerUserId,
        visibility: "team",
        teamId,
      },
      ownerUserId,
    );
    let existingById = sharedWorkspaceNodesByOwner.get(ownerUserId);

    if (!existingById) {
      const [ownerWorkspace] = await db
        .select({
          nodes: dashboardWorkspace.nodes,
        })
        .from(dashboardWorkspace)
        .where(eq(dashboardWorkspace.userId, ownerUserId))
        .limit(1);
      const existingNodes = (ownerWorkspace?.nodes ?? []).map((existingNode) =>
        withOwnerDefaults(existingNode as WorkspaceNode, ownerUserId),
      );
      existingById = new Map(existingNodes.map((existingNode) => [existingNode.id, existingNode]));
      sharedWorkspaceNodesByOwner.set(ownerUserId, existingById);
    }

    const existingNode = existingById.get(candidateSharedNode.id);

    if (
      !existingNode ||
      existingNode.ownerUserId !== ownerUserId ||
      existingNode.visibility !== "team" ||
      !existingNode.teamId ||
      candidateSharedNode.teamId !== existingNode.teamId
    ) {
      throw new ORPCError("NOT_FOUND");
    }

    await requireTeamMembership(userId, existingNode.teamId, "editor");

    const sharedNode = withOwnerDefaults(
      {
        ...candidateSharedNode,
        ownerUserId,
        visibility: "team",
        teamId: existingNode.teamId,
      },
      ownerUserId,
    );
    existingById.set(sharedNode.id, sharedNode);
    const ownerNodes = sharedNodesByOwner.get(ownerUserId) ?? [];
    ownerNodes.push(sharedNode);

    sharedNodesByOwner.set(ownerUserId, ownerNodes);
    accessibleNodesById.set(sharedNode.id, sharedNode);
  }

  const persistedNodes = [
    ...ownedNodes,
    ...[...sharedNodesByOwner.values()].flatMap((ownerNodes) => ownerNodes),
  ];

  assertValidNodeConnections(persistedNodes, accessibleNodesById);

  await upsertWorkspaceNodes(userId, ownedNodes, now);

  for (const [ownerUserId, existingById] of sharedWorkspaceNodesByOwner.entries()) {
    await upsertWorkspaceNodes(ownerUserId, [...existingById.values()], now);
  }

  return {
    nodeCount: nodes.length,
    savedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function shareWorkspaceNode(
  actorUserId: string,
  input: { nodeId: string; teamId: string },
) {
  const userId = actorUserId;
  await requireTeamMembership(userId, input.teamId, "owner");

  const [workspace] = await db
    .select({ nodes: dashboardWorkspace.nodes })
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.userId, userId))
    .limit(1);

  const nodes = (workspace?.nodes ?? []).map((node) =>
    withOwnerDefaults(node as WorkspaceNode, userId),
  );
  const targetNode = nodes.find((node) => node.id === input.nodeId);

  if (!targetNode) {
    throw new ORPCError("NOT_FOUND");
  }

  const now = new Date();
  const updatedNodes = nodes.map((node) => {
    if (node.id !== input.nodeId) {
      return node;
    }

    return withOwnerDefaults(
      {
        ...node,
        ownerUserId: userId,
        visibility: "team",
        teamId: input.teamId,
        updatedAt: now.toISOString(),
      },
      userId,
    );
  });

  await upsertWorkspaceNodes(userId, updatedNodes, now);

  return {
    nodeId: input.nodeId,
    teamId: input.teamId,
    visibility: "team" as const,
  };
}

export async function unshareWorkspaceNode(actorUserId: string, input: { nodeId: string }) {
  const userId = actorUserId;
  const [workspace] = await db
    .select({ nodes: dashboardWorkspace.nodes })
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.userId, userId))
    .limit(1);

  const nodes = (workspace?.nodes ?? []).map((node) =>
    withOwnerDefaults(node as WorkspaceNode, userId),
  );
  const targetNode = nodes.find((node) => node.id === input.nodeId);

  if (!targetNode) {
    throw new ORPCError("NOT_FOUND");
  }

  if (targetNode.visibility === "team" && targetNode.teamId) {
    await requireTeamMembership(userId, targetNode.teamId, "owner");
  }

  const now = new Date();
  const updatedNodes = nodes.map((node) => {
    if (node.id !== input.nodeId) {
      return node;
    }

    return withOwnerDefaults(
      {
        ...node,
        ownerUserId: userId,
        visibility: "private",
        teamId: null,
        updatedAt: now.toISOString(),
      },
      userId,
    );
  });

  await upsertWorkspaceNodes(userId, updatedNodes, now);

  return {
    nodeId: input.nodeId,
    visibility: "private" as const,
  };
}

export async function deleteWorkspaceNode(
  actorUserId: string,
  input: { nodeId: string; ownerUserId?: string },
) {
  const userId = actorUserId;
  const ownerUserId = input.ownerUserId ?? userId;

  if (ownerUserId !== userId) {
    const [ownerWorkspace] = await db
      .select({ nodes: dashboardWorkspace.nodes })
      .from(dashboardWorkspace)
      .where(eq(dashboardWorkspace.userId, ownerUserId))
      .limit(1);

    if (!ownerWorkspace) {
      throw new ORPCError("NOT_FOUND");
    }

    const ownerNodes = (ownerWorkspace.nodes ?? []).map((node) =>
      withOwnerDefaults(node as WorkspaceNode, ownerUserId),
    );
    const targetNode = ownerNodes.find((node) => node.id === input.nodeId);

    if (!targetNode || targetNode.visibility !== "team" || !targetNode.teamId) {
      throw new ORPCError("NOT_FOUND");
    }

    await requireTeamMembership(userId, targetNode.teamId, "editor");

    const now = new Date();
    await upsertWorkspaceNodes(
      ownerUserId,
      ownerNodes.filter((node) => node.id !== input.nodeId),
      now,
    );
    await deleteKnowledgeForNode(userId, { objectId: input.nodeId });

    return {
      nodeId: input.nodeId,
      ownerUserId,
      deleted: true,
    };
  }

  const [workspace] = await db
    .select({ nodes: dashboardWorkspace.nodes })
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.userId, userId))
    .limit(1);

  const nodes = (workspace?.nodes ?? []).map((node) =>
    withOwnerDefaults(node as WorkspaceNode, userId),
  );

  if (!nodes.some((node) => node.id === input.nodeId)) {
    throw new ORPCError("NOT_FOUND");
  }

  const now = new Date();
  await upsertWorkspaceNodes(
    userId,
    nodes.filter((node) => node.id !== input.nodeId),
    now,
  );
  await deleteKnowledgeForNode(userId, { objectId: input.nodeId });

  return {
    nodeId: input.nodeId,
    ownerUserId: userId,
    deleted: true,
  };
}

export async function getWorkspaceMarketplaceItems(
  actorUserId: string,
  input: WorkspaceMarketplaceListInput,
): Promise<WorkspaceMarketplaceListOutput> {
  void actorUserId;
  const limit = input.limit ?? 20;
  const kind = input.kind ?? "all";
  const search = input.search?.trim() ?? "";
  const cursor = input.cursor;

  const conditions: ReturnType<typeof eq>[] = [];

  if (kind !== "all") {
    conditions.push(eq(workspaceMarketplaceItem.kind, kind));
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(workspaceMarketplaceItem.title, pattern),
        ilike(workspaceMarketplaceItem.summary, pattern),
        ilike(workspaceMarketplaceItem.createdByName, pattern),
      )!,
    );
  }

  if (cursor) {
    const [cursorRow] = await db
      .select({
        createdAt: workspaceMarketplaceItem.createdAt,
        id: workspaceMarketplaceItem.id,
      })
      .from(workspaceMarketplaceItem)
      .where(eq(workspaceMarketplaceItem.id, cursor))
      .limit(1);

    if (cursorRow) {
      conditions.push(
        or(
          lt(workspaceMarketplaceItem.createdAt, cursorRow.createdAt),
          and(
            eq(workspaceMarketplaceItem.createdAt, cursorRow.createdAt),
            lt(workspaceMarketplaceItem.id, cursorRow.id),
          ),
        )!,
      );
    }
  }

  const rows = await db
    .select({
      id: workspaceMarketplaceItem.id,
      title: workspaceMarketplaceItem.title,
      summary: workspaceMarketplaceItem.summary,
      payload: workspaceMarketplaceItem.payload,
      createdByUserId: workspaceMarketplaceItem.createdByUserId,
      createdByName: workspaceMarketplaceItem.createdByName,
      createdAt: workspaceMarketplaceItem.createdAt,
      updatedAt: workspaceMarketplaceItem.updatedAt,
    })
    .from(workspaceMarketplaceItem)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(workspaceMarketplaceItem.createdAt), desc(workspaceMarketplaceItem.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]!.id : null;

  const items = pageRows.map((row) =>
    workspaceMarketplaceItemSchema.parse({
      id: row.id,
      title: row.title,
      summary: row.summary,
      payload: row.payload,
      createdByUserId: row.createdByUserId,
      createdByName: row.createdByName,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }),
  );

  return { items, nextCursor };
}

export async function saveWorkspaceMarketplaceItem(
  actorUserId: string,
  input: { actorUserName: string; item: WorkspaceMarketplaceSaveInput },
) {
  const userId = actorUserId;
  const { actorUserName: userName, item } = input;
  const teamId = item.payload.kind === "node" ? item.payload.node.teamId : null;
  if (!teamId) {
    throw new ORPCError("FORBIDDEN", {
      message: "Choose an agency to publish this item.",
      data: { code: "not_entitled" },
    });
  }
  await requireAgencyRole(userId, teamId, "viewer");
  const snapshot = await getTeamBilling(teamId);
  if (!snapshot.limits.marketplacePublish) {
    throw new ORPCError("FORBIDDEN", {
      message: "Your agency plan does not include marketplace publishing.",
      data: { code: "not_entitled", plan: snapshot.plan },
    });
  }

  const now = new Date();
  const itemId = createWorkspaceId("market");

  await db.insert(workspaceMarketplaceItem).values({
    id: itemId,
    title: item.title.trim(),
    summary: item.summary?.trim() ?? "",
    kind: item.payload.kind,
    payload: item.payload,
    createdByUserId: userId,
    createdByName: userName.trim() || "Unknown",
    createdAt: now,
    updatedAt: now,
  });

  return workspaceMarketplaceItemSchema.parse({
    id: itemId,
    title: item.title.trim(),
    summary: item.summary?.trim() ?? "",
    payload: item.payload,
    createdByUserId: userId,
    createdByName: userName.trim() || "Unknown",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}
