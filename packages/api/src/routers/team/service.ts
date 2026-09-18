import { ORPCError } from "@orpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  createWorkspaceId,
  normalizeWorkspaceNode,
  type WorkspaceNode,
  type WorkspaceTeamRole,
} from "@orch/workspace";
import { db } from "@orch/db";
import {
  dashboardWorkspace,
  user,
  workspaceTeam,
  workspaceTeamInvite,
  workspaceTeamMember,
} from "@orch/db/schema";

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
  const pendingInvites = await listTeamPendingInvites(input.teamId);

  return {
    id: input.teamId,
    name: membership.teamName,
    image: membership.teamImage ?? null,
    role: membership.role,
    createdByUserId: membership.createdByUserId,
    updatedAt: membership.updatedAt.toISOString(),
    members,
    pendingInvites,
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

const invitedByUser = alias(user, "invited_by_user");

function displayName(name: string | null | undefined, email: string) {
  const trimmed = name?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : email;
}

function mapInviteRow(row: {
  id: string;
  teamId: string;
  teamName: string;
  teamImage: string | null;
  invitedUserId: string;
  invitedEmail: string;
  invitedName: string;
  invitedAvatar: string | null;
  invitedByUserId: string;
  invitedByName: string;
  invitedByAvatar: string | null;
  role: WorkspaceTeamRole;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  updatedAt: Date;
  respondedAt: Date | null;
}) {
  return {
    id: row.id,
    teamId: row.teamId,
    teamName: row.teamName,
    teamImage: row.teamImage,
    invitedUserId: row.invitedUserId,
    invitedEmail: row.invitedEmail,
    invitedName: displayName(row.invitedName, row.invitedEmail),
    invitedAvatar: formatAvatarUrl(row.invitedAvatar),
    invitedByUserId: row.invitedByUserId,
    invitedByName: displayName(row.invitedByName, "Someone"),
    invitedByAvatar: formatAvatarUrl(row.invitedByAvatar),
    role: row.role,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
  };
}

const inviteSelect = {
  id: workspaceTeamInvite.id,
  teamId: workspaceTeamInvite.teamId,
  teamName: workspaceTeam.name,
  teamImage: workspaceTeam.image,
  invitedUserId: workspaceTeamInvite.invitedUserId,
  invitedEmail: user.email,
  invitedName: user.name,
  invitedAvatar: user.image,
  invitedByUserId: workspaceTeamInvite.invitedByUserId,
  invitedByName: invitedByUser.name,
  invitedByAvatar: invitedByUser.image,
  role: workspaceTeamInvite.role,
  status: workspaceTeamInvite.status,
  createdAt: workspaceTeamInvite.createdAt,
  updatedAt: workspaceTeamInvite.updatedAt,
  respondedAt: workspaceTeamInvite.respondedAt,
};

async function loadInviteById(inviteId: string) {
  const [row] = await db
    .select(inviteSelect)
    .from(workspaceTeamInvite)
    .innerJoin(workspaceTeam, eq(workspaceTeam.id, workspaceTeamInvite.teamId))
    .innerJoin(user, eq(user.id, workspaceTeamInvite.invitedUserId))
    .innerJoin(invitedByUser, eq(invitedByUser.id, workspaceTeamInvite.invitedByUserId))
    .where(eq(workspaceTeamInvite.id, inviteId))
    .limit(1);

  return row ? mapInviteRow(row) : null;
}

async function listTeamPendingInvites(teamId: string) {
  const rows = await db
    .select(inviteSelect)
    .from(workspaceTeamInvite)
    .innerJoin(workspaceTeam, eq(workspaceTeam.id, workspaceTeamInvite.teamId))
    .innerJoin(user, eq(user.id, workspaceTeamInvite.invitedUserId))
    .innerJoin(invitedByUser, eq(invitedByUser.id, workspaceTeamInvite.invitedByUserId))
    .where(and(eq(workspaceTeamInvite.teamId, teamId), eq(workspaceTeamInvite.status, "pending")))
    .orderBy(desc(workspaceTeamInvite.createdAt));

  return rows.map(mapInviteRow);
}

export async function listMyTeamInvites(actorUserId: string, _input: Record<string, never>) {
  const rows = await db
    .select(inviteSelect)
    .from(workspaceTeamInvite)
    .innerJoin(workspaceTeam, eq(workspaceTeam.id, workspaceTeamInvite.teamId))
    .innerJoin(user, eq(user.id, workspaceTeamInvite.invitedUserId))
    .innerJoin(invitedByUser, eq(invitedByUser.id, workspaceTeamInvite.invitedByUserId))
    .where(
      and(
        eq(workspaceTeamInvite.invitedUserId, actorUserId),
        eq(workspaceTeamInvite.status, "pending"),
      ),
    )
    .orderBy(desc(workspaceTeamInvite.createdAt));

  return rows.map(mapInviteRow);
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

  if (targetUser.id === actorUserId) {
    throw new ORPCError("BAD_REQUEST", { message: "You can't invite yourself." });
  }

  const now = new Date();
  let inviteId = "";

  await db.transaction(async (tx) => {
    const [existingMember] = await tx
      .select({ userId: workspaceTeamMember.userId })
      .from(workspaceTeamMember)
      .where(
        and(
          eq(workspaceTeamMember.teamId, input.teamId),
          eq(workspaceTeamMember.userId, targetUser.id),
        ),
      )
      .limit(1);

    if (existingMember) {
      throw new ORPCError("CONFLICT", { message: "They're already on this agency." });
    }

    const [existingInvite] = await tx
      .select({
        id: workspaceTeamInvite.id,
        status: workspaceTeamInvite.status,
      })
      .from(workspaceTeamInvite)
      .where(
        and(
          eq(workspaceTeamInvite.teamId, input.teamId),
          eq(workspaceTeamInvite.invitedUserId, targetUser.id),
        ),
      )
      .limit(1);

    if (existingInvite?.status === "accepted") {
      throw new ORPCError("CONFLICT", { message: "They're already on this agency." });
    }

    if (existingInvite?.status === "pending") {
      await tx
        .update(workspaceTeamInvite)
        .set({
          role: input.role,
          invitedByUserId: actorUserId,
          updatedAt: now,
        })
        .where(eq(workspaceTeamInvite.id, existingInvite.id));
      inviteId = existingInvite.id;
    } else {
      await assertWithinLimit(input.teamId, "members", { tx });
      if (existingInvite) {
        await tx
          .update(workspaceTeamInvite)
          .set({
            role: input.role,
            invitedByUserId: actorUserId,
            status: "pending",
            respondedAt: null,
            updatedAt: now,
          })
          .where(eq(workspaceTeamInvite.id, existingInvite.id));
        inviteId = existingInvite.id;
      } else {
        inviteId = createWorkspaceId("team-invite");
        await tx.insert(workspaceTeamInvite).values({
          id: inviteId,
          teamId: input.teamId,
          invitedUserId: targetUser.id,
          invitedByUserId: actorUserId,
          role: input.role,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await tx
      .update(workspaceTeam)
      .set({
        updatedAt: now,
      })
      .where(eq(workspaceTeam.id, input.teamId));
  });

  const invite = await loadInviteById(inviteId);
  if (!invite) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "The invite was created but could not be loaded.",
    });
  }
  return invite;
}

export async function acceptTeamInvite(actorUserId: string, input: { inviteId: string }) {
  const now = new Date();

  await db.transaction(async (tx) => {
    const [invite] = await tx
      .select({
        id: workspaceTeamInvite.id,
        teamId: workspaceTeamInvite.teamId,
        invitedUserId: workspaceTeamInvite.invitedUserId,
        role: workspaceTeamInvite.role,
        status: workspaceTeamInvite.status,
      })
      .from(workspaceTeamInvite)
      .where(eq(workspaceTeamInvite.id, input.inviteId))
      .limit(1);

    if (!invite || invite.invitedUserId !== actorUserId) {
      throw new ORPCError("NOT_FOUND", { message: "Invite not found." });
    }

    if (invite.status === "declined") {
      throw new ORPCError("BAD_REQUEST", { message: "This invite was declined." });
    }

    const [existingMember] = await tx
      .select({ userId: workspaceTeamMember.userId })
      .from(workspaceTeamMember)
      .where(
        and(
          eq(workspaceTeamMember.teamId, invite.teamId),
          eq(workspaceTeamMember.userId, actorUserId),
        ),
      )
      .limit(1);

    if (!existingMember) {
      await assertWithinLimit(invite.teamId, "members", { tx, adding: 0 });
      await tx.insert(workspaceTeamMember).values({
        id: createWorkspaceId("team-member"),
        teamId: invite.teamId,
        userId: actorUserId,
        role: invite.role,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (invite.status !== "accepted") {
      await tx
        .update(workspaceTeamInvite)
        .set({
          status: "accepted",
          respondedAt: now,
          updatedAt: now,
        })
        .where(eq(workspaceTeamInvite.id, invite.id));
    }

    await tx
      .update(user)
      .set({ onboardingCompletedAt: now })
      .where(and(eq(user.id, actorUserId), isNull(user.onboardingCompletedAt)));

    await tx
      .update(workspaceTeam)
      .set({
        updatedAt: now,
      })
      .where(eq(workspaceTeam.id, invite.teamId));
  });

  const invite = await loadInviteById(input.inviteId);
  if (!invite) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "The invite was accepted but could not be loaded.",
    });
  }

  const teams = await listUserTeams(actorUserId, {});
  const team = teams.find((item) => item.id === invite.teamId);
  if (!team) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "You joined the agency but it could not be loaded.",
    });
  }

  return { invite, team };
}

