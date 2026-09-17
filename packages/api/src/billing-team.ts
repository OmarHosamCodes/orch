import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import { db } from "@orch/db";
import { user, workspaceTeam, workspaceTeamBilling } from "@orch/db/schema";
import {
  AGENCY_PLAN_LIMITS,
  agencyEnabled,
  resolvePlanAt,
  type AgencyPlan,
  type AgencyPlanLimits,
} from "@orch/workspace/tiers";

export type TeamBillingSnapshot = {
  teamId: string;
  plan: AgencyPlan;
  seats: number;
  trialEndsAt: string;
  polarSubscriptionId: string | null;
  polarProductId: string | null;
  orchMessagesUsed: number;
  orchMessagesIncluded: number;
  orchCreditsRemaining: number;
  limits: AgencyPlanLimits;
};

type BillingInsertTarget = {
  insert: typeof db.insert;
};

function notEntitledError() {
  return new ORPCError("FORBIDDEN", {
    message: "This agency is not subscribed.",
    data: { code: "not_entitled", plan: null },
  });
}

export async function insertTrialBilling(target: BillingInsertTarget, teamId: string, now: Date) {
  await target.insert(workspaceTeamBilling).values({
    teamId,
    plan: "trial",
    seats: 1,
    trialEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  });
}

export async function getTeamBilling(
  teamId: string,
  now = new Date(),
): Promise<TeamBillingSnapshot> {
  let [billing] = await db
    .select()
    .from(workspaceTeamBilling)
    .where(eq(workspaceTeamBilling.teamId, teamId))
    .limit(1);

  if (!billing) {
    const [team] = await db
      .select({ id: workspaceTeam.id })
      .from(workspaceTeam)
      .where(eq(workspaceTeam.id, teamId))
      .limit(1);

    if (!team) {
      throw notEntitledError();
    }

    await insertTrialBilling(db, teamId, now);
    [billing] = await db
      .select()
      .from(workspaceTeamBilling)
      .where(eq(workspaceTeamBilling.teamId, teamId))
      .limit(1);

    if (!billing) {
      throw notEntitledError();
    }
  }

  const resolvedPlan = resolvePlanAt({
    storedPlan: billing.plan,
    trialEndsAt: billing.trialEndsAt,
    now,
  });
  const [owner] =
    billing.plan === "trial" || billing.plan === "leftover"
      ? await db
          .select({ lifetimePro: user.lifetimePro })
          .from(workspaceTeam)
          .innerJoin(user, eq(workspaceTeam.createdByUserId, user.id))
          .where(eq(workspaceTeam.id, teamId))
          .limit(1)
      : [];
  const plan = owner?.lifetimePro ? "agency_unlimited" : resolvedPlan;
  const limits = AGENCY_PLAN_LIMITS[plan];

  return {
    teamId: billing.teamId,
    plan,
    seats: plan === "agency_unlimited" && owner?.lifetimePro ? 1 : billing.seats,
    trialEndsAt: billing.trialEndsAt.toISOString(),
    polarSubscriptionId: billing.polarSubscriptionId,
    polarProductId: billing.polarProductId,
    orchMessagesUsed: billing.orchMessagesUsed,
    orchMessagesIncluded: limits.orchMessagesIncluded,
    orchCreditsRemaining: billing.orchCreditsRemaining,
    limits,
  };
}

export async function assertAgencyEntitled(teamId: string, now = new Date()) {
  const snapshot = await getTeamBilling(teamId, now);
  if (!agencyEnabled(snapshot.plan)) {
    throw new ORPCError("FORBIDDEN", {
      message:
        snapshot.plan === "leftover"
          ? "Trial ended. Subscribe to keep Tracker, projects, money, and people for this agency."
          : "This agency is not subscribed.",
      data: {
        code: snapshot.plan === "leftover" ? "trial_ended" : "not_entitled",
        plan: snapshot.plan,
      },
    });
  }
  return snapshot;
}

export async function applyPaidPlan(
  teamId: string,
  plan: Extract<AgencyPlan, "agency" | "agency_unlimited">,
  input: { seats: number },
) {
  const [updated] = await db
    .update(workspaceTeamBilling)
    .set({
      plan,
      seats: input.seats,
      updatedAt: new Date(),
    })
    .where(eq(workspaceTeamBilling.teamId, teamId))
    .returning({ teamId: workspaceTeamBilling.teamId });

  if (!updated) {
    throw notEntitledError();
  }
}
