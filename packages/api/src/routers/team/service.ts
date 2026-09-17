import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import {
  createWorkspaceId,
  normalizeWorkspaceNode,
  type WorkspaceNode,
  type WorkspaceTeamRole,
} from "@orch/workspace";
import { db } from "@orch/db";
import { dashboardWorkspace, user, workspaceTeam, workspaceTeamMember } from "@orch/db/schema";

import { requireTeamMembership } from "../../lib/team-membership";
import { assertWithinLimit, insertTrialBilling } from "../../billing-team";
import { formatAvatarUrl } from "../agency-ops/shared/avatar-helpers";

type TeamDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function touchTeam(teamId: string, now: Date) {
  await db
    .update(workspaceTeam)
    .set({
      updatedAt: now,
    })
    .where(eq(workspaceTeam.id, teamId));
}

function mapUserTeams(
  memberships: Array<{
    teamId: string;
    role: WorkspaceTeamRole;
    teamName: string;
    teamImage: string | null;
    createdByUserId: string;
    updatedAt: Date;
  }>,
) {
  return memberships.map((membership) => ({
    id: membership.teamId,
    name: membership.teamName,
    image: membership.teamImage,
    role: membership.role,
    createdByUserId: membership.createdByUserId,
    updatedAt: membership.updatedAt.toISOString(),
  }));
}

async function listUserTeamsInTransaction(tx: TeamDbTransaction, actorUserId: string) {
  const memberships = await tx
    .select({
      teamId: workspaceTeamMember.teamId,
      role: workspaceTeamMember.role,
      teamName: workspaceTeam.name,
      teamImage: workspaceTeam.image,
      createdByUserId: workspaceTeam.createdByUserId,
      updatedAt: workspaceTeam.updatedAt,
    })
    .from(workspaceTeamMember)
    .innerJoin(workspaceTeam, eq(workspaceTeam.id, workspaceTeamMember.teamId))
    .where(eq(workspaceTeamMember.userId, actorUserId));

  return mapUserTeams(memberships);
}

export async function listUserTeams(actorUserId: string, _input: Record<string, never>) {
  const memberships = await db
    .select({
      teamId: workspaceTeamMember.teamId,
      role: workspaceTeamMember.role,
      teamName: workspaceTeam.name,
      teamImage: workspaceTeam.image,
      createdByUserId: workspaceTeam.createdByUserId,
      updatedAt: workspaceTeam.updatedAt,
    })
    .from(workspaceTeamMember)
    .innerJoin(workspaceTeam, eq(workspaceTeam.id, workspaceTeamMember.teamId))
    .where(eq(workspaceTeamMember.userId, actorUserId));

  return mapUserTeams(memberships);
}

