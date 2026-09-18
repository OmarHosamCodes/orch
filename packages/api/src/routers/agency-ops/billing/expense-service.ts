import { db } from "@orch/db";
import {
  agencyOpsExpense,
  agencyOpsExpenseOccurrence,
  type AgencyOpsExpenseAmountMode,
  type AgencyOpsExpenseKind,
  type AgencyOpsExpensePeriod,
  type AgencyOpsExpenseStatus,
} from "@orch/db/schema";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";

import { parseIsoDateTime } from "../shared/date-helpers";
import { requireAgencyRole } from "../shared/membership";
import {
  type AgencySubscriptionCycleRecord,
  buildSubscriptionCycleRecords,
  defaultExpenseNextDueAt,
  expensePeriodTotals,
  expenseRemainingAmount,
  expenseStatusAfterPaid,
  isSubscriptionVisibleInPeriod,
  planExpenseKindFields,
  planExpensePayment,
} from "./expense-helpers";
import { paginateItems, type PaginatedItems } from "./list-pagination";
import { loadMoneyResolveContext } from "./money-fx-service";

export type AgencyExpenseRecord = {
  id: string;
  teamId: string;
  name: string;
  kind: AgencyOpsExpenseKind;
  period: AgencyOpsExpensePeriod | null;
  note: string;
  amountMode: AgencyOpsExpenseAmountMode;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  sourceAmount: number | null;
  fxRate: string;
  status: AgencyOpsExpenseStatus;
  startsAt: string | null;
  nextDueAt: string | null;
  occurredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapExpenseRow(row: typeof agencyOpsExpense.$inferSelect): AgencyExpenseRecord {
  const paidAmount = row.paidAmount ?? 0;
  return {
    id: row.id,
    teamId: row.teamId,
    name: row.name,
    kind: row.kind,
    period: row.period ?? null,
    note: row.note ?? "",
    amountMode: row.amountMode ?? "fixed",
    amount: row.amount,
    paidAmount,
    remainingAmount: expenseRemainingAmount(row.amount, paidAmount),
    currency: row.currency,
    sourceAmount: row.sourceAmount ?? null,
    fxRate: row.fxRate,
    status: row.status,
    startsAt: row.startsAt?.toISOString() ?? null,
    nextDueAt: row.nextDueAt?.toISOString() ?? null,
    occurredAt: row.occurredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listExpenses(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart?: string;
    periodEnd?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<PaginatedItems<AgencyExpenseRecord>> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const periodStart = input.periodStart ? parseIsoDateTime(input.periodStart, "periodStart") : null;
  const periodEnd = input.periodEnd ? parseIsoDateTime(input.periodEnd, "periodEnd") : null;
  if (periodStart && periodEnd && periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const rows = await db
    .select()
    .from(agencyOpsExpense)
    .where(eq(agencyOpsExpense.teamId, input.teamId))
    .orderBy(
      asc(sql`case when ${agencyOpsExpense.kind} = 'subscription' then 0 else 1 end`),
      asc(agencyOpsExpense.nextDueAt),
      desc(agencyOpsExpense.occurredAt),
      desc(agencyOpsExpense.createdAt),
    );

  const items = rows
    .filter((row) => {
      if (row.kind === "subscription") {
        return isSubscriptionVisibleInPeriod(row.nextDueAt, periodStart, periodEnd);
      }
      if (!periodStart || !periodEnd) return true;
      const occurred = row.occurredAt ?? row.createdAt;
      return occurred >= periodStart && occurred < periodEnd;
    })
    .map(mapExpenseRow);

  return paginateItems(items, input);
}

export async function listSubscriptionCycles(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string },
): Promise<AgencySubscriptionCycleRecord[]> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const [subscriptionRows, occurrenceRows] = await Promise.all([
    db
      .select({
        id: agencyOpsExpense.id,
        name: agencyOpsExpense.name,
        note: agencyOpsExpense.note,
        amount: agencyOpsExpense.amount,
        paidAmount: agencyOpsExpense.paidAmount,
        currency: agencyOpsExpense.currency,
        period: agencyOpsExpense.period,
        amountMode: agencyOpsExpense.amountMode,
        nextDueAt: agencyOpsExpense.nextDueAt,
      })
      .from(agencyOpsExpense)
      .where(
        and(eq(agencyOpsExpense.teamId, input.teamId), eq(agencyOpsExpense.kind, "subscription")),
      ),
    db
      .select({
        id: agencyOpsExpenseOccurrence.id,
        expenseId: agencyOpsExpenseOccurrence.expenseId,
        name: agencyOpsExpense.name,
        note: agencyOpsExpense.note,
        amount: agencyOpsExpenseOccurrence.amount,
        paidAmount: agencyOpsExpenseOccurrence.paidAmount,
        currency: agencyOpsExpenseOccurrence.currency,
        period: agencyOpsExpense.period,
        amountMode: agencyOpsExpense.amountMode,
        dueAt: agencyOpsExpenseOccurrence.dueAt,
      })
      .from(agencyOpsExpenseOccurrence)
      .innerJoin(agencyOpsExpense, eq(agencyOpsExpenseOccurrence.expenseId, agencyOpsExpense.id))
      .where(
        and(
          eq(agencyOpsExpense.teamId, input.teamId),
          eq(agencyOpsExpense.kind, "subscription"),
          gte(agencyOpsExpenseOccurrence.dueAt, periodStart),
          lt(agencyOpsExpenseOccurrence.dueAt, periodEnd),
        ),
      ),
  ]);

  return buildSubscriptionCycleRecords({
    periodStart,
    periodEnd,
    subscriptions: subscriptionRows.flatMap((row) =>
      row.period ? [{ ...row, period: row.period }] : [],
    ),
    occurrences: occurrenceRows.flatMap((row) =>
      row.period ? [{ ...row, period: row.period }] : [],
    ),
  });
}

export async function createExpense(
  actorUserId: string,
  input: {
    teamId: string;
    name: string;
    kind: AgencyOpsExpenseKind;
    period?: AgencyOpsExpensePeriod | null;
    note?: string;
    amount: number;
    amountMode?: AgencyOpsExpenseAmountMode;
    currency?: string;
    fxRate?: string;
    startsAt?: string | null;
    nextDueAt?: string | null;
    occurredAt?: string | null;
  },
): Promise<AgencyExpenseRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const name = input.name.trim();
  if (!name) {
    throw new ORPCError("BAD_REQUEST", { message: "Name is required." });
  }

  const amountMode: AgencyOpsExpenseAmountMode =
    input.kind === "subscription" ? (input.amountMode ?? "fixed") : "fixed";
  if (amountMode === "variable") {
    if (input.kind !== "subscription") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Variable amount is only valid for subscriptions.",
      });
    }
    if (!Number.isInteger(input.amount) || input.amount < 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Amount must be a non-negative integer (minor units).",
      });
    }
  } else if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Amount must be a positive integer (minor units).",
    });
  }

  const now = new Date();
  let period: AgencyOpsExpensePeriod | null = null;
  let startsAt: Date | null = null;
  let nextDueAt: Date | null = null;
  let occurredAt: Date | null = null;

  if (input.kind === "subscription") {
    if (!input.period) {
      throw new ORPCError("BAD_REQUEST", { message: "Subscription expenses require a period." });
    }
    period = input.period;
    startsAt = input.startsAt ? parseIsoDateTime(input.startsAt, "startsAt") : null;
    if (input.nextDueAt) {
      nextDueAt = parseIsoDateTime(input.nextDueAt, "nextDueAt");
    } else if (startsAt) {
      nextDueAt = startsAt;
    } else {
      nextDueAt = defaultExpenseNextDueAt(now, period);
    }
  } else {
    occurredAt = input.occurredAt ? parseIsoDateTime(input.occurredAt, "occurredAt") : now;
  }

  const id = createWorkspaceId("agency-expense");
  const moneyCtx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
  const resolvedAmount = input.amount;
  const money = moneyCtx.resolve(
    resolvedAmount,
    (input.currency ?? moneyCtx.agencyCurrency).toUpperCase(),
    input.fxRate,
  );
  await moneyCtx.lock();

  const [row] = await db
    .insert(agencyOpsExpense)
    .values({
      id,
      teamId: input.teamId,
      name,
      kind: input.kind,
      period,
      note: (input.note ?? "").trim(),
      amount: money.amount,
      amountMode,
      currency: money.sourceCurrency,
      sourceAmount: money.sourceAmount,
      fxRate: money.fxRate,
      fxAsOf: new Date(money.fxAsOf),
      status: "due",
      paidAmount: 0,
      startsAt,
      nextDueAt,
      occurredAt,
      createdByUserId: actorUserId,
    })
    .returning();

  if (!row) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create expense." });
  }
  return mapExpenseRow(row);
}

