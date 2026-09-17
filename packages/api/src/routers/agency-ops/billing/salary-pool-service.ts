import { db } from "@orch/db";
import {
  agencyOpsPayoutLine,
  agencyOpsPayoutRun,
  agencyOpsPayoutSection,
  agencyOpsSalaryPool,
} from "@orch/db/schema";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";

import { parseIsoDateTime } from "../shared/date-helpers";
import { requireAgencyRole } from "../shared/membership";
import { loadMoneyResolveContext } from "./money-fx-service";
import { ensurePayoutPeriod } from "./payout-service";
import {
  nextPoolPaidAmount,
  periodHasRateDerivedSalaryLines,
  salaryPoolRemaining,
  salaryPoolTotalsFromPool,
  validateSalaryPoolCreateAllowed,
  validateSalaryPoolPayment,
  validateSalaryPoolTotalUpdate,
} from "./salary-pool";

export type AgencySalaryPoolRecord = {
  id: string;
  teamId: string;
  runId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
};

export type AgencySalaryPoolDetail = {
  pool: AgencySalaryPoolRecord | null;
};

type SalaryPoolRow = typeof agencyOpsSalaryPool.$inferSelect;

function mapPoolRecord(
  pool: SalaryPoolRow,
  run: typeof agencyOpsPayoutRun.$inferSelect,
): AgencySalaryPoolRecord {
  const paidAmount = pool.paidAmount;
  return {
    id: pool.id,
    teamId: pool.teamId,
    runId: pool.runId,
    totalAmount: pool.totalAmount,
    paidAmount,
    remainingAmount: salaryPoolRemaining(pool.totalAmount, paidAmount),
    currency: pool.currency,
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    createdAt: pool.createdAt.toISOString(),
    updatedAt: pool.updatedAt.toISOString(),
  };
}

async function loadRateDerivedSalaryLines(teamId: string, periodStart: Date, periodEnd: Date) {
  return db
    .select({
      payeeUserId: agencyOpsPayoutLine.payeeUserId,
      amount: agencyOpsPayoutLine.amount,
    })
    .from(agencyOpsPayoutLine)
    .innerJoin(agencyOpsPayoutSection, eq(agencyOpsPayoutSection.id, agencyOpsPayoutLine.sectionId))
    .innerJoin(agencyOpsPayoutRun, eq(agencyOpsPayoutRun.id, agencyOpsPayoutSection.runId))
    .where(
      and(
        eq(agencyOpsPayoutRun.teamId, teamId),
        eq(agencyOpsPayoutRun.periodStart, periodStart),
        eq(agencyOpsPayoutRun.periodEnd, periodEnd),
        eq(agencyOpsPayoutSection.key, "salaries"),
      ),
    );
}

export async function loadSalaryPoolPeriodTotals(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
  },
): Promise<{
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
} | null> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  const loaded = await loadSalaryPoolRowByPeriod(input.teamId, periodStart, periodEnd);
  if (!loaded) return null;

  const totals = salaryPoolTotalsFromPool({
    totalAmount: loaded.pool.totalAmount,
    paidAmount: loaded.pool.paidAmount,
    currency: loaded.pool.currency,
  });

  return {
    totalAmount: totals.totalAmount,
    paidAmount: totals.paidAmount,
    remainingAmount: totals.remainingAmount,
    currency: totals.currency,
  };
}