export async function declineTeamInvite(actorUserId: string, input: { inviteId: string }) {
  const now = new Date();

  const [invite] = await db
    .select({
      id: workspaceTeamInvite.id,
      invitedUserId: workspaceTeamInvite.invitedUserId,
      status: workspaceTeamInvite.status,
    })
    .from(workspaceTeamInvite)
    .where(eq(workspaceTeamInvite.id, input.inviteId))
    .limit(1);

  if (!invite || invite.invitedUserId !== actorUserId) {
    throw new ORPCError("NOT_FOUND", { message: "Invite not found." });
  }

  if (invite.status === "accepted") {
    throw new ORPCError("BAD_REQUEST", { message: "This invite was already accepted." });
  }

  if (invite.status !== "declined") {
    await db
      .update(workspaceTeamInvite)
      .set({
        status: "declined",
        respondedAt: now,
        updatedAt: now,
      })
      .where(eq(workspaceTeamInvite.id, invite.id));
  }

  const declined = await loadInviteById(input.inviteId);
  if (!declined) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "The invite was declined but could not be loaded.",
    });
  }
  return declined;
}

/** Test helper: send an invite and accept it as the invitee. */
export async function addAcceptedTeamMember(
  actorUserId: string,
  input: {
    teamId: string;
    userEmail: string;
    role: WorkspaceTeamRole;
  },
) {
  const invite = await addTeamMember(actorUserId, input);
  return acceptTeamInvite(invite.invitedUserId, { inviteId: invite.id });
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
