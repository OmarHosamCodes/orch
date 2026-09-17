import { db } from "@orch/db";
import { workspaceTeamMember } from "@orch/db/schema";
import type { WorkspaceTeamRole } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import { assertAgencyEntitled } from "../billing-team";

const TEAM_ROLE_WEIGHT: Record<WorkspaceTeamRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

function hasRoleAtLeast(role: WorkspaceTeamRole, required: WorkspaceTeamRole) {
  return TEAM_ROLE_WEIGHT[role] >= TEAM_ROLE_WEIGHT[required];
}

export async function requireTeamMembership(
  actorUserId: string,
  teamId: string,
  requiredRole: WorkspaceTeamRole = "viewer",
) {
  const [membership] = await db
    .select({ role: workspaceTeamMember.role })
    .from(workspaceTeamMember)
    .where(and(eq(workspaceTeamMember.teamId, teamId), eq(workspaceTeamMember.userId, actorUserId)))
    .limit(1);

  if (!membership) {
    throw new ORPCError("UNAUTHORIZED");
  }

  if (!hasRoleAtLeast(membership.role, requiredRole)) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return membership.role;
}

export async function requireAgencyRole(
  actorUserId: string,
  teamId: string,
  requiredRole: WorkspaceTeamRole,
  now?: Date,
) {
  const role = await requireTeamMembership(actorUserId, teamId, requiredRole);
  await assertAgencyEntitled(teamId, now);
  return role;
}