export async function updateExpense(
  actorUserId: string,
  input: {
    teamId: string;
    expenseId: string;
    name?: string;
    kind?: AgencyOpsExpenseKind;
    note?: string;
    amount?: number;
    amountMode?: AgencyOpsExpenseAmountMode;
    currency?: string;
    fxRate?: string;
    period?: AgencyOpsExpensePeriod | null;
    startsAt?: string | null;
    nextDueAt?: string | null;
    occurredAt?: string | null;
  },
): Promise<AgencyExpenseRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const [existing] = await db
    .select()
    .from(agencyOpsExpense)
    .where(and(eq(agencyOpsExpense.id, input.expenseId), eq(agencyOpsExpense.teamId, input.teamId)))
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Expense not found." });
  }

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) {
    throw new ORPCError("BAD_REQUEST", { message: "Name is required." });
  }

  const nextKind = input.kind ?? existing.kind;
  let hasPaidOccurrence = false;
  if (nextKind !== existing.kind) {
    const [occurrence] = await db
      .select({ id: agencyOpsExpenseOccurrence.id })
      .from(agencyOpsExpenseOccurrence)
      .where(eq(agencyOpsExpenseOccurrence.expenseId, existing.id))
      .limit(1);
    hasPaidOccurrence = Boolean(occurrence);
  }

  const kindPlan = planExpenseKindFields({
    existingKind: existing.kind,
    nextKind,
    paidAmount: existing.paidAmount ?? 0,
    hasPaidOccurrence,
    amountMode: input.amountMode ?? existing.amountMode ?? "fixed",
    period: input.period !== undefined ? input.period : (existing.period ?? null),
    startsAt:
      input.startsAt !== undefined
        ? input.startsAt
          ? parseIsoDateTime(input.startsAt, "startsAt")
          : null
        : existing.startsAt,
    nextDueAt:
      input.nextDueAt !== undefined
        ? input.nextDueAt
          ? parseIsoDateTime(input.nextDueAt, "nextDueAt")
          : null
        : existing.nextDueAt,
    occurredAt:
      input.occurredAt !== undefined
        ? input.occurredAt
          ? parseIsoDateTime(input.occurredAt, "occurredAt")
          : null
        : existing.occurredAt,
    now: new Date(),
  });
  if (!kindPlan.ok) {
    throw new ORPCError("BAD_REQUEST", { message: kindPlan.error });
  }

  const { kind, amountMode, period, startsAt, nextDueAt, occurredAt } = kindPlan;

  if (amountMode === "variable" && (existing.paidAmount ?? 0) > 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Finish the current cycle before switching to variable amount.",
    });
  }

  const sourceCurrency = (
    input.currency !== undefined ? input.currency : existing.currency
  ).toUpperCase();
  const rawSourceAmount = input.amount ?? existing.sourceAmount ?? existing.amount;
  const moneyCtx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
  const shouldResolveMoney =
    input.amount !== undefined ||
    input.currency !== undefined ||
    input.amountMode !== undefined ||
    input.fxRate !== undefined;
  const money = shouldResolveMoney
    ? moneyCtx.resolve(rawSourceAmount, sourceCurrency, input.fxRate)
    : {
        amount: existing.amount,
        sourceAmount: existing.sourceAmount ?? existing.amount,
        sourceCurrency: existing.currency,
        fxRate: existing.fxRate,
        fxAsOf: existing.fxAsOf?.toISOString() ?? new Date().toISOString(),
      };
  if (shouldResolveMoney) {
    await moneyCtx.lock();
  }

  const amount = money.amount;
  if (amountMode === "variable") {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Amount must be a non-negative integer (minor units).",
      });
    }
  } else if (!Number.isInteger(amount) || amount <= 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Amount must be a positive integer (minor units).",
    });
  }

  const paidAmount = Math.min(existing.paidAmount ?? 0, amount);
  const status = expenseStatusAfterPaid(amount, paidAmount);

  const [row] = await db
    .update(agencyOpsExpense)
    .set({
      name,
      kind,
      note: input.note !== undefined ? input.note.trim() : existing.note,
      amount,
      amountMode,
      currency: money.sourceCurrency,
      sourceAmount: money.sourceAmount,
      fxRate: money.fxRate,
      fxAsOf: new Date(money.fxAsOf),
      period,
      startsAt,
      nextDueAt,
      occurredAt,
      paidAmount,
      status,
      updatedAt: new Date(),
    })
    .where(eq(agencyOpsExpense.id, existing.id))
    .returning();

  if (!row) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to update expense." });
  }
  return mapExpenseRow(row);
}

