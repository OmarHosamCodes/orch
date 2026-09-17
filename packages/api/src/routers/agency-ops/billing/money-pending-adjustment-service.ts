import { db } from "@orch/db";
import {
  agencyOpsClient,
  agencyOpsMoneyPendingAdjustment,
  type AgencyOpsMoneyPendingAdjustmentKind,
  type AgencyOpsMoneyPendingPartyType,
} from "@orch/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";

import { parseIsoDateTime } from "../shared/date-helpers";
import { requireAgencyRole } from "../shared/membership";
import {
  applyInvoiceClientAdjustment,
  isInvoiceObligationId,
  reverseInvoiceClientAdjustment,
} from "./client-bill-adjustment";
import { loadMoneyResolveContext } from "./money-fx-service";
import {
  filterAdjustmentsForPeriod,
  readyAdjustmentMatchesExport,
  scoreboardClientAdjustmentNet,
} from "./money-bill-carry";

export type MoneyPendingAdjustmentRecord = {
  id: string;
  teamId: string;
  partyType: AgencyOpsMoneyPendingPartyType;
  partyId: string;
  periodStart: string | null;
  periodEnd: string | null;
  obligationId: string | null;
  appliedInvoiceId: string | null;
  invoiceLineItemId: string | null;
  kind: AgencyOpsMoneyPendingAdjustmentKind;
  amount: number;
  note: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

function mapPendingAdjustmentRow(
  row: typeof agencyOpsMoneyPendingAdjustment.$inferSelect,
): MoneyPendingAdjustmentRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    partyType: row.partyType,
    partyId: row.partyId,
    periodStart: row.periodStart?.toISOString() ?? null,
    periodEnd: row.periodEnd?.toISOString() ?? null,
    obligationId: row.obligationId ?? null,
    appliedInvoiceId: row.appliedInvoiceId ?? null,
    invoiceLineItemId: row.invoiceLineItemId ?? null,
    kind: row.kind,
    amount: row.amount,
    note: row.note ?? "",
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPendingAdjustments(
  actorUserId: string,
  input: {
    teamId: string;
    partyType?: AgencyOpsMoneyPendingPartyType;
    partyId?: string;
  },
): Promise<{ items: MoneyPendingAdjustmentRecord[] }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const filters = [eq(agencyOpsMoneyPendingAdjustment.teamId, input.teamId)];
  if (input.partyType) {
    filters.push(eq(agencyOpsMoneyPendingAdjustment.partyType, input.partyType));
  }
  if (input.partyId) {
    filters.push(eq(agencyOpsMoneyPendingAdjustment.partyId, input.partyId));
  }

  const rows = await db
    .select()
    .from(agencyOpsMoneyPendingAdjustment)
    .where(and(...filters))
    .orderBy(asc(agencyOpsMoneyPendingAdjustment.createdAt));

  return { items: rows.map(mapPendingAdjustmentRow) };
}

