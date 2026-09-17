import { ORPCError } from "@orpc/server";
import { and, count, eq, isNull, sql } from "drizzle-orm";

import { db } from "@orch/db";
import { env } from "@orch/env/server";
import {
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsProjectTask,
  user,
  workspaceTeam,
  workspaceTeamBilling,
  workspaceTeamBillingCreditGrant,
  workspaceTeamMember,
} from "@orch/db/schema";
import {
  AGENCY_PLAN_LIMITS,
  agencyEnabled,
  resolvePlanAt,
  type AgencyPlan,
  type AgencyPlanLimits,
} from "@orch/workspace/tiers";

import { getBillingStateForUser } from "./billing-guard";

export type PolarSubscriptionView = {
  teamId: string;
  subscriptionId: string;
  productId: string;
  seats: number;
  status: "active" | "canceled" | "revoked";
};

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

export type VolumeCapDbExecutor = {
  select: typeof db.select;
  update: typeof db.update;
};

function polarProProductIds(): string[] {
  return (env.POLAR_PRODUCT_PRO ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isPolarProProduct(productId: string): boolean {
  return polarProProductIds().includes(productId);
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function isAfterUtcMonth(now: Date, periodStart: Date): boolean {
  return startOfUtcMonth(now).getTime() > startOfUtcMonth(periodStart).getTime();
}

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

  return resolveTeamBillingSnapshot(teamId, billing, now, db);
}

function mapTeamBillingSnapshot(
  billing: typeof workspaceTeamBilling.$inferSelect,
  plan: AgencyPlan,
  seats = billing.seats,
): TeamBillingSnapshot {
  const limits = AGENCY_PLAN_LIMITS[plan];
  const floor = limits.orchMessagesIncluded;
  const orchMessagesIncluded =
    limits.orchMessagesPeriod === "month" ? floor * seats : floor;

  return {
    teamId: billing.teamId,
    plan,
    seats,
    trialEndsAt: billing.trialEndsAt.toISOString(),
    polarSubscriptionId: billing.polarSubscriptionId,
    polarProductId: billing.polarProductId,
    orchMessagesUsed: billing.orchMessagesUsed,
    orchMessagesIncluded,
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
  input: {
    seats: number;
    polarSubscriptionId?: string;
    polarProductId?: string;
  },
  executor: VolumeCapDbExecutor = db,
) {
  const [updated] = await executor
    .update(workspaceTeamBilling)
    .set({
      plan,
      seats: input.seats,
      ...(input.polarSubscriptionId !== undefined
        ? {
            polarSubscriptionId: input.polarSubscriptionId,
            polarProductId: input.polarProductId ?? null,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(workspaceTeamBilling.teamId, teamId))
    .returning({ teamId: workspaceTeamBilling.teamId });

  if (!updated) {
    throw notEntitledError();
  }
}

export async function applyCreditPack(
  teamId: string,
  input: { checkoutId: string; credits: number },
): Promise<{ applied: boolean }> {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(workspaceTeamBillingCreditGrant)
      .values({
        checkoutId: input.checkoutId,
        teamId,
        credits: input.credits,
        createdAt: now,
      })
      .onConflictDoNothing({ target: workspaceTeamBillingCreditGrant.checkoutId })
      .returning({ checkoutId: workspaceTeamBillingCreditGrant.checkoutId });

    if (!inserted) {
      return { applied: false };
    }

    const [updated] = await tx
      .update(workspaceTeamBilling)
      .set({
        orchCreditsRemaining: sql`${workspaceTeamBilling.orchCreditsRemaining} + ${input.credits}`,
        updatedAt: now,
      })
      .where(eq(workspaceTeamBilling.teamId, teamId))
      .returning({ teamId: workspaceTeamBilling.teamId });

    if (!updated) {
      throw notEntitledError();
    }

    return { applied: true };
  });
}

export async function applyPolarSnapshot(
  teamId: string,
  polar: PolarSubscriptionView,
): Promise<void> {
  if (polar.status !== "active" || !isPolarProProduct(polar.productId)) {
    return;
  }

  await applyPaidPlan(teamId, "agency", {
    seats: Math.max(1, polar.seats),
    polarSubscriptionId: polar.subscriptionId,
    polarProductId: polar.productId,
  });
}

export type VolumeCounter =
  | "clients"
  | "projects"
  | "tasksPerProject"
  | "nodes"
  | "blocks"
  | "tabs"
  | "members"
  | "orchMessages";

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

function volumeNoun(counter: VolumeCounter, limit: number): string {
  switch (counter) {
    case "clients":
      return limit === 1 ? "client" : "clients";
    case "projects":
      return limit === 1 ? "project" : "projects";
    case "tasksPerProject":
      return limit === 1 ? "task per project" : "tasks per project";
    case "nodes":
      return limit === 1 ? "workspace node" : "workspace nodes";
    case "blocks":
      return limit === 1 ? "block per tab" : "blocks per tab";
    case "tabs":
      return limit === 1 ? "tab per node" : "tabs per node";
    case "members":
      return limit === 1 ? "member" : "members";
    case "orchMessages":
      return limit === 1 ? "Orch message" : "Orch messages";
    default: {
      const _exhaustive: never = counter;
      return _exhaustive;
    }
  }
}

function limitReachedError(plan: AgencyPlan, counter: VolumeCounter, n: number) {
  return new ORPCError("FORBIDDEN", {
    message: `This agency can have ${n} ${volumeNoun(counter, n)} on ${planPhrase(plan)}. Subscribe to add more.`,
    data: { code: "limit_reached", plan, counter, limit: n },
  });
}

function seatRequiredError(seats: number) {
  return new ORPCError("FORBIDDEN", {
    message: "Every member needs a seat. Add a seat to invite them.",
    data: { code: "seat_required", seats },
  });
}

function uploadBlockedError() {
  return new ORPCError("FORBIDDEN", {
    message: "File uploads are included with Agency. Subscribe to attach files.",
    data: { code: "upload_blocked" },
  });
}

function orchCreditsError() {
  return new ORPCError("FORBIDDEN", {
    message: "This agency has used its included Orch messages. Buy credits to continue.",
    data: { code: "orch_credits" },
  });
}

function numericLimit(value: number | null | undefined): number | null {
  if (value == null) return null;
  return value;
}

type TeamBillingRow = typeof workspaceTeamBilling.$inferSelect;

async function maybeRollOrchMessagesPeriod(
  billing: TeamBillingRow,
  plan: AgencyPlan,
  now: Date,
  executor: VolumeCapDbExecutor,
): Promise<TeamBillingRow> {
  const limits = AGENCY_PLAN_LIMITS[plan];
  if (limits.orchMessagesPeriod !== "month") {
    return billing;
  }

  if (!isAfterUtcMonth(now, billing.orchMessagesPeriodStart)) {
    return billing;
  }

  const periodStart = startOfUtcMonth(now);
  const [updated] = await executor
    .update(workspaceTeamBilling)
    .set({
      orchMessagesUsed: 0,
      orchMessagesPeriodStart: periodStart,
      updatedAt: now,
    })
    .where(eq(workspaceTeamBilling.teamId, billing.teamId))
    .returning();

  return updated ?? billing;
}

async function lockTeamBillingRowForVolumeCap(
  executor: VolumeCapDbExecutor,
  teamId: string,
): Promise<TeamBillingRow> {
  const [billing] = await executor
    .select()
    .from(workspaceTeamBilling)
    .where(eq(workspaceTeamBilling.teamId, teamId))
    .for("update")
    .limit(1);

  if (!billing) {
    throw notEntitledError();
  }

  return billing;
}

async function resolveTeamBillingSnapshot(
  teamId: string,
  billing: TeamBillingRow,
  now: Date,
  executor: VolumeCapDbExecutor = db,
): Promise<TeamBillingSnapshot> {
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
    const seats = billing.polarSubscriptionId ? billing.seats : 1;
    const rolled = await maybeRollOrchMessagesPeriod(billing, lifetimePlan, now, executor);
    return mapTeamBillingSnapshot(rolled, lifetimePlan, seats);
  }

  if (resolvedPlan === "agency" || resolvedPlan === "agency_unlimited") {
    const rolled = await maybeRollOrchMessagesPeriod(billing, resolvedPlan, now, executor);
    return mapTeamBillingSnapshot(rolled, resolvedPlan);
  }

  const ownerBilling = owner ? await getBillingStateForUser(owner.id) : null;
  const plan = resolveTeamBillingPlanOverlay({
    snapshotPlan: resolvedPlan,
    lifetimePro: false,
    ownerTier: ownerBilling?.tier ?? "free",
  });
  if (plan === "agency") {
    await applyPaidPlan(teamId, plan, { seats: 1 }, executor);
  }

  const rolled = await maybeRollOrchMessagesPeriod(billing, plan, now, executor);
  return mapTeamBillingSnapshot(rolled, plan);
}

export async function consumeOrchMessage(
  teamId: string,
  now = new Date(),
  tx?: VolumeCapDbExecutor,
): Promise<void> {
  const consume = async (executor: VolumeCapDbExecutor) => {
    const billing = await lockTeamBillingRowForVolumeCap(executor, teamId);
    const snapshot = await resolveTeamBillingSnapshot(teamId, billing, now, executor);

    if (snapshot.orchMessagesUsed < snapshot.orchMessagesIncluded) {
      await executor
        .update(workspaceTeamBilling)
        .set({
          orchMessagesUsed: snapshot.orchMessagesUsed + 1,
          updatedAt: now,
        })
        .where(eq(workspaceTeamBilling.teamId, teamId));
      return;
    }

    if (snapshot.orchCreditsRemaining > 0) {
      await executor
        .update(workspaceTeamBilling)
        .set({
          orchCreditsRemaining: snapshot.orchCreditsRemaining - 1,
          updatedAt: now,
        })
        .where(eq(workspaceTeamBilling.teamId, teamId));
      return;
    }

    throw orchCreditsError();
  };

  if (tx) {
    await consume(tx);
    return;
  }

  await db.transaction(async (transaction) => {
    await consume(transaction);
  });
}

export async function assertWithinLimit(
  teamId: string,
  counter: VolumeCounter,
  extra?: {
    projectId?: string;
    adding?: number;
    count?: number;
    now?: Date;
    tx?: VolumeCapDbExecutor;
  },
) {
  const adding = extra?.adding ?? 1;
  const now = extra?.now ?? new Date();
  let limit: number | null;
  let used: number;
  const executor = extra?.tx ?? db;
  let snapshot: TeamBillingSnapshot;

  switch (counter) {
    case "clients": {
      const billing = await lockTeamBillingRowForVolumeCap(executor, teamId);
      snapshot = await resolveTeamBillingSnapshot(teamId, billing, now, executor);
      limit = numericLimit(snapshot.limits.clients);
      used = (
        await executor
          .select({ value: count() })
          .from(agencyOpsClient)
          .where(and(eq(agencyOpsClient.teamId, teamId), isNull(agencyOpsClient.archivedAt)))
      )[0]!.value;
      break;
    }
    case "projects": {
      const billing = await lockTeamBillingRowForVolumeCap(executor, teamId);
      snapshot = await resolveTeamBillingSnapshot(teamId, billing, now, executor);
      limit = numericLimit(snapshot.limits.projects);
      used = (
        await executor
          .select({ value: count() })
          .from(agencyOpsProject)
          .where(and(eq(agencyOpsProject.teamId, teamId), isNull(agencyOpsProject.deletedAt)))
      )[0]!.value;
      break;
    }
    case "tasksPerProject": {
      if (!extra?.projectId) {
        throw new ORPCError("BAD_REQUEST", { message: "projectId is required." });
      }
      const billing = await lockTeamBillingRowForVolumeCap(executor, teamId);
      snapshot = await resolveTeamBillingSnapshot(teamId, billing, now, executor);
      limit = numericLimit(snapshot.limits.tasksPerProject);
      used = (
        await executor
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
    case "nodes": {
      snapshot = await getTeamBilling(teamId, now);
      if (extra?.count == null) {
        throw new ORPCError("BAD_REQUEST", { message: "count is required." });
      }
      limit = snapshot.limits.workspaceNodes;
      used = extra.count;
      break;
    }
    case "blocks": {
      snapshot = await getTeamBilling(teamId, now);
      if (extra?.count == null) {
        throw new ORPCError("BAD_REQUEST", { message: "count is required." });
      }
      limit = snapshot.limits.blocksPerTab;
      used = extra.count;
      break;
    }
    case "tabs": {
      snapshot = await getTeamBilling(teamId, now);
      if (extra?.count == null) {
        throw new ORPCError("BAD_REQUEST", { message: "count is required." });
      }
      limit = snapshot.limits.tabsPerNode;
      used = extra.count;
      break;
    }
    case "members": {
      const billing = await lockTeamBillingRowForVolumeCap(executor, teamId);
      snapshot = await resolveTeamBillingSnapshot(teamId, billing, now, executor);
      limit = snapshot.seats;
      used = (
        await executor
          .select({ value: count() })
          .from(workspaceTeamMember)
          .where(eq(workspaceTeamMember.teamId, teamId))
      )[0]!.value;
      break;
    }
    case "orchMessages": {
      const billing = await lockTeamBillingRowForVolumeCap(executor, teamId);
      snapshot = await resolveTeamBillingSnapshot(teamId, billing, now, executor);
      const remainingIncluded = snapshot.orchMessagesIncluded - snapshot.orchMessagesUsed;
      if (adding <= remainingIncluded) return;
      if (adding <= snapshot.orchCreditsRemaining) return;
      throw orchCreditsError();
    }
    default: {
      const _exhaustive: never = counter;
      throw new ORPCError("BAD_REQUEST", { message: String(_exhaustive) });
    }
  }

  if (limit == null) return;

  const projected =
    counter === "nodes" || counter === "blocks" || counter === "tabs" ? used : used + adding;
  if (projected > limit) {
    if (counter === "members") {
      throw seatRequiredError(snapshot.seats);
    }
    throw limitReachedError(snapshot.plan, counter, limit);
  }
}

export async function assertTaskAndKnowledgeUploadsAllowed(teamId: string, now = new Date()) {
  const snapshot = await getTeamBilling(teamId, now);
  if (!snapshot.limits.taskAndKnowledgeUploads) {
    throw uploadBlockedError();
  }
}
