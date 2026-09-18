import { and, eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

import { db } from "@orch/db";
import { user } from "@orch/db/schema";

import { personalAgencyName } from "../team/ensure-personal-agency";
import { createTeam, listUserTeams } from "../team/service";
import { resolveFirstRunStatus, type FirstRunStatus } from "./first-run-status";

export type FirstRunJoinTeam = {
  id: string;
  name: string;
};

export type FirstRunSession = {
  status: FirstRunStatus;
  completedAt: string | null;
  membershipCount: number;
  joinTeam: FirstRunJoinTeam | null;
  defaultAgencyName: string;
};

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

export async function getFirstRun(
  actorUserId: string,
  _input: Record<string, never>,
): Promise<FirstRunSession> {
  const [row] = await db
    .select({
      name: user.name,
      onboardingCompletedAt: user.onboardingCompletedAt,
    })
    .from(user)
    .where(eq(user.id, actorUserId))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "User not found." });
  }

  const teams = await listUserTeams(actorUserId, {});
  const joinTeam = teams[0] ? { id: teams[0].id, name: teams[0].name } : null;

  return {
    status: resolveFirstRunStatus({
      completedAt: row.onboardingCompletedAt,
      membershipCount: teams.length,
    }),
    completedAt: toIso(row.onboardingCompletedAt),
    membershipCount: teams.length,
    joinTeam,
    defaultAgencyName: personalAgencyName(row.name),
  };
}

export async function markFirstRunComplete(
  actorUserId: string,
  _input: Record<string, never>,
): Promise<FirstRunSession> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, actorUserId))
    .limit(1);
  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "User not found." });
  }

  await db
    .update(user)
    .set({ onboardingCompletedAt: new Date() })
    .where(and(eq(user.id, actorUserId), isNull(user.onboardingCompletedAt)));

  return getFirstRun(actorUserId, {});
}

export async function createFirstAgency(
  actorUserId: string,
  input: { name: string },
): Promise<{ team: Awaited<ReturnType<typeof createTeam>>; firstRun: FirstRunSession }> {
  const team = await createTeam(actorUserId, { name: input.name });
  const firstRun = await markFirstRunComplete(actorUserId, {});
  return { team, firstRun };
}