export async function recordExpensePayment(
  actorUserId: string,
  input: { teamId: string; expenseId: string; amount: number },
): Promise<AgencyExpenseRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Payment amount must be a positive integer." });
  }

  const row = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(agencyOpsExpense)
      .where(
        and(eq(agencyOpsExpense.id, input.expenseId), eq(agencyOpsExpense.teamId, input.teamId)),
      )
      .limit(1)
      .for("update");

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Expense not found." });
    }
    if (existing.status === "paid" && existing.amountMode !== "variable") {
      throw new ORPCError("BAD_REQUEST", { message: "Expense is already paid." });
    }

    const plan = planExpensePayment({
      kind: existing.kind,
      amountMode: existing.amountMode ?? "fixed",
      period: existing.period ?? null,
      templateAmount: existing.amount,
      paidAmount: existing.paidAmount ?? 0,
      paymentAmount: input.amount,
      nextDueAt: existing.nextDueAt,
      startsAt: existing.startsAt,
      now: new Date(),
    });
    if (!plan.ok) {
      throw new ORPCError("BAD_REQUEST", { message: plan.error });
    }

    const occurrenceDueAt =
      plan.writeOccurrence && existing.kind === "subscription"
        ? (existing.nextDueAt ?? existing.startsAt ?? new Date())
        : null;

    if (occurrenceDueAt) {
      await tx
        .insert(agencyOpsExpenseOccurrence)
        .values({
          id: createWorkspaceId("expenseOccurrence"),
          expenseId: existing.id,
          dueAt: occurrenceDueAt,
          amount: plan.occurrenceAmount,
          paidAmount: plan.occurrencePaidAmount,
          currency: existing.currency,
        })
        .onConflictDoUpdate({
          target: [agencyOpsExpenseOccurrence.expenseId, agencyOpsExpenseOccurrence.dueAt],
          set: {
            amount: plan.occurrenceAmount,
            paidAmount: plan.occurrencePaidAmount,
            currency: existing.currency,
            updatedAt: new Date(),
          },
        });
    }

    const [updated] = await tx
      .update(agencyOpsExpense)
      .set({
        paidAmount: plan.templatePaidAmount,
        status: plan.templateStatus,
        nextDueAt: plan.nextDueAt,
        ...(plan.resetTemplateAmount ? { amount: 0, sourceAmount: 0 } : {}),
        updatedAt: new Date(),
      })
      .where(eq(agencyOpsExpense.id, existing.id))
      .returning();
    return updated;
  });

  if (!row) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to record payment." });
  }
  return mapExpenseRow(row);
}