export async function getTeam(actorUserId: string, input: { teamId: string }) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const [membership] = await db
    .select({
      role: workspaceTeamMember.role,
      teamName: workspaceTeam.name,
      teamImage: workspaceTeam.image,
      createdByUserId: workspaceTeam.createdByUserId,
      updatedAt: workspaceTeam.updatedAt,
    })
    .from(workspaceTeamMember)
    .innerJoin(workspaceTeam, eq(workspaceTeam.id, workspaceTeamMember.teamId))
    .where(
      and(
        eq(workspaceTeamMember.userId, actorUserId),
        eq(workspaceTeamMember.teamId, input.teamId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new ORPCError("NOT_FOUND");
  }

  const members = await listTeamMembers(actorUserId, { teamId: input.teamId });

  return {
    id: input.teamId,
    name: membership.teamName,
    image: membership.teamImage ?? null,
    role: membership.role,
    createdByUserId: membership.createdByUserId,
    updatedAt: membership.updatedAt.toISOString(),
    members,
  };
}

async function createTeamInTransaction(
  tx: TeamDbTransaction,
  actorUserId: string,
  input: { name: string },
) {
  const now = new Date();
  const teamId = createWorkspaceId("team");
  const name = input.name.trim();

  await tx.insert(workspaceTeam).values({
    id: teamId,
    name,
    createdByUserId: actorUserId,
    createdAt: now,
    updatedAt: now,
  });

  await tx.insert(workspaceTeamMember).values({
    id: createWorkspaceId("team-member"),
    teamId,
    userId: actorUserId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  await insertTrialBilling(tx, teamId, now);

  return {
    id: teamId,
    name,
    image: null,
    role: "owner" as const,
    createdByUserId: actorUserId,
    updatedAt: now.toISOString(),
  };
}

export async function findOrCreatePersonalTeam(actorUserId: string, input: { name: string }) {
  return db.transaction(async (tx) => {
    const [lockedUser] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, actorUserId))
      .for("update");

    if (!lockedUser) {
      throw new ORPCError("NOT_FOUND", { message: "User not found." });
    }

    const existingTeam = (await listUserTeamsInTransaction(tx, actorUserId))[0];
    if (existingTeam) {
      return existingTeam;
    }

    return createTeamInTransaction(tx, actorUserId, input);
  });
}

export async function createTeam(actorUserId: string, input: { name: string }) {
  return db.transaction(async (tx) => {
    const [lockedUser] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, actorUserId))
      .for("update");

    if (!lockedUser) {
      throw new ORPCError("NOT_FOUND", { message: "User not found." });
    }

    const existing = await listUserTeamsInTransaction(tx, actorUserId);
    if (existing.length >= 1) {
      throw new ORPCError("FORBIDDEN", {
        message: "This account already has an Agency.",
        data: { limit: 1, current: existing.length },
      });
    }

    return createTeamInTransaction(tx, actorUserId, input);
  });
}

export async function updateTeam(
  actorUserId: string,
  input: {
    teamId: string;
    name?: string;
    image?: string | null;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  if (input.name === undefined && input.image === undefined) {
    throw new ORPCError("BAD_REQUEST", { message: "Provide a name and/or image to update" });
  }

  const now = new Date();
  const [updated] = await db
    .update(workspaceTeam)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
      updatedAt: now,
    })
    .where(eq(workspaceTeam.id, input.teamId))
    .returning({
      id: workspaceTeam.id,
      name: workspaceTeam.name,
      image: workspaceTeam.image,
      createdByUserId: workspaceTeam.createdByUserId,
      updatedAt: workspaceTeam.updatedAt,
    });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  return {
    id: updated.id,
    name: updated.name,
    image: updated.image ?? null,
    createdByUserId: updated.createdByUserId,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

async function cleanupSharedNodesForDeletedTeam(teamId: string, now: Date) {
  const workspaces = await db
    .select({
      userId: dashboardWorkspace.userId,
      nodes: dashboardWorkspace.nodes,
    })
    .from(dashboardWorkspace);

  for (const workspace of workspaces) {
    const normalized = (workspace.nodes ?? []).map((node) =>
      normalizeWorkspaceNode({
        ...(node as WorkspaceNode),
        ownerUserId: (node as WorkspaceNode).ownerUserId ?? workspace.userId,
      }),
    );

    let didChange = false;
    const cleaned = normalized.map((node) => {
      if (node.teamId !== teamId) {
        return node;
      }

      didChange = true;

      return normalizeWorkspaceNode({
        ...node,
        visibility: "private",
        teamId: null,
        updatedAt: now.toISOString(),
      });
    });

    if (!didChange) {
      continue;
    }

    await db
      .update(dashboardWorkspace)
      .set({
        nodes: cleaned,
        updatedAt: now,
      })
      .where(eq(dashboardWorkspace.userId, workspace.userId));
  }
}

export async function deleteTeam(actorUserId: string, input: { teamId: string }) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .delete(workspaceTeam)
      .where(eq(workspaceTeam.id, input.teamId))
      .returning({ id: workspaceTeam.id })
      .then((rows) => {
        if (rows.length === 0) {
          throw new ORPCError("NOT_FOUND");
        }
      });
  });

  await cleanupSharedNodesForDeletedTeam(input.teamId, now);

  return {
    teamId: input.teamId,
    deleted: true,
  };
}