async function loadSalaryPoolRowByPeriod(
  teamId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{ pool: SalaryPoolRow; run: typeof agencyOpsPayoutRun.$inferSelect } | null> {
  const [row] = await db
    .select({
      pool: agencyOpsSalaryPool,
      run: agencyOpsPayoutRun,
    })
    .from(agencyOpsSalaryPool)
    .innerJoin(agencyOpsPayoutRun, eq(agencyOpsPayoutRun.id, agencyOpsSalaryPool.runId))
    .where(
      and(
        eq(agencyOpsSalaryPool.teamId, teamId),
        eq(agencyOpsPayoutRun.periodStart, periodStart),
        eq(agencyOpsPayoutRun.periodEnd, periodEnd),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function getSalaryPool(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
  },
): Promise<AgencySalaryPoolDetail> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  const loaded = await loadSalaryPoolRowByPeriod(input.teamId, periodStart, periodEnd);
  if (!loaded) {
    return { pool: null };
  }

  return {
    pool: mapPoolRecord(loaded.pool, loaded.run),
  };
}

export async function upsertSalaryPoolTotal(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
    totalAmount: number;
    currency?: string;
  },
): Promise<AgencySalaryPoolRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const run = await ensurePayoutPeriod(actorUserId, {
    teamId: input.teamId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    currency: input.currency,
  });

  const [existingPool, rateLines] = await Promise.all([
    loadSalaryPoolRowByPeriod(input.teamId, periodStart, periodEnd),
    loadRateDerivedSalaryLines(input.teamId, periodStart, periodEnd),
  ]);

  const paidTotal = existingPool?.pool.paidAmount ?? 0;
  const totalError = validateSalaryPoolTotalUpdate(input.totalAmount, paidTotal);
  if (totalError) {
    throw new ORPCError("BAD_REQUEST", { message: totalError });
  }

  if (!existingPool) {
    const createError = validateSalaryPoolCreateAllowed(periodHasRateDerivedSalaryLines(rateLines));
    if (createError) {
      throw new ORPCError("CONFLICT", { message: createError });
    }
  }

  const moneyCtx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
  const sourceCurrency = (input.currency ?? run.currency).toUpperCase();
  const resolved = moneyCtx.resolve(input.totalAmount, sourceCurrency);

  if (existingPool) {
    const [updated] = await db
      .update(agencyOpsSalaryPool)
      .set({
        totalAmount: resolved.amount,
        currency: moneyCtx.agencyCurrency,
        sourceAmount: resolved.sourceAmount,
        fxRate: resolved.fxRate,
        fxAsOf: resolved.fxAsOf ? new Date(resolved.fxAsOf) : null,
        updatedAt: new Date(),
      })
      .where(eq(agencyOpsSalaryPool.id, existingPool.pool.id))
      .returning();

    if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

    const [runRow] = await db
      .select()
      .from(agencyOpsPayoutRun)
      .where(eq(agencyOpsPayoutRun.id, run.id))
      .limit(1);
    if (!runRow) throw new ORPCError("INTERNAL_SERVER_ERROR");

    return mapPoolRecord(updated, runRow);
  }

  const poolId = createWorkspaceId("agency-salary-pool");
  const [inserted] = await db
    .insert(agencyOpsSalaryPool)
    .values({
      id: poolId,
      teamId: input.teamId,
      runId: run.id,
      totalAmount: resolved.amount,
      paidAmount: 0,
      currency: moneyCtx.agencyCurrency,
      sourceAmount: resolved.sourceAmount,
      fxRate: resolved.fxRate,
      fxAsOf: resolved.fxAsOf ? new Date(resolved.fxAsOf) : null,
      createdByUserId: actorUserId,
    })
    .returning();

  if (!inserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  const [runRow] = await db
    .select()
    .from(agencyOpsPayoutRun)
    .where(eq(agencyOpsPayoutRun.id, run.id))
    .limit(1);
  if (!runRow) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return mapPoolRecord(inserted, runRow);
}

export async function recordSalaryPoolPayment(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
  },
): Promise<AgencySalaryPoolRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        pool: agencyOpsSalaryPool,
        run: agencyOpsPayoutRun,
      })
      .from(agencyOpsSalaryPool)
      .innerJoin(agencyOpsPayoutRun, eq(agencyOpsPayoutRun.id, agencyOpsSalaryPool.runId))
      .where(
        and(
          eq(agencyOpsSalaryPool.teamId, input.teamId),
          eq(agencyOpsPayoutRun.periodStart, periodStart),
          eq(agencyOpsPayoutRun.periodEnd, periodEnd),
        ),
      )
      .limit(1)
      .for("update", { of: agencyOpsSalaryPool });

    if (!row) {
      throw new ORPCError("NOT_FOUND", {
        message: "Create a Team salaries total for this period first.",
      });
    }

    const poolRemaining = salaryPoolRemaining(row.pool.totalAmount, row.pool.paidAmount);
    const paymentError = validateSalaryPoolPayment({
      paymentAmount: input.amount,
      poolRemaining,
    });
    if (paymentError) {
      throw new ORPCError("BAD_REQUEST", { message: paymentError });
    }

    const nextPaid = nextPoolPaidAmount(row.pool.paidAmount, input.amount);
    const now = new Date();

    const [updated] = await tx
      .update(agencyOpsSalaryPool)
      .set({
        paidAmount: nextPaid,
        updatedAt: now,
      })
      .where(eq(agencyOpsSalaryPool.id, row.pool.id))
      .returning();

    if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

    return mapPoolRecord(updated, row.run);
  });

  return result;
}

export async function assertNoSalaryPoolForRateDerivedExport(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
  },
): Promise<void> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  const loaded = await loadSalaryPoolRowByPeriod(input.teamId, periodStart, periodEnd);
  if (!loaded) return;

  throw new ORPCError("CONFLICT", {
    message:
      "This period uses a manual Team salaries pool. Rate-derived salary line export is blocked.",
  });
}
