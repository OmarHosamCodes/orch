import { db } from "@orch/db";
import {
  agencyOpsClient,
  agencyOpsInvoice,
  agencyOpsInvoiceLineItem,
  agencyOpsPayoutLine,
  agencyOpsPayoutRun,
  agencyOpsPayoutSection,
  user,
  type AgencyOpsMoneyPendingPartyType,
} from "@orch/db/schema";
import { and, desc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";

import { formatAvatarUrl } from "../shared/avatar-helpers";
import { parseIsoDateTime } from "../shared/date-helpers";
import { assertNoSalaryPoolForRateDerivedExport } from "./salary-pool-service";
import { requireAgencyRole } from "../shared/membership";
import { getAgencyCurrency } from "./money-fx-service";
import {
  buildClientObligations,
  buildMemberObligations,
  filterAdjustmentsForPeriod,
  type MoneyCarryClientObligation,
  type MoneyCarryMemberObligation,
} from "./money-bill-carry";
import { invoiceRemainingAmount, invoiceStatusAfterUncollect } from "./invoice-bill-status";
import {
  listPendingAdjustments,
  markClientReadyAdjustmentsApplied,
  type MoneyPendingAdjustmentRecord,
} from "./money-pending-adjustment-service";
import { payoutRemainingAmount } from "./payout-bill-status";
import { TEAM_SECTION_KEYS } from "./payout-section-keys";
import {
  createPayoutLineFromMember,
  ensurePayoutPeriod,
  recordPayoutPayment,
  updatePayoutLineStatus,
} from "./payout-service";
import {
  createInvoice,
  listPeriodBillActivity,
  recordInvoicePayment,
  updateInvoiceStatus,
} from "./service";

function lookbackStartFrom(periodStart: Date): Date {
  const d = new Date(periodStart);
  d.setUTCMonth(d.getUTCMonth() - 12);
  return d;
}

function dayBefore(iso: string): string {
  return new Date(new Date(iso).getTime() - 1).toISOString();
}

async function getNextInvoiceNumber(teamId: string): Promise<string> {
  const [last] = await db
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

async function findOverlappingClientInvoice(input: {
  teamId: string;
  clientId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<{ id: string; amount: number; receivedAmount: number; status: string } | null> {
  const [row] = await db
    .select({
      id: agencyOpsInvoice.id,
      amount: agencyOpsInvoice.amount,
      receivedAmount: agencyOpsInvoice.receivedAmount,
      status: agencyOpsInvoice.status,
    })
    .from(agencyOpsInvoice)
    .where(
      and(
        eq(agencyOpsInvoice.teamId, input.teamId),
        eq(agencyOpsInvoice.clientId, input.clientId),
        lte(agencyOpsInvoice.periodStart, input.periodEnd),
        gte(agencyOpsInvoice.periodEnd, input.periodStart),
      ),
    )
    .orderBy(desc(agencyOpsInvoice.createdAt))
    .limit(1);
  return row ?? null;
}

/** Soft-export Ready → invoice (draft unless markSent). Returns invoice id. */
async function softExportClientReady(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    markSent: boolean;
    lineDescription?: string;
  },
): Promise<{ id: string; remainingAmount: number }> {
  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  const existing = await findOverlappingClientInvoice({
    teamId: input.teamId,
    clientId: input.clientId,
    periodStart,
    periodEnd,
  });

  if (!existing) {
    const invoice = await createInvoice(actorUserId, {
      teamId: input.teamId,
      clientId: input.clientId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });
    if (input.markSent && invoice.status === "draft") {
      const sent = await updateInvoiceStatus(actorUserId, {
        teamId: input.teamId,
        invoiceId: invoice.id,
        status: "sent",
      });
      return { id: sent.id, remainingAmount: sent.remainingAmount };
    }
    return { id: invoice.id, remainingAmount: invoice.remainingAmount };
  }

  // Supplemental invoice for residual Ready amount.
  const amount = Math.max(0, input.amount);
  if (amount <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Ready residual amount must be positive." });
  }

  const now = new Date();
  const invoiceId = createWorkspaceId("agency-inv");
  const number = await getNextInvoiceNumber(input.teamId);
  const { currency: agencyCurrency } = await getAgencyCurrency(actorUserId, {
    teamId: input.teamId,
  });

  await db.transaction(async (tx) => {
    await tx.insert(agencyOpsInvoice).values({
      id: invoiceId,
      teamId: input.teamId,
      clientId: input.clientId,
      number,
      status: input.markSent ? "sent" : "draft",
      amount,
      receivedAmount: 0,
      currency: agencyCurrency,
      sourceAmount: amount,
      fxRate: "1",
      fxAsOf: now,
      periodStart,
      periodEnd,
      issuedAt: input.markSent ? now : null,
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(agencyOpsInvoiceLineItem).values({
      id: createWorkspaceId("agency-li"),
      invoiceId,
      description: input.lineDescription ?? "Ready balance",
      projectId: null,
      durationSeconds: 0,
      rateAmount: 0,
      amount,
      fromTimeEntries: false,
      createdAt: now,
    });
  });

  return { id: invoiceId, remainingAmount: amount };
}

async function loadMemberSalaryLine(input: {
  teamId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
}): Promise<{ id: string; amount: number; paidAmount: number } | null> {
  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  const [row] = await db
    .select({
      id: agencyOpsPayoutLine.id,
      amount: agencyOpsPayoutLine.amount,
      paidAmount: agencyOpsPayoutLine.paidAmount,
    })
    .from(agencyOpsPayoutLine)
    .innerJoin(agencyOpsPayoutSection, eq(agencyOpsPayoutSection.id, agencyOpsPayoutLine.sectionId))
    .innerJoin(agencyOpsPayoutRun, eq(agencyOpsPayoutRun.id, agencyOpsPayoutSection.runId))
    .where(
      and(
        eq(agencyOpsPayoutRun.teamId, input.teamId),
        eq(agencyOpsPayoutRun.periodStart, periodStart),
        eq(agencyOpsPayoutRun.periodEnd, periodEnd),
        eq(agencyOpsPayoutSection.key, "salaries"),
        eq(agencyOpsPayoutLine.payeeUserId, input.userId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/** Soft-export Ready → payout salary line. Returns line id. */
async function softExportMemberReady(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    periodStart: string;
    periodEnd: string;
  },
): Promise<{ id: string; remainingAmount: number }> {
  await assertNoSalaryPoolForRateDerivedExport(actorUserId, input);

  await ensurePayoutPeriod(actorUserId, {
    teamId: input.teamId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  });

  try {
    const line = await createPayoutLineFromMember(actorUserId, {
      teamId: input.teamId,
      userId: input.userId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });
    return { id: line.id, remainingAmount: line.remainingAmount };
  } catch (error) {
    if (!(error instanceof ORPCError) || error.code !== "CONFLICT") throw error;
    const existing = await loadMemberSalaryLine(input);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Payout line was not found after conflict." });
    }
    return {
      id: existing.id,
      remainingAmount: payoutRemainingAmount(existing.amount, existing.paidAmount),
    };
  }
}

async function refundInvoice(_actorUserId: string, input: { teamId: string; invoiceId: string }) {
  const [existing] = await db
    .select({
      receivedAmount: agencyOpsInvoice.receivedAmount,
      status: agencyOpsInvoice.status,
    })
    .from(agencyOpsInvoice)
    .where(and(eq(agencyOpsInvoice.id, input.invoiceId), eq(agencyOpsInvoice.teamId, input.teamId)))
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Invoice was not found." });
  }
  if ((existing.receivedAmount ?? 0) <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Nothing to uncollect on this invoice." });
  }

  const now = new Date();
  await db
    .update(agencyOpsInvoice)
    .set({
      status: invoiceStatusAfterUncollect(existing.status),
      receivedAmount: 0,
      paidAt: null,
      updatedAt: now,
    })
    .where(
      and(eq(agencyOpsInvoice.id, input.invoiceId), eq(agencyOpsInvoice.teamId, input.teamId)),
    );
}

async function refundPayoutLine(actorUserId: string, input: { teamId: string; lineId: string }) {
  const [row] = await db
    .select({
      line: agencyOpsPayoutLine,
      runId: agencyOpsPayoutRun.id,
    })
    .from(agencyOpsPayoutLine)
    .innerJoin(agencyOpsPayoutSection, eq(agencyOpsPayoutSection.id, agencyOpsPayoutLine.sectionId))
    .innerJoin(agencyOpsPayoutRun, eq(agencyOpsPayoutRun.id, agencyOpsPayoutSection.runId))
    .where(
      and(eq(agencyOpsPayoutLine.id, input.lineId), eq(agencyOpsPayoutRun.teamId, input.teamId)),
    )
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Payout line was not found." });
  }
  if (row.line.paidAmount <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Nothing to refund on this payout." });
  }

  // Minimal refund: zero paidAmount and return to draft.
  return updatePayoutLineStatus(actorUserId, {
    teamId: input.teamId,
    lineId: input.lineId,
    status: "draft",
  });
}

export async function settleMoneyObligation(
  actorUserId: string,
  input: {
    teamId: string;
    partyType: "client" | "member";
    obligationId: string;
    action: "pay" | "partial" | "refund";
    amount: number;
    periodStart: string;
    periodEnd: string;
    clientId?: string;
    userId?: string;
  },
): Promise<{ documentId: string; kind: "invoice" | "payout" }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const isReady = input.obligationId.startsWith("ready:");

  switch (input.action) {
    case "refund": {
      if (isReady) {
        throw new ORPCError("BAD_REQUEST", { message: "Cannot refund a Ready obligation." });
      }
      if (input.partyType === "client") {
        await refundInvoice(actorUserId, { teamId: input.teamId, invoiceId: input.obligationId });
        return { documentId: input.obligationId, kind: "invoice" };
      }
      await refundPayoutLine(actorUserId, { teamId: input.teamId, lineId: input.obligationId });
      return { documentId: input.obligationId, kind: "payout" };
    }
    case "pay":
    case "partial": {
      if (input.amount <= 0 && input.action === "partial") {
        throw new ORPCError("BAD_REQUEST", { message: "Partial amount must be positive." });
      }

      if (input.partyType === "client") {
        const clientId = input.clientId;
        if (!clientId) {
          throw new ORPCError("BAD_REQUEST", {
            message: "clientId is required for client settle.",
          });
        }

        let invoiceId = input.obligationId;
        let remainingAmount = 0;

        if (isReady) {
          const exported = await softExportClientReady(actorUserId, {
            teamId: input.teamId,
            clientId,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            amount: input.amount,
            markSent: true,
          });
          invoiceId = exported.id;
          remainingAmount = exported.remainingAmount;
          if (input.action === "pay") {
            await markClientReadyAdjustmentsApplied(actorUserId, {
              teamId: input.teamId,
              partyId: clientId,
              invoiceId,
              exported: [
                {
                  obligationId: input.obligationId,
                  periodStart: input.periodStart,
                  periodEnd: input.periodEnd,
                },
              ],
            });
          }
        } else {
          const [inv] = await db
            .select({
              amount: agencyOpsInvoice.amount,
              receivedAmount: agencyOpsInvoice.receivedAmount,
              status: agencyOpsInvoice.status,
            })
            .from(agencyOpsInvoice)
            .where(
              and(eq(agencyOpsInvoice.id, invoiceId), eq(agencyOpsInvoice.teamId, input.teamId)),
            )
            .limit(1);
          if (!inv) throw new ORPCError("NOT_FOUND", { message: "Invoice was not found." });
          if (inv.status === "draft") {
            await updateInvoiceStatus(actorUserId, {
              teamId: input.teamId,
              invoiceId,
              status: "sent",
            });
          }
          remainingAmount = invoiceRemainingAmount(inv.amount, inv.receivedAmount ?? 0);
        }

        const payAmount =
          input.action === "pay" ? remainingAmount : Math.min(input.amount, remainingAmount);
        if (payAmount <= 0) {
          throw new ORPCError("BAD_REQUEST", { message: "Nothing remaining to pay." });
        }

        await recordInvoicePayment(actorUserId, {
          teamId: input.teamId,
          invoiceId,
          amount: payAmount,
        });
        return { documentId: invoiceId, kind: "invoice" };
      }

      const userId = input.userId;
      if (!userId) {
        throw new ORPCError("BAD_REQUEST", { message: "userId is required for member settle." });
      }

      let lineId = input.obligationId;
      let remainingAmount = 0;

      if (isReady) {
        const exported = await softExportMemberReady(actorUserId, {
          teamId: input.teamId,
          userId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        });
        lineId = exported.id;
        remainingAmount = exported.remainingAmount;
      } else {
        const [row] = await db
          .select({
            amount: agencyOpsPayoutLine.amount,
            paidAmount: agencyOpsPayoutLine.paidAmount,
          })
          .from(agencyOpsPayoutLine)
          .innerJoin(
            agencyOpsPayoutSection,
            eq(agencyOpsPayoutSection.id, agencyOpsPayoutLine.sectionId),
          )
          .innerJoin(agencyOpsPayoutRun, eq(agencyOpsPayoutRun.id, agencyOpsPayoutSection.runId))
          .where(
            and(eq(agencyOpsPayoutLine.id, lineId), eq(agencyOpsPayoutRun.teamId, input.teamId)),
          )
          .limit(1);
        if (!row) {
          throw new ORPCError("NOT_FOUND", { message: "Payout line was not found." });
        }
        remainingAmount = payoutRemainingAmount(row.amount, row.paidAmount);
      }

      const payAmount =
        input.action === "pay" ? remainingAmount : Math.min(input.amount, remainingAmount);
      if (payAmount <= 0) {
        throw new ORPCError("BAD_REQUEST", { message: "Nothing remaining to pay." });
      }

      await recordPayoutPayment(actorUserId, {
        teamId: input.teamId,
        lineId,
        amount: payAmount,
      });
      return { documentId: lineId, kind: "payout" };
    }
    default: {
      const _exhaustive: never = input.action;
      return _exhaustive;
    }
  }
}

type ExportSelection = {
  obligationId: string;
  periodStart: string;
  periodEnd: string;
  kind: "ready" | "invoice" | "payout";
  amount: number;
};

function groupSelectionsForExport(
  selections: ExportSelection[],
  mode: "combine" | "split",
): ExportSelection[][] {
  if (selections.length === 0) return [];
  if (mode === "combine") return [selections];
  const byPeriod = new Map<string, ExportSelection[]>();
  for (const item of selections) {
    const key = `${item.periodStart}|${item.periodEnd}`;
    const list = byPeriod.get(key) ?? [];
    list.push(item);
    byPeriod.set(key, list);
  }
  return [...byPeriod.values()];
}

async function createCombinedClientInvoice(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    selections: ExportSelection[];
  },
): Promise<string> {
  const periodStart = input.selections.reduce(
    (min, s) => (s.periodStart < min ? s.periodStart : min),
    input.selections[0]!.periodStart,
  );
  const periodEnd = input.selections.reduce(
    (max, s) => (s.periodEnd > max ? s.periodEnd : max),
    input.selections[0]!.periodEnd,
  );
  const start = parseIsoDateTime(periodStart, "periodStart");
  const end = parseIsoDateTime(periodEnd, "periodEnd");
  const now = new Date();
  const invoiceId = createWorkspaceId("agency-inv");
  const number = await getNextInvoiceNumber(input.teamId);

  const lineItems: Array<{
    id: string;
    invoiceId: string;
    description: string;
    projectId: null;
    durationSeconds: number;
    rateAmount: number;
    amount: number;
    fromTimeEntries: boolean;
    createdAt: Date;
  }> = [];

  let total = 0;
  for (const sel of input.selections) {
    if (sel.amount <= 0) continue;
    total += sel.amount;
    lineItems.push({
      id: createWorkspaceId("agency-li"),
      invoiceId,
      description: `Period ${sel.periodStart.slice(0, 10)} – ${sel.periodEnd.slice(0, 10)}`,
      projectId: null,
      durationSeconds: 0,
      rateAmount: 0,
      amount: sel.amount,
      fromTimeEntries: false,
      createdAt: now,
    });
  }

  total = Math.max(0, total);

  const { currency: agencyCurrency } = await getAgencyCurrency(actorUserId, {
    teamId: input.teamId,
  });

  await db.transaction(async (tx) => {
    await tx.insert(agencyOpsInvoice).values({
      id: invoiceId,
      teamId: input.teamId,
      clientId: input.clientId,
      number,
      status: "draft",
      amount: total,
      receivedAmount: 0,
      currency: agencyCurrency,
      sourceAmount: total,
      fxRate: "1",
      fxAsOf: now,
      periodStart: start,
      periodEnd: end,
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    });
    if (lineItems.length > 0) {
      await tx.insert(agencyOpsInvoiceLineItem).values(lineItems);
    }
  });

  return invoiceId;
}

export async function exportMoneyDocuments(
  actorUserId: string,
  input: {
    teamId: string;
    partyType: AgencyOpsMoneyPendingPartyType;
    partyId: string;
    mode: "combine" | "split";
    selections: ExportSelection[];
  },
): Promise<{ documents: Array<{ id: string; kind: "invoice" | "payout" }> }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  if (input.selections.length === 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Select at least one obligation to export." });
  }

  const documents: Array<{ id: string; kind: "invoice" | "payout" }> = [];
  const readySelections = input.selections.filter((s) => s.kind === "ready");
  const existingSelections = input.selections.filter((s) => s.kind !== "ready");

  for (const sel of existingSelections) {
    switch (sel.kind) {
      case "invoice":
        documents.push({ id: sel.obligationId, kind: "invoice" });
        break;
      case "payout":
        documents.push({ id: sel.obligationId, kind: "payout" });
        break;
      case "ready":
        break;
      default: {
        const _exhaustive: never = sel.kind;
        return _exhaustive;
      }
    }
  }

  if (input.partyType === "client") {
    if (input.mode === "combine" && readySelections.length > 1) {
      const id = await createCombinedClientInvoice(actorUserId, {
        teamId: input.teamId,
        clientId: input.partyId,
        selections: readySelections,
      });
      documents.push({ id, kind: "invoice" });
      await markClientReadyAdjustmentsApplied(actorUserId, {
        teamId: input.teamId,
        partyId: input.partyId,
        invoiceId: id,
        exported: readySelections.map((sel) => ({
          obligationId: sel.obligationId,
          periodStart: sel.periodStart,
          periodEnd: sel.periodEnd,
        })),
      });
    } else {
      const groups =
        input.mode === "combine"
          ? [readySelections]
          : groupSelectionsForExport(readySelections, "split");

      for (const group of groups) {
        if (group.length === 0) continue;
        const first = group[0]!;
        const amount = group.reduce((sum, s) => sum + s.amount, 0);
        const exported = await softExportClientReady(actorUserId, {
          teamId: input.teamId,
          clientId: input.partyId,
          periodStart: first.periodStart,
          periodEnd: first.periodEnd,
          amount,
          markSent: false,
        });
        documents.push({ id: exported.id, kind: "invoice" });
        await markClientReadyAdjustmentsApplied(actorUserId, {
          teamId: input.teamId,
          partyId: input.partyId,
          invoiceId: exported.id,
          exported: group.map((sel) => ({
            obligationId: sel.obligationId,
            periodStart: sel.periodStart,
            periodEnd: sel.periodEnd,
          })),
        });
      }
    }
  } else {
    const groups =
      input.mode === "combine"
        ? [readySelections]
        : groupSelectionsForExport(readySelections, "split");

    for (const group of groups) {
      if (group.length === 0) continue;
      const first = group[0]!;
      const periodStart =
        input.mode === "combine"
          ? group.reduce((min, s) => (s.periodStart < min ? s.periodStart : min), first.periodStart)
          : first.periodStart;
      const periodEnd =
        input.mode === "combine"
          ? group.reduce((max, s) => (s.periodEnd > max ? s.periodEnd : max), first.periodEnd)
          : first.periodEnd;

      const exported = await softExportMemberReady(actorUserId, {
        teamId: input.teamId,
        userId: input.partyId,
        periodStart,
        periodEnd,
      });
      documents.push({ id: exported.id, kind: "payout" });
    }
  }

  return { documents };
}

export async function listPeriodMoneyObligations(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
    search?: string;
  },
): Promise<{
  clients: MoneyCarryClientObligation[];
  members: MoneyCarryMemberObligation[];
  pendingAdjustments: MoneyPendingAdjustmentRecord[];
}> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const rangeStart = parseIsoDateTime(input.periodStart, "periodStart");
  const rangeEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (rangeStart >= rangeEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const lookbackStart = lookbackStartFrom(rangeStart);
  const rangeStartIso = rangeStart.toISOString();
  const rangeEndIso = rangeEnd.toISOString();
  const lookbackStartIso = lookbackStart.toISOString();
  const priorEndIso = dayBefore(rangeStartIso);

  const [invoiceRows, payoutRows, currentActivity, priorActivity, pending] = await Promise.all([
    db
      .select({
        invoice: agencyOpsInvoice,
        clientName: agencyOpsClient.name,
      })
      .from(agencyOpsInvoice)
      .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsInvoice.clientId))
      .where(
        and(
          eq(agencyOpsInvoice.teamId, input.teamId),
          or(
            and(
              gte(agencyOpsInvoice.periodEnd, lookbackStart),
              lte(agencyOpsInvoice.periodStart, rangeEnd),
            ),
            and(
              lt(agencyOpsInvoice.periodEnd, rangeStart),
              sql`${agencyOpsInvoice.amount} - coalesce(${agencyOpsInvoice.receivedAmount}, 0) > 0`,
            ),
          ),
        ),
      ),
    db
      .select({
        line: agencyOpsPayoutLine,
        run: agencyOpsPayoutRun,
        userName: user.name,
        userAvatar: user.image,
      })
      .from(agencyOpsPayoutLine)
      .innerJoin(
        agencyOpsPayoutSection,
        eq(agencyOpsPayoutSection.id, agencyOpsPayoutLine.sectionId),
      )
      .innerJoin(agencyOpsPayoutRun, eq(agencyOpsPayoutRun.id, agencyOpsPayoutSection.runId))
      .leftJoin(user, eq(user.id, agencyOpsPayoutLine.payeeUserId))
      .where(
        and(
          eq(agencyOpsPayoutRun.teamId, input.teamId),
          inArray(agencyOpsPayoutSection.key, TEAM_SECTION_KEYS),
          or(
            and(
              gte(agencyOpsPayoutRun.periodEnd, lookbackStart),
              lte(agencyOpsPayoutRun.periodStart, rangeEnd),
            ),
            and(
              lt(agencyOpsPayoutRun.periodEnd, rangeStart),
              sql`${agencyOpsPayoutLine.amount} - coalesce(${agencyOpsPayoutLine.paidAmount}, 0) > 0`,
            ),
          ),
        ),
      ),
    listPeriodBillActivity(actorUserId, {
      teamId: input.teamId,
      periodStart: rangeStartIso,
      periodEnd: rangeEndIso,
      search: input.search,
    }),
    // Prior window [lookback, rangeStart)
    lookbackStart < rangeStart
      ? listPeriodBillActivity(actorUserId, {
          teamId: input.teamId,
          periodStart: lookbackStartIso,
          periodEnd: priorEndIso,
          search: input.search,
        })
      : Promise.resolve({ clients: [], members: [] }),
    listPendingAdjustments(actorUserId, { teamId: input.teamId }),
  ]);

  const invoices = invoiceRows.map((row) => {
    const receivedAmount = row.invoice.receivedAmount ?? 0;
    const sourceAmount = row.invoice.sourceAmount ?? row.invoice.amount;
    return {
      id: row.invoice.id,
      clientId: row.invoice.clientId,
      clientName: row.clientName,
      number: row.invoice.number,
      periodStart: row.invoice.periodStart.toISOString(),
      periodEnd: row.invoice.periodEnd.toISOString(),
      amount: row.invoice.amount,
      sourceAmount,
      rateCurrency: row.invoice.currency.toUpperCase(),
      receivedAmount,
      remainingAmount: invoiceRemainingAmount(row.invoice.amount, receivedAmount),
    };
  });

  const payouts = payoutRows
    .filter((row) => row.line.payeeUserId)
    .map((row) => {
      const paidAmount = row.line.paidAmount ?? 0;
      return {
        id: row.line.id,
        userId: row.line.payeeUserId!,
        userName: row.line.label?.trim() || row.userName?.trim() || "Unknown",
        userAvatar: formatAvatarUrl(row.userAvatar),
        periodStart: row.run.periodStart.toISOString(),
        periodEnd: row.run.periodEnd.toISOString(),
        amount: row.line.amount,
        paidAmount,
        remainingAmount: payoutRemainingAmount(row.line.amount, paidAmount),
        durationSeconds: row.line.durationSeconds ?? 0,
      };
    });

  const readySlicesClients = [
    ...currentActivity.clients.map((c) => ({
      clientId: c.clientId,
      clientName: c.clientName,
      periodStart: rangeStartIso,
      periodEnd: rangeEndIso,
      amount: c.billableAmount,
      sourceAmount: c.sourceBillableAmount,
      rateCurrency: c.rateCurrency,
      durationSeconds: c.durationSeconds,
      wasteAmount: c.wasteAmount,
    })),
    ...priorActivity.clients.map((c) => ({
      clientId: c.clientId,
      clientName: c.clientName,
      periodStart: lookbackStartIso,
      periodEnd: priorEndIso,
      amount: c.billableAmount,
      sourceAmount: c.sourceBillableAmount,
      rateCurrency: c.rateCurrency,
      durationSeconds: c.durationSeconds,
      wasteAmount: c.wasteAmount,
    })),
  ];

  const readySlicesMembers = [
    ...currentActivity.members.map((m) => ({
      userId: m.userId,
      userName: m.userName,
      userAvatar: m.userAvatar,
      periodStart: rangeStartIso,
      periodEnd: rangeEndIso,
      amount: m.payableAmount,
      durationSeconds: m.durationSeconds,
      wasteAmount: m.wasteAmount,
    })),
    ...priorActivity.members.map((m) => ({
      userId: m.userId,
      userName: m.userName,
      userAvatar: m.userAvatar,
      periodStart: lookbackStartIso,
      periodEnd: priorEndIso,
      amount: m.payableAmount,
      durationSeconds: m.durationSeconds,
      wasteAmount: m.wasteAmount,
    })),
  ];

  const periodPending = filterAdjustmentsForPeriod(pending.items, lookbackStartIso, rangeEndIso);

  let clients = buildClientObligations({
    rangeStart: rangeStartIso,
    rangeEnd: rangeEndIso,
    invoices,
    readySlices: readySlicesClients,
    adjustments: periodPending
      .filter((item) => item.partyType === "client")
      .map((item) => ({
        partyId: item.partyId,
        obligationId: item.obligationId,
        appliedInvoiceId: item.appliedInvoiceId,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        kind: item.kind,
        amount: item.amount,
      })),
  });
  let members = buildMemberObligations({
    rangeStart: rangeStartIso,
    rangeEnd: rangeEndIso,
    payouts,
    readySlices: readySlicesMembers,
    adjustments: periodPending
      .filter((item) => item.partyType === "member")
      .map((item) => ({
        partyId: item.partyId,
        obligationId: item.obligationId,
        appliedInvoiceId: item.appliedInvoiceId,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        kind: item.kind,
        amount: item.amount,
      })),
  });

  const searchTerm = input.search?.trim().toLowerCase();
  if (searchTerm) {
    clients = clients.filter((c) => c.clientName.toLowerCase().includes(searchTerm));
    members = members.filter((m) => m.userName.toLowerCase().includes(searchTerm));
  }

  return {
    clients,
    members,
    pendingAdjustments: periodPending,
  };
}