export async function upsertPendingAdjustment(
  actorUserId: string,
  input: {
    teamId: string;
    id?: string;
    partyType: AgencyOpsMoneyPendingPartyType;
    partyId: string;
    kind: AgencyOpsMoneyPendingAdjustmentKind;
    amount: number;
    note?: string;
    periodStart?: string;
    periodEnd?: string;
    obligationId?: string;
  },
): Promise<MoneyPendingAdjustmentRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Amount must be a positive integer (minor units).",
    });
  }

  if (input.partyType === "client") {
    if (!input.obligationId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "obligationId is required for client adjustments.",
      });
    }
    if (!input.periodStart || !input.periodEnd) {
      throw new ORPCError("BAD_REQUEST", {
        message: "periodStart and periodEnd are required for client adjustments.",
      });
    }
  }

  const periodStart = input.periodStart ? parseIsoDateTime(input.periodStart, "periodStart") : null;
  const periodEnd = input.periodEnd ? parseIsoDateTime(input.periodEnd, "periodEnd") : null;
  if (periodStart && periodEnd && periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const now = new Date();
  const note = input.note?.trim() ?? "";
  const moneyCtx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
  const money = moneyCtx.resolve(input.amount, moneyCtx.agencyCurrency);
  await moneyCtx.lock();

  const obligationId = input.obligationId ?? null;
  const applyToInvoice =
    input.partyType === "client" && obligationId != null && isInvoiceObligationId(obligationId);

  return db.transaction(async (tx) => {
    let existing: typeof agencyOpsMoneyPendingAdjustment.$inferSelect | undefined;
    if (input.id) {
      const [row] = await tx
        .select()
        .from(agencyOpsMoneyPendingAdjustment)
        .where(
          and(
            eq(agencyOpsMoneyPendingAdjustment.id, input.id),
            eq(agencyOpsMoneyPendingAdjustment.teamId, input.teamId),
          ),
        )
        .limit(1);
      if (!row) {
        throw new ORPCError("NOT_FOUND", { message: "Pending adjustment was not found." });
      }
      existing = row;
    }

    const applyToSameInvoice =
      applyToInvoice &&
      obligationId != null &&
      existing?.appliedInvoiceId === obligationId &&
      existing.invoiceLineItemId != null;

    if (existing?.appliedInvoiceId && existing.invoiceLineItemId && !applyToSameInvoice) {
      await reverseInvoiceClientAdjustment(tx, {
        teamId: input.teamId,
        clientId: existing.partyId,
        invoiceId: existing.appliedInvoiceId,
        invoiceLineItemId: existing.invoiceLineItemId,
        kind: existing.kind,
        amount: existing.amount,
      });
    }

    let appliedInvoiceId: string | null = null;
    let invoiceLineItemId: string | null = null;
    if (applyToInvoice && obligationId) {
      const applied = await applyInvoiceClientAdjustment(tx, {
        teamId: input.teamId,
        clientId: input.partyId,
        invoiceId: obligationId,
        kind: input.kind,
        amount: money.amount,
        note,
        existingLineItemId: applyToSameInvoice ? existing?.invoiceLineItemId : null,
      });
      appliedInvoiceId = applied.appliedInvoiceId;
      invoiceLineItemId = applied.invoiceLineItemId;
    }

    if (existing) {
      const [updated] = await tx
        .update(agencyOpsMoneyPendingAdjustment)
        .set({
          partyType: input.partyType,
          partyId: input.partyId,
          kind: input.kind,
          amount: money.amount,
          currency: money.sourceCurrency,
          sourceAmount: money.sourceAmount,
          fxRate: money.fxRate,
          fxAsOf: new Date(money.fxAsOf),
          note,
          periodStart,
          periodEnd,
          obligationId,
          appliedInvoiceId,
          invoiceLineItemId,
          updatedAt: now,
        })
        .where(eq(agencyOpsMoneyPendingAdjustment.id, existing.id))
        .returning();

      if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");
      return mapPendingAdjustmentRow(updated);
    }

    const [inserted] = await tx
      .insert(agencyOpsMoneyPendingAdjustment)
      .values({
        id: createWorkspaceId("agency-money-adj"),
        teamId: input.teamId,
        partyType: input.partyType,
        partyId: input.partyId,
        kind: input.kind,
        amount: money.amount,
        currency: money.sourceCurrency,
        sourceAmount: money.sourceAmount,
        fxRate: money.fxRate,
        fxAsOf: new Date(money.fxAsOf),
        note,
        periodStart,
        periodEnd,
        obligationId,
        appliedInvoiceId,
        invoiceLineItemId,
        createdByUserId: actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!inserted) throw new ORPCError("INTERNAL_SERVER_ERROR");
    return mapPendingAdjustmentRow(inserted);
  });
}

export async function deletePendingAdjustment(
  actorUserId: string,
  input: { teamId: string; id: string },
): Promise<{ id: string }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(agencyOpsMoneyPendingAdjustment)
      .where(
        and(
          eq(agencyOpsMoneyPendingAdjustment.id, input.id),
          eq(agencyOpsMoneyPendingAdjustment.teamId, input.teamId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Pending adjustment was not found." });
    }

    if (existing.appliedInvoiceId && existing.invoiceLineItemId) {
      await reverseInvoiceClientAdjustment(tx, {
        teamId: input.teamId,
        clientId: existing.partyId,
        invoiceId: existing.appliedInvoiceId,
        invoiceLineItemId: existing.invoiceLineItemId,
        kind: existing.kind,
        amount: existing.amount,
      });
    }

    const [deleted] = await tx
      .delete(agencyOpsMoneyPendingAdjustment)
      .where(eq(agencyOpsMoneyPendingAdjustment.id, existing.id))
      .returning({ id: agencyOpsMoneyPendingAdjustment.id });

    if (!deleted) {
      throw new ORPCError("NOT_FOUND", { message: "Pending adjustment was not found." });
    }

    return { id: deleted.id };
  });
}

