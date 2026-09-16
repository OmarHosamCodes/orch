import { db } from "@orch/db";
import {
  workspaceTeamMember,
  user,
  agencyOpsMemberRate,
  agencyOpsInvoice,
  agencyOpsClient,
  agencyOpsTimeEntry,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsInvoiceLineItem,
  type AgencyOpsInvoiceStatus,
} from "@orch/db/schema";
import { eq, asc, and, inArray, sql, desc, sum, isNull, gte, lte, or, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";
import { parseIsoDateTime } from "../shared/date-helpers";
import { requireTeamMembership } from "../shared/membership";
import {
  invoiceBillStatus,
  invoiceRemainingAmount,
  invoiceStatusAfterReceived,
  invoiceStatusesForBillFilter,
  type InvoiceBillStatus,
} from "./invoice-bill-status";
import { invoicePeriodTotalsFromRows } from "./invoice-period-totals";
import { formatAvatarUrl } from "../shared/avatar-helpers";
import {
  aggregateExternalBillableIncome,
  convertWinningBillableRate,
  priceClientInvoiceProjects,
  resolveEffectiveSourceBillableRate,
  type ClientBillableIncomeRow,
} from "./client-billable-income";
import { aggregateMemberPayableIncome } from "./member-payable-income";
import {
  type PeriodBillClientActivity,
  type PeriodBillMemberActivity,
} from "./period-bill-activity";
import { getAgencyCurrency, ensurePeriodFx, loadMoneyResolveContext } from "./money-fx-service";
import { MoneyCurrencyError, type MoneyFxRateRow } from "./money-currency";
import { paginateItems, type PaginatedItems } from "./list-pagination";
import { resolveEntryWaste } from "../shared/waste-helpers";

type AgencyMemberRateRecord = {
  userId: string;
  userName: string;
  userEmail: string;
  costRateAmount: number | null;
  billableRateAmount: number | null;
  currency: string;
  effectiveFrom: string | null;
};

function periodAgencyBillableRate(
  task: {
    billableRateAmount: number | null;
    sourceBillableRateAmount: number | null;
    currency: string | null;
  },
  project: {
    billableRateAmount: number | null;
    sourceBillableRateAmount: number | null;
    currency: string | null;
  },
  client: {
    billableRateAmount: number | null;
    sourceBillableRateAmount: number | null;
    currency: string | null;
  },
  agencyCurrency: string,
  rates: readonly MoneyFxRateRow[],
): number | null {
  try {
    return convertWinningBillableRate(task, project, client, agencyCurrency, rates);
  } catch (error) {
    if (error instanceof MoneyCurrencyError) {
      throw new ORPCError("BAD_REQUEST", { message: error.message });
    }
    throw error;
  }
}

export async function listMemberRates(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ items: AgencyMemberRateRecord[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const members = await db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
      userEmail: user.email,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  if (members.length === 0) return { items: [] };

  const userIds = members.map((m) => m.userId);

  const rateRows = await db
    .select()
    .from(agencyOpsMemberRate)
    .where(
      and(
        eq(agencyOpsMemberRate.teamId, input.teamId),
        inArray(agencyOpsMemberRate.userId, userIds),
      ),
    );

  const rateByUserId = new Map(rateRows.map((r) => [r.userId, r]));

  const items: AgencyMemberRateRecord[] = members.map((m) => {
    const rate = rateByUserId.get(m.userId);
    return {
      userId: m.userId,
      userName: m.userName ?? "Unknown",
      userEmail: m.userEmail,
      costRateAmount: rate?.costRateAmount ?? null,
      billableRateAmount: rate?.billableRateAmount ?? null,
      currency: rate?.currency ?? "USD",
      effectiveFrom: rate?.effectiveFrom?.toISOString() ?? null,
    };
  });

  return { items };
}

export async function upsertMemberRate(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    costRateAmount?: number | null;
    billableRateAmount?: number | null;
    currency?: string;
    effectiveFrom?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [membership] = await db
    .select({ userId: workspaceTeamMember.userId })
    .from(workspaceTeamMember)
    .where(
      and(
        eq(workspaceTeamMember.teamId, input.teamId),
        eq(workspaceTeamMember.userId, input.userId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new ORPCError("NOT_FOUND", { message: "User is not a member of this team." });
  }

  const now = new Date();
  const effectiveFrom = input.effectiveFrom
    ? parseIsoDateTime(input.effectiveFrom, "effectiveFrom")
    : now;

  const moneyCtx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
  const sourceCurrency = (input.currency ?? moneyCtx.agencyCurrency).toUpperCase();

  let costRateAmount = input.costRateAmount ?? null;
  let billableRateAmount = input.billableRateAmount ?? null;
  let sourceCostRateAmount: number | null = null;
  let sourceBillableRateAmount: number | null = null;
  let fxRate = "1";
  let fxAsOf: Date | null = null;

  if (input.costRateAmount != null) {
    const resolved = moneyCtx.resolve(input.costRateAmount, sourceCurrency);
    sourceCostRateAmount = resolved.sourceAmount;
    costRateAmount = resolved.amount;
    fxRate = resolved.fxRate;
    fxAsOf = new Date(resolved.fxAsOf);
  }
  if (input.billableRateAmount != null) {
    const resolved = moneyCtx.resolve(input.billableRateAmount, sourceCurrency);
    sourceBillableRateAmount = resolved.sourceAmount;
    billableRateAmount = resolved.amount;
    fxRate = resolved.fxRate;
    fxAsOf = new Date(resolved.fxAsOf);
  }
  if (input.costRateAmount != null || input.billableRateAmount != null) {
    await moneyCtx.lock();
  }

  const [upserted] = await db
    .insert(agencyOpsMemberRate)
    .values({
      id: createWorkspaceId("agency-rate"),
      teamId: input.teamId,
      userId: input.userId,
      costRateAmount,
      billableRateAmount,
      currency: sourceCurrency,
      sourceCostRateAmount,
      sourceBillableRateAmount,
      fxRate,
      fxAsOf,
      effectiveFrom,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsMemberRate.teamId, agencyOpsMemberRate.userId],
      set: {
        costRateAmount:
          input.costRateAmount !== undefined
            ? costRateAmount
            : sql`COALESCE(${agencyOpsMemberRate.costRateAmount}, ${agencyOpsMemberRate.costRateAmount})`,
        billableRateAmount:
          input.billableRateAmount !== undefined
            ? billableRateAmount
            : sql`COALESCE(${agencyOpsMemberRate.billableRateAmount}, ${agencyOpsMemberRate.billableRateAmount})`,
        currency:
          input.currency !== undefined ? sourceCurrency : sql`${agencyOpsMemberRate.currency}`,
        sourceCostRateAmount:
          input.costRateAmount !== undefined
            ? sourceCostRateAmount
            : sql`${agencyOpsMemberRate.sourceCostRateAmount}`,
        sourceBillableRateAmount:
          input.billableRateAmount !== undefined
            ? sourceBillableRateAmount
            : sql`${agencyOpsMemberRate.sourceBillableRateAmount}`,
        fxRate:
          input.costRateAmount !== undefined || input.billableRateAmount !== undefined
            ? fxRate
            : sql`${agencyOpsMemberRate.fxRate}`,
        fxAsOf:
          input.costRateAmount !== undefined || input.billableRateAmount !== undefined
            ? fxAsOf
            : sql`${agencyOpsMemberRate.fxAsOf}`,
        effectiveFrom:
          input.effectiveFrom !== undefined
            ? effectiveFrom
            : sql`${agencyOpsMemberRate.effectiveFrom}`,
        updatedAt: now,
      },
    })
    .returning();

  if (!upserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  const [userRow] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);

  return {
    userId: upserted.userId,
    userName: userRow?.name ?? "Unknown",
    userEmail: userRow?.email ?? "",
    costRateAmount: upserted.costRateAmount,
    billableRateAmount: upserted.billableRateAmount,
    currency: upserted.currency,
    effectiveFrom: upserted.effectiveFrom.toISOString(),
  } satisfies AgencyMemberRateRecord;
}

type AgencyInvoiceRecord = {
  id: string;
  clientId: string;
  clientName: string;
  number: string;
  status: AgencyOpsInvoiceStatus;
  billStatus: InvoiceBillStatus;
  amount: number;
  receivedAmount: number;
  remainingAmount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  issuedAt: string | null;
  paidAt: string | null;
};

async function getNextInvoiceNumber(
  teamId: string,
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
): Promise<string> {
  const [last] = await tx
    .select({ number: agencyOpsInvoice.number })
    .from(agencyOpsInvoice)
    .where(eq(agencyOpsInvoice.teamId, teamId))
    .orderBy(desc(agencyOpsInvoice.createdAt))
    .limit(1)
    .for("update");

  if (!last) return "INV-0001";
  const match = last.number.match(/INV-(\d+)$/);
  if (!match) return "INV-0001";
  const next = parseInt(match[1]!, 10) + 1;
  return `INV-${String(next).padStart(4, "0")}`;
}

function mapInvoiceRow(
  row: typeof agencyOpsInvoice.$inferSelect,
  clientName: string,
): AgencyInvoiceRecord {
  const receivedAmount = row.receivedAmount ?? 0;
  return {
    id: row.id,
    clientId: row.clientId,
    clientName,
    number: row.number,
    status: row.status,
    billStatus: invoiceBillStatus(row.status),
    amount: row.amount,
    receivedAmount,
    remainingAmount: invoiceRemainingAmount(row.amount, receivedAmount),
    currency: row.currency,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    issuedAt: row.issuedAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

export async function listInvoices(
  actorUserId: string,
  input: {
    teamId: string;
    status?: AgencyOpsInvoiceStatus;
    billStatus?: InvoiceBillStatus;
    periodStart?: string;
    periodEnd?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<PaginatedItems<AgencyInvoiceRecord>> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const filters = [eq(agencyOpsInvoice.teamId, input.teamId)];

  if (input.status) {
    filters.push(eq(agencyOpsInvoice.status, input.status));
  } else if (input.billStatus) {
    filters.push(inArray(agencyOpsInvoice.status, invoiceStatusesForBillFilter(input.billStatus)));
  }

  if (input.periodStart && input.periodEnd) {
    const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
    const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
    // Overlap: invoice period intersects the selected range.
    filters.push(lte(agencyOpsInvoice.periodStart, periodEnd));
    filters.push(gte(agencyOpsInvoice.periodEnd, periodStart));
  }

  const searchTerm = input.search?.trim();
  if (searchTerm) {
    const pattern = `%${searchTerm}%`;
    filters.push(
      or(ilike(agencyOpsClient.name, pattern), ilike(agencyOpsInvoice.number, pattern))!,
    );
  }

  const rows = await db
    .select({ invoice: agencyOpsInvoice, clientName: agencyOpsClient.name })
    .from(agencyOpsInvoice)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsInvoice.clientId))
    .where(and(...filters))
    .orderBy(desc(agencyOpsInvoice.createdAt));

  return paginateItems(
    rows.map((r) => mapInvoiceRow(r.invoice, r.clientName)),
    input,
  );
}

export async function getInvoiceSummary(
  actorUserId: string,
  input: { teamId: string; periodStart?: string; periodEnd?: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const filters = [eq(agencyOpsInvoice.teamId, input.teamId)];
  if (input.periodStart && input.periodEnd) {
    const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
    const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
    filters.push(lte(agencyOpsInvoice.periodStart, periodEnd));
    filters.push(gte(agencyOpsInvoice.periodEnd, periodStart));
  }

  const rows = await db
    .select({
      status: agencyOpsInvoice.status,
      currency: agencyOpsInvoice.currency,
      amount: sum(agencyOpsInvoice.amount).as("total"),
      receivedAmount: sum(agencyOpsInvoice.receivedAmount).as("received"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(agencyOpsInvoice)
    .where(and(...filters))
    .groupBy(agencyOpsInvoice.status, agencyOpsInvoice.currency);

  let draftCount = 0;
  let sentCount = 0;
  let partialCount = 0;
  let paidCount = 0;
  let refundedCount = 0;
  // Outstanding remaining keyed by currency (draft/sent/partial).
  const outstandingByCurrency: Record<string, number> = {};
  const periodRows: Array<{
    status: string;
    amount: number;
    receivedAmount: number;
    currency: string;
  }> = [];

  for (const row of rows) {
    const count = Number(row.count ?? 0);
    const amount = Number(row.amount ?? 0);
    const received = Number(row.receivedAmount ?? 0);
    const remaining = Math.max(0, amount - received);
    periodRows.push({
      status: row.status,
      amount: amount,
      receivedAmount: received,
      currency: row.currency,
    });
    if (row.status === "draft") {
      draftCount += count;
      outstandingByCurrency[row.currency] = (outstandingByCurrency[row.currency] ?? 0) + remaining;
    } else if (row.status === "sent") {
      sentCount += count;
      outstandingByCurrency[row.currency] = (outstandingByCurrency[row.currency] ?? 0) + remaining;
    } else if (row.status === "partial") {
      partialCount += count;
      outstandingByCurrency[row.currency] = (outstandingByCurrency[row.currency] ?? 0) + remaining;
    } else if (row.status === "paid") {
      paidCount += count;
    } else if (row.status === "refunded") {
      refundedCount += count;
    }
  }

  const periodTotals = invoicePeriodTotalsFromRows(periodRows);

  // For backward-compat convenience: also expose the USD outstanding total
  // (or the single currency if the team uses only one).
  const currencies = Object.keys(outstandingByCurrency);
  const outstandingAmount =
    currencies.length === 1
      ? (outstandingByCurrency[currencies[0]!] ?? 0)
      : (outstandingByCurrency["USD"] ?? 0);
  const currency = currencies.length === 1 ? currencies[0]! : periodTotals.currency || "USD";

  return {
    draftCount,
    sentCount,
    partialCount,
    paidCount,
    refundedCount,
    outstandingAmount,
    currency,
    outstandingByCurrency,
    billedAmount: periodTotals.billedAmount,
    receivedAmount: periodTotals.receivedAmount,
    remainingAmount: periodTotals.remainingAmount,
  };
}

export async function createInvoice(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    periodStart: string;
    periodEnd: string;
    currency?: string;
  },
): Promise<AgencyInvoiceRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [clientRow] = await db
    .select({
      id: agencyOpsClient.id,
      name: agencyOpsClient.name,
      billableRateAmount: agencyOpsClient.billableRateAmount,
      sourceBillableRateAmount: agencyOpsClient.sourceBillableRateAmount,
      currency: agencyOpsClient.currency,
    })
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)))
    .limit(1);

  if (!clientRow) {
    throw new ORPCError("NOT_FOUND", { message: "Client was not found." });
  }

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const [periodRates, agency] = await Promise.all([
    ensurePeriodFx(actorUserId, {
      teamId: input.teamId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    }),
    getAgencyCurrency(actorUserId, { teamId: input.teamId }),
  ]);

  const rawEntries = await db
    .select({
      projectId: agencyOpsTimeEntry.projectId,
      projectName: agencyOpsProject.name,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      isWaste: agencyOpsTimeEntry.isWaste,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      taskTitle: agencyOpsProjectTask.title,
      taskRateAmount: agencyOpsProjectTask.billableRateAmount,
      taskSourceBillableRateAmount: agencyOpsProjectTask.sourceBillableRateAmount,
      taskCurrency: agencyOpsProjectTask.currency,
      projectRateAmount: agencyOpsProject.billableRateAmount,
      projectSourceBillableRateAmount: agencyOpsProject.sourceBillableRateAmount,
      projectCurrency: agencyOpsProject.currency,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsProject.clientId, input.clientId),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, periodStart),
        lte(agencyOpsTimeEntry.startedAt, periodEnd),
      ),
    );

  const entries = rawEntries.map((row) => {
    const agencyRate = periodAgencyBillableRate(
      {
        billableRateAmount: row.taskRateAmount,
        sourceBillableRateAmount: row.taskSourceBillableRateAmount,
        currency: row.taskCurrency,
      },
      {
        billableRateAmount: row.projectRateAmount,
        sourceBillableRateAmount: row.projectSourceBillableRateAmount,
        currency: row.projectCurrency,
      },
      {
        billableRateAmount: clientRow.billableRateAmount,
        sourceBillableRateAmount: clientRow.sourceBillableRateAmount,
        currency: clientRow.currency,
      },
      agency.currency,
      periodRates,
    );
    return {
      projectId: row.projectId,
      projectName: row.projectName,
      durationSeconds: row.durationSeconds,
      isWaste: resolveEntryWaste(row),
      taskRateAmount: agencyRate,
      projectRateAmount: null,
    };
  });

  const pricedProjects = priceClientInvoiceProjects(entries, null);
  if (!pricedProjects.ok) {
    throw new ORPCError("BAD_REQUEST", {
      message: `${clientRow.name} has no billable rate set. Set the client rate before creating an invoice.`,
    });
  }

  const now = new Date();

  const { invoice, totalAmount } = await db.transaction(async (tx) => {
    const invoiceNumber = await getNextInvoiceNumber(input.teamId, tx);

    const [inv] = await tx
      .insert(agencyOpsInvoice)
      .values({
        id: createWorkspaceId("agency-inv"),
        teamId: input.teamId,
        clientId: input.clientId,
        number: invoiceNumber,
        status: "draft",
        amount: 0,
        receivedAmount: 0,
        currency: input.currency ?? "USD",
        periodStart,
        periodEnd,
        createdByUserId: actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!inv) throw new ORPCError("INTERNAL_SERVER_ERROR");

    let total = 0;

    if (pricedProjects.projects.length > 0) {
      const lineItems = pricedProjects.projects.map(
        ({ projectId, projectName, durationSeconds, rateAmount, amount }) => {
          total += amount;
          return {
            id: createWorkspaceId("agency-li"),
            invoiceId: inv.id,
            description: projectName,
            projectId,
            durationSeconds,
            rateAmount,
            amount,
            fromTimeEntries: true,
            createdAt: now,
          };
        },
      );
      await tx.insert(agencyOpsInvoiceLineItem).values(lineItems);
    } else {
      await tx.insert(agencyOpsInvoiceLineItem).values({
        id: createWorkspaceId("agency-li"),
        invoiceId: inv.id,
        description: "Services",
        projectId: null,
        durationSeconds: 0,
        rateAmount: 0,
        amount: 0,
        fromTimeEntries: false,
        createdAt: now,
      });
    }

    await tx
      .update(agencyOpsInvoice)
      .set({ amount: total, updatedAt: now })
      .where(eq(agencyOpsInvoice.id, inv.id));

    return { invoice: inv, totalAmount: total };
  });

  return mapInvoiceRow({ ...invoice, amount: totalAmount }, clientRow.name);
}

export async function updateInvoiceStatus(
  actorUserId: string,
  input: { teamId: string; invoiceId: string; status: "sent" | "paid" | "refunded" },
): Promise<AgencyInvoiceRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [existing] = await db
    .select({ invoice: agencyOpsInvoice, clientName: agencyOpsClient.name })
    .from(agencyOpsInvoice)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsInvoice.clientId))
    .where(and(eq(agencyOpsInvoice.id, input.invoiceId), eq(agencyOpsInvoice.teamId, input.teamId)))
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Invoice was not found." });
  }

  const validTransitions: Record<AgencyOpsInvoiceStatus, AgencyOpsInvoiceStatus[]> = {
    draft: ["sent"],
    sent: ["paid", "refunded"],
    partial: ["paid", "refunded"],
    paid: ["refunded"],
    refunded: [],
  };

  if (!validTransitions[existing.invoice.status]?.includes(input.status)) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Cannot transition from ${existing.invoice.status} to ${input.status}.`,
    });
  }

  const now = new Date();
  const patch: Partial<typeof agencyOpsInvoice.$inferInsert> = {
    status: input.status,
    updatedAt: now,
  };
  if (input.status === "sent") patch.issuedAt = existing.invoice.issuedAt ?? now;
  if (input.status === "paid") {
    patch.paidAt = now;
    patch.receivedAmount = existing.invoice.amount;
  }

  const [updated] = await db
    .update(agencyOpsInvoice)
    .set(patch)
    .where(eq(agencyOpsInvoice.id, input.invoiceId))
    .returning();

  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return mapInvoiceRow(updated, existing.clientName);
}

export async function recordInvoicePayment(
  actorUserId: string,
  input: { teamId: string; invoiceId: string; amount: number },
): Promise<AgencyInvoiceRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  if (input.amount <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Payment amount must be greater than zero." });
  }

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ invoice: agencyOpsInvoice, clientName: agencyOpsClient.name })
      .from(agencyOpsInvoice)
      .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsInvoice.clientId))
      .where(
        and(eq(agencyOpsInvoice.id, input.invoiceId), eq(agencyOpsInvoice.teamId, input.teamId)),
      )
      .limit(1)
      .for("update", { of: agencyOpsInvoice });

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Invoice was not found." });
    }

    if (existing.invoice.status === "draft") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Send the invoice before recording a payment.",
      });
    }
    if (existing.invoice.status === "refunded") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cannot record payment on a refunded invoice.",
      });
    }
    if (existing.invoice.status === "paid") {
      throw new ORPCError("BAD_REQUEST", { message: "Invoice is already paid in full." });
    }

    const remaining = invoiceRemainingAmount(
      existing.invoice.amount,
      existing.invoice.receivedAmount,
    );
    if (input.amount > remaining) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Payment amount exceeds remaining balance.",
      });
    }

    const now = new Date();
    const nextReceived = existing.invoice.receivedAmount + input.amount;
    const nextStatus = invoiceStatusAfterReceived(
      existing.invoice.amount,
      nextReceived,
      existing.invoice.status,
    );

    const patch: Partial<typeof agencyOpsInvoice.$inferInsert> = {
      receivedAmount: nextReceived,
      status: nextStatus,
      updatedAt: now,
    };
    if (nextStatus === "paid") patch.paidAt = now;
    if (!existing.invoice.issuedAt) patch.issuedAt = now;

    const [updated] = await tx
      .update(agencyOpsInvoice)
      .set(patch)
      .where(eq(agencyOpsInvoice.id, input.invoiceId))
      .returning();

    if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

    return mapInvoiceRow(updated, existing.clientName);
  });
}

async function loadPeriodClientBillableRows(
  teamId: string,
  periodStart: Date,
  periodEnd: Date,
  agencyCurrency: string,
  rates: readonly MoneyFxRateRow[],
): Promise<ClientBillableIncomeRow[]> {
  const rows = await db
    .select({
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      category: agencyOpsClient.category,
      projectId: agencyOpsProject.id,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      isWaste: agencyOpsTimeEntry.isWaste,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      taskTitle: agencyOpsProjectTask.title,
      projectName: agencyOpsProject.name,
      taskRateAmount: agencyOpsProjectTask.billableRateAmount,
      taskSourceBillableRateAmount: agencyOpsProjectTask.sourceBillableRateAmount,
      taskCurrency: agencyOpsProjectTask.currency,
      projectRateAmount: agencyOpsProject.billableRateAmount,
      projectSourceBillableRateAmount: agencyOpsProject.sourceBillableRateAmount,
      projectCurrency: agencyOpsProject.currency,
      clientRateAmount: agencyOpsClient.billableRateAmount,
      clientSourceBillableRateAmount: agencyOpsClient.sourceBillableRateAmount,
      clientCurrency: agencyOpsClient.currency,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, periodStart),
        lte(agencyOpsTimeEntry.startedAt, periodEnd),
      ),
    );

  return rows.map((row) => {
    const agencyRate = periodAgencyBillableRate(
      {
        billableRateAmount: row.taskRateAmount,
        sourceBillableRateAmount: row.taskSourceBillableRateAmount,
        currency: row.taskCurrency,
      },
      {
        billableRateAmount: row.projectRateAmount,
        sourceBillableRateAmount: row.projectSourceBillableRateAmount,
        currency: row.projectCurrency,
      },
      {
        billableRateAmount: row.clientRateAmount,
        sourceBillableRateAmount: row.clientSourceBillableRateAmount,
        currency: row.clientCurrency,
      },
      agencyCurrency,
      rates,
    );
    const sourceRate = resolveEffectiveSourceBillableRate(
      {
        billableRateAmount: row.taskRateAmount,
        sourceBillableRateAmount: row.taskSourceBillableRateAmount,
        currency: row.taskCurrency,
      },
      {
        billableRateAmount: row.projectRateAmount,
        sourceBillableRateAmount: row.projectSourceBillableRateAmount,
        currency: row.projectCurrency,
      },
      {
        billableRateAmount: row.clientRateAmount,
        sourceBillableRateAmount: row.clientSourceBillableRateAmount,
        currency: row.clientCurrency,
      },
    );
    return {
      clientId: row.clientId,
      clientName: row.clientName,
      category: row.category,
      projectId: row.projectId,
      durationSeconds: row.durationSeconds,
      isWaste: resolveEntryWaste(row),
      taskRateAmount: agencyRate,
      projectRateAmount: null,
      clientRateAmount: null,
      sourceRateAmount: sourceRate.rateAmount,
      sourceRateCurrency: sourceRate.currency,
    };
  });
}

export async function sumPeriodExternalBillablePool(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string },
): Promise<{ billablePoolAmount: number; currency: string }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const [periodRates, agency] = await Promise.all([
    ensurePeriodFx(actorUserId, input),
    getAgencyCurrency(actorUserId, { teamId: input.teamId }),
  ]);
  const rows = await loadPeriodClientBillableRows(
    input.teamId,
    periodStart,
    periodEnd,
    agency.currency,
    periodRates,
  );
  const { billablePoolAmount } = aggregateExternalBillableIncome(rows);
  return { billablePoolAmount, currency: agency.currency };
}

export async function listPeriodBillActivity(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string; search?: string },
): Promise<{ clients: PeriodBillClientActivity[]; members: PeriodBillMemberActivity[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const [periodRates, agency] = await Promise.all([
    ensurePeriodFx(actorUserId, {
      teamId: input.teamId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    }),
    getAgencyCurrency(actorUserId, { teamId: input.teamId }),
  ]);

  const [billableRows, memberPayableRows] = await Promise.all([
    loadPeriodClientBillableRows(
      input.teamId,
      periodStart,
      periodEnd,
      agency.currency,
      periodRates,
    ),
    db
      .select({
        userId: agencyOpsTimeEntry.userId,
        userName: user.name,
        userAvatar: user.image,
        durationSeconds: agencyOpsTimeEntry.durationSeconds,
        isWaste: agencyOpsTimeEntry.isWaste,
        taskIsWaste: agencyOpsProjectTask.isWaste,
        taskTitle: agencyOpsProjectTask.title,
        projectName: agencyOpsProject.name,
        costRateAmount: agencyOpsMemberRate.costRateAmount,
      })
      .from(agencyOpsTimeEntry)
      .innerJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
      .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
      .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
      .leftJoin(
        agencyOpsMemberRate,
        and(
          eq(agencyOpsMemberRate.teamId, agencyOpsTimeEntry.teamId),
          eq(agencyOpsMemberRate.userId, agencyOpsTimeEntry.userId),
        ),
      )
      .where(
        and(
          eq(agencyOpsTimeEntry.teamId, input.teamId),
          isNull(agencyOpsTimeEntry.deletedAt),
          gte(agencyOpsTimeEntry.startedAt, periodStart),
          lte(agencyOpsTimeEntry.startedAt, periodEnd),
        ),
      ),
  ]);

  const money = aggregateExternalBillableIncome(billableRows);
  let clients = money.clients.map((client) => ({
    clientId: client.clientId,
    clientName: client.clientName,
    durationSeconds: client.durationSeconds,
    billableAmount: client.billableAmount,
    sourceBillableAmount: client.sourceBillableAmount,
    rateCurrency: client.rateCurrency,
    wasteAmount: client.wasteAmount,
  }));

  let members = aggregateMemberPayableIncome(
    memberPayableRows.map((row) => ({
      userId: row.userId,
      userName: row.userName?.trim() || "Unknown",
      userAvatar: formatAvatarUrl(row.userAvatar),
      durationSeconds: row.durationSeconds,
      isWaste: resolveEntryWaste(row),
      costRateAmount: row.costRateAmount,
    })),
  );

  const searchTerm = input.search?.trim().toLowerCase();
  if (searchTerm) {
    clients = clients.filter((client) => client.clientName.toLowerCase().includes(searchTerm));
    members = members.filter((member) => member.userName.toLowerCase().includes(searchTerm));
  }

  return { clients, members };
}

/** Empty stub until project budgets ship; Projects UI still queries this. */
export async function listBudgetsStub(actorUserId: string, input: { teamId: string }) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  return { items: [] as const };
}