export async function listTeamMembers(actorUserId: string, input: { teamId: string }) {
  await requireTeamMembership(actorUserId, input.teamId);

  const members = await db
    .select({
      userId: workspaceTeamMember.userId,
      role: workspaceTeamMember.role,
      userName: user.name,
      userEmail: user.email,
      userAvatar: user.image,
      joinedAt: workspaceTeamMember.createdAt,
      updatedAt: workspaceTeamMember.updatedAt,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId));

  return members.map((member) => ({
    teamId: input.teamId,
    userId: member.userId,
    userName: member.userName,
    userEmail: member.userEmail,
    userAvatar: formatAvatarUrl(member.userAvatar),
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  }));
}

export async function addTeamMember(
  actorUserId: string,
  input: {
    teamId: string;
    userEmail: string;
    role: WorkspaceTeamRole;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [targetUser] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.email, input.userEmail))
    .limit(1);

  if (!targetUser) {
    throw new ORPCError("NOT_FOUND");
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ userId: workspaceTeamMember.userId })
      .from(workspaceTeamMember)
      .where(
        and(
          eq(workspaceTeamMember.teamId, input.teamId),
          eq(workspaceTeamMember.userId, targetUser.id),
        ),
      )
      .limit(1);

    if (existing) {
      await tx
        .update(workspaceTeamMember)
        .set({
          role: input.role,
          updatedAt: now,
        })
        .where(
          and(
            eq(workspaceTeamMember.teamId, input.teamId),
            eq(workspaceTeamMember.userId, targetUser.id),
          ),
        );
    } else {
      await assertWithinLimit(input.teamId, "members", { tx });
      await tx.insert(workspaceTeamMember).values({
        id: createWorkspaceId("team-member"),
        teamId: input.teamId,
        userId: targetUser.id,
        role: input.role,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx
      .update(workspaceTeam)
      .set({
        updatedAt: now,
      })
      .where(eq(workspaceTeam.id, input.teamId));
  });

  const members = await listTeamMembers(actorUserId, { teamId: input.teamId });
  const member = members.find((item) => item.userId === targetUser.id);
  if (!member) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "The team member was added but could not be loaded.",
    });
  }
  return member;
}

export async function updateTeamMemberRole(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    role: WorkspaceTeamRole;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  if (input.userId === actorUserId && input.role !== "owner") {
    const ownerCountRows = await db
      .select({ id: workspaceTeamMember.id })
      .from(workspaceTeamMember)
      .where(
        and(eq(workspaceTeamMember.teamId, input.teamId), eq(workspaceTeamMember.role, "owner")),
      );

    if (ownerCountRows.length <= 1) {
      throw new ORPCError("BAD_REQUEST");
    }
  }

  const now = new Date();
  const [updated] = await db
    .update(workspaceTeamMember)
    .set({
      role: input.role,
      updatedAt: now,
    })
    .where(
      and(
        eq(workspaceTeamMember.teamId, input.teamId),
        eq(workspaceTeamMember.userId, input.userId),
      ),
    )
    .returning({
      teamId: workspaceTeamMember.teamId,
      userId: workspaceTeamMember.userId,
      role: workspaceTeamMember.role,
    });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  await touchTeam(input.teamId, now);

  return updated;
}

export async function removeTeamMember(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  if (input.userId === actorUserId) {
    const ownerCountRows = await db
      .select({ id: workspaceTeamMember.id })
      .from(workspaceTeamMember)
      .where(
        and(eq(workspaceTeamMember.teamId, input.teamId), eq(workspaceTeamMember.role, "owner")),
      );

    if (ownerCountRows.length <= 1) {
      throw new ORPCError("BAD_REQUEST");
    }
  }

  const [removed] = await db
    .delete(workspaceTeamMember)
    .where(
      and(
        eq(workspaceTeamMember.teamId, input.teamId),
        eq(workspaceTeamMember.userId, input.userId),
      ),
    )
    .returning({
      teamId: workspaceTeamMember.teamId,
      userId: workspaceTeamMember.userId,
    });

  if (!removed) {
    throw new ORPCError("NOT_FOUND");
  }

  const now = new Date();
  await touchTeam(input.teamId, now);

  return {
    ...removed,
    removed: true,
  };
}
