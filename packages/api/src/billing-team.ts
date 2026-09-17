import { ORPCError } from "@orpc/server";
import { and, count, eq, isNull } from "drizzle-orm";

import { db } from "@orch/db";
import {
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsProjectTask,
  user,
  workspaceTeam,
  workspaceTeamBilling,
} from "@orch/db/schema";
import {
  AGENCY_PLAN_LIMITS,
  agencyEnabled,
  resolvePlanAt,
  type AgencyPlan,
  type AgencyPlanLimits,
} from "@orch/workspace/tiers";

import { getBillingStateForUser } from "./billing-guard";

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

export function resolveTeamBillingPlanOverlay(input: {
  snapshotPlan: AgencyPlan;
  lifetimePro: boolean;
  ownerTier: "free" | "pro";
}): AgencyPlan {
  if (input.lifetimePro) {
    return "agency_unlimited";
  }

  if (input.snapshotPlan === "agency" || input.snapshotPlan === "agency_unlimited") {
    return input.snapshotPlan;
  }

  return input.ownerTier === "pro" ? "agency" : input.snapshotPlan;
}

export async function insertTrialBilling(target: BillingInsertTarget, teamId: string, now: Date) {
  await target
    .insert(workspaceTeamBilling)
    .values({
      teamId,
      plan: "trial",
      seats: 1,
      trialEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
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

  const [owner] = await db
    .select({ id: user.id, lifetimePro: user.lifetimePro })
    .from(workspaceTeam)
    .innerJoin(user, eq(workspaceTeam.createdByUserId, user.id))
    .where(eq(workspaceTeam.id, teamId))
    .limit(1);
  const lifetimePlan = resolveTeamBillingPlanOverlay({
    snapshotPlan: resolvedPlan,
    lifetimePro: owner?.lifetimePro ?? false,
    ownerTier: "free",
  });
  if (lifetimePlan === "agency_unlimited") {
    return mapTeamBillingSnapshot(billing, lifetimePlan, 1);
  }

  if (resolvedPlan === "agency" || resolvedPlan === "agency_unlimited") {
    return mapTeamBillingSnapshot(billing, resolvedPlan);
  }

  const ownerBilling = owner ? await getBillingStateForUser(owner.id) : null;
  const plan = resolveTeamBillingPlanOverlay({
    snapshotPlan: resolvedPlan,
    lifetimePro: false,
    ownerTier: ownerBilling?.tier ?? "free",
  });
  if (plan === "agency") {
    await applyPaidPlan(teamId, plan, { seats: 1 });
  }

  return mapTeamBillingSnapshot(billing, plan);
}

function mapTeamBillingSnapshot(
  billing: typeof workspaceTeamBilling.$inferSelect,
  plan: AgencyPlan,
  seats = billing.seats,
): TeamBillingSnapshot {
  const limits = AGENCY_PLAN_LIMITS[plan];

  return {
    teamId: billing.teamId,
    plan,
    seats,
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

export type VolumeCounter =
  | "clients"
  | "projects"
  | "tasksPerProject"
  | "nodes"
  | "blocks"
  | "tabs";

function planPhrase(plan: AgencyPlan): string {
  switch (plan) {
    case "trial":
      return "the trial";
    case "leftover":
      return "leftover";
    case "agency":
      return "Agency";
    case "agency_unlimited":
      return "Agency Unlimited";
    default: {
      const _exhaustive: never = plan;
      return _exhaustive;
    }
  }
}

function volumeNoun(counter: VolumeCounter): string {
  switch (counter) {
    case "clients":
      return "clients";
    case "projects":
      return "projects";
    case "tasksPerProject":
      return "tasks per project";
    case "nodes":
      return "workspace nodes";
    case "blocks":
      return "blocks per tab";
    case "tabs":
      return "tabs per node";
    default: {
      const _exhaustive: never = counter;
      return _exhaustive;
    }
  }
}

function limitReachedError(plan: AgencyPlan, counter: VolumeCounter, n: number) {
  return new ORPCError("FORBIDDEN", {
    message: `This agency can have ${n} ${volumeNoun(counter)} on ${planPhrase(plan)}. Subscribe to add more.`,
    data: { code: "limit_reached", plan, counter, limit: n },
  });
}

function uploadBlockedError() {
  return new ORPCError("FORBIDDEN", {
    message: "File uploads are included with Agency. Subscribe to attach files.",
    data: { code: "upload_blocked" },
  });
}

function numericLimit(value: number | null | undefined): number | null {
  if (value == null) return null;
  return value;
}

export async function assertWithinLimit(
  teamId: string,
  counter: VolumeCounter,
  extra?: {
    projectId?: string;
    adding?: number;
    count?: number;
    now?: Date;
  },
) {
  const snapshot = await getTeamBilling(teamId, extra?.now);
  const adding = extra?.adding ?? 1;
  let limit: number | null;
  let used: number;

  switch (counter) {
    case "clients":
      limit = numericLimit(snapshot.limits.clients);
      used = (
        await db
          .select({ value: count() })
          .from(agencyOpsClient)
          .where(and(eq(agencyOpsClient.teamId, teamId), isNull(agencyOpsClient.archivedAt)))
      )[0]!.value;
      break;
    case "projects":
      limit = numericLimit(snapshot.limits.projects);
      used = (
        await db
          .select({ value: count() })
          .from(agencyOpsProject)
          .where(and(eq(agencyOpsProject.teamId, teamId), isNull(agencyOpsProject.deletedAt)))
      )[0]!.value;
      break;
    case "tasksPerProject": {
      if (!extra?.projectId) {
        throw new ORPCError("BAD_REQUEST", { message: "projectId is required." });
      }
      limit = numericLimit(snapshot.limits.tasksPerProject);
      used = (
        await db
          .select({ value: count() })
          .from(agencyOpsProjectTask)
          .where(
            and(
              eq(agencyOpsProjectTask.teamId, teamId),
              eq(agencyOpsProjectTask.projectId, extra.projectId),
            ),
          )
      )[0]!.value;
      break;
    }
    case "nodes":
      if (extra?.count == null) {
        throw new ORPCError("BAD_REQUEST", { message: "count is required." });
      }
      limit = snapshot.limits.workspaceNodes;
      used = extra.count;
      break;
    case "blocks":
      if (extra?.count == null) {
        throw new ORPCError("BAD_REQUEST", { message: "count is required." });
      }
      limit = snapshot.limits.blocksPerTab;
      used = extra.count;
      break;
    case "tabs":
      if (extra?.count == null) {
        throw new ORPCError("BAD_REQUEST", { message: "count is required." });
      }
      limit = snapshot.limits.tabsPerNode;
      used = extra.count;
      break;
    default: {
      const _exhaustive: never = counter;
      throw new ORPCError("BAD_REQUEST", { message: String(_exhaustive) });
    }
  }

  if (limit == null) return;

  const projected =
    counter === "nodes" || counter === "blocks" || counter === "tabs" ? used : used + adding;
  if (projected > limit) {
    throw limitReachedError(snapshot.plan, counter, limit);
  }
}

export async function assertTaskAndKnowledgeUploadsAllowed(teamId: string, now = new Date()) {
  const snapshot = await getTeamBilling(teamId, now);
  if (!snapshot.limits.taskAndKnowledgeUploads) {
    throw uploadBlockedError();
  }
}