export async function removeExpense(
  actorUserId: string,
  input: { teamId: string; expenseId: string },
): Promise<{ id: string }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const deleted = await db
    .delete(agencyOpsExpense)
    .where(and(eq(agencyOpsExpense.id, input.expenseId), eq(agencyOpsExpense.teamId, input.teamId)))
    .returning({ id: agencyOpsExpense.id });

  if (deleted.length === 0) {
    throw new ORPCError("NOT_FOUND", { message: "Expense not found." });
  }
  return { id: input.expenseId };
}

/** Sum current and settled expense occurrences in [periodStart, periodEnd). */
export async function sumExpensesInPeriod(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string },
): Promise<{ amount: number; paidAmount: number; currency: string }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const [expenses, occurrences] = await Promise.all([
    db
      .select({
        id: agencyOpsExpense.id,
        amount: agencyOpsExpense.amount,
        paidAmount: agencyOpsExpense.paidAmount,
        currency: agencyOpsExpense.currency,
        kind: agencyOpsExpense.kind,
        nextDueAt: agencyOpsExpense.nextDueAt,
        occurredAt: agencyOpsExpense.occurredAt,
        createdAt: agencyOpsExpense.createdAt,
      })
      .from(agencyOpsExpense)
      .where(eq(agencyOpsExpense.teamId, input.teamId)),
    db
      .select({
        expenseId: agencyOpsExpenseOccurrence.expenseId,
        dueAt: agencyOpsExpenseOccurrence.dueAt,
        amount: agencyOpsExpenseOccurrence.amount,
        paidAmount: agencyOpsExpenseOccurrence.paidAmount,
        currency: agencyOpsExpenseOccurrence.currency,
      })
      .from(agencyOpsExpenseOccurrence)
      .innerJoin(agencyOpsExpense, eq(agencyOpsExpenseOccurrence.expenseId, agencyOpsExpense.id))
      .where(
        and(
          eq(agencyOpsExpense.teamId, input.teamId),
          gte(agencyOpsExpenseOccurrence.dueAt, periodStart),
          lt(agencyOpsExpenseOccurrence.dueAt, periodEnd),
        ),
      ),
  ]);

  return expensePeriodTotals({ periodStart, periodEnd, expenses, occurrences });
}