export async function markClientReadyAdjustmentsApplied(
  actorUserId: string,
  input: {
    teamId: string;
    partyId: string;
    invoiceId: string;
    exported: ReadonlyArray<{ obligationId: string; periodStart: string; periodEnd: string }>;
  },
): Promise<void> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  if (input.exported.length === 0) return;

  const rows = await db
    .select({
      id: agencyOpsMoneyPendingAdjustment.id,
      obligationId: agencyOpsMoneyPendingAdjustment.obligationId,
      appliedInvoiceId: agencyOpsMoneyPendingAdjustment.appliedInvoiceId,
      periodStart: agencyOpsMoneyPendingAdjustment.periodStart,
      periodEnd: agencyOpsMoneyPendingAdjustment.periodEnd,
    })
    .from(agencyOpsMoneyPendingAdjustment)
    .where(
      and(
        eq(agencyOpsMoneyPendingAdjustment.teamId, input.teamId),
        eq(agencyOpsMoneyPendingAdjustment.partyType, "client"),
        eq(agencyOpsMoneyPendingAdjustment.partyId, input.partyId),
      ),
    );

  const ids = rows
    .filter((row) =>
      readyAdjustmentMatchesExport(
        {
          obligationId: row.obligationId,
          appliedInvoiceId: row.appliedInvoiceId,
          periodStart: row.periodStart?.toISOString() ?? null,
          periodEnd: row.periodEnd?.toISOString() ?? null,
        },
        input.exported,
      ),
    )
    .map((row) => row.id);

  if (ids.length === 0) return;

  await db
    .update(agencyOpsMoneyPendingAdjustment)
    .set({
      appliedInvoiceId: input.invoiceId,
      updatedAt: new Date(),
    })
    .where(inArray(agencyOpsMoneyPendingAdjustment.id, ids));
}

/** Net signed adjustment total for external clients in the viewing period (Ready + invoice). */
export async function sumExternalClientPeriodAdjustments(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string },
): Promise<number> {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");
  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  const rows = await db
    .select({
      kind: agencyOpsMoneyPendingAdjustment.kind,
      amount: agencyOpsMoneyPendingAdjustment.amount,
      obligationId: agencyOpsMoneyPendingAdjustment.obligationId,
      appliedInvoiceId: agencyOpsMoneyPendingAdjustment.appliedInvoiceId,
      periodStart: agencyOpsMoneyPendingAdjustment.periodStart,
      periodEnd: agencyOpsMoneyPendingAdjustment.periodEnd,
    })
    .from(agencyOpsMoneyPendingAdjustment)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsMoneyPendingAdjustment.partyId))
    .where(
      and(
        eq(agencyOpsMoneyPendingAdjustment.teamId, input.teamId),
        eq(agencyOpsMoneyPendingAdjustment.partyType, "client"),
        eq(agencyOpsClient.category, "external"),
      ),
    );

  const inPeriod = filterAdjustmentsForPeriod(
    rows.map((row) => ({
      kind: row.kind,
      amount: row.amount,
      obligationId: row.obligationId,
      appliedInvoiceId: row.appliedInvoiceId,
      periodStart: row.periodStart?.toISOString() ?? null,
      periodEnd: row.periodEnd?.toISOString() ?? null,
    })),
    periodStart.toISOString(),
    periodEnd.toISOString(),
  );

  return scoreboardClientAdjustmentNet(inPeriod);
}
