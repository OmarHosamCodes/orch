import { db } from "@orch/db";
import {
  agencyOpsClient,
  agencyOpsExpense,
  agencyOpsFxRate,
  agencyOpsInvoice,
  agencyOpsMemberRate,
  agencyOpsMoneyPendingAdjustment,
  agencyOpsMoneySettings,
  agencyOpsPayoutRun,
  agencyOpsPeriodFx,
} from "@orch/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";

import { parseIsoDateTime } from "../shared/date-helpers";
import { requireAgencyRole } from "../shared/membership";
import {
  MoneyCurrencyError,
  normalizeCurrencyCode,
  resolveMoneyValue,
  type MoneyFxRateRow,
  type ResolvedMoneyValue,
} from "./money-currency";
import { missingPeriodFxPairs, periodFxApplyBlockedMessage } from "./money-period-fx";
import { invalidateMoneySettingsCache } from "./money-settings-cache";

const ISO_CURRENCY = /^[A-Z]{3}$/;

export type AgencyFxRateRecord = {
  id: string;
  teamId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  updatedAt: string;
};

export type AgencyPeriodFxRecord = {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  fxAsOf: string | null;
};

function mapFxRow(row: typeof agencyOpsFxRate.$inferSelect): AgencyFxRateRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    fromCurrency: row.fromCurrency,
    toCurrency: row.toCurrency,
    rate: row.rate,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadAgencyCurrency(
  teamId: string,
): Promise<{ currency: string; currencyLockedAt: string | null }> {
  const [row] = await db
    .select({
      currency: agencyOpsMoneySettings.currency,
      currencyLockedAt: agencyOpsMoneySettings.currencyLockedAt,
    })
    .from(agencyOpsMoneySettings)
    .where(eq(agencyOpsMoneySettings.teamId, teamId))
    .limit(1);

  return {
    currency: normalizeCurrencyCode(row?.currency ?? "USD"),
    currencyLockedAt: row?.currencyLockedAt?.toISOString() ?? null,
  };
}

async function teamHasMoneyRecords(teamId: string): Promise<boolean> {
  const checks = await Promise.all([
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsMemberRate)
      .where(eq(agencyOpsMemberRate.teamId, teamId))
      .limit(1),
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsInvoice)
      .where(eq(agencyOpsInvoice.teamId, teamId))
      .limit(1),
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsPayoutRun)
      .where(eq(agencyOpsPayoutRun.teamId, teamId))
      .limit(1),
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsExpense)
      .where(eq(agencyOpsExpense.teamId, teamId))
      .limit(1),
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsMoneyPendingAdjustment)
      .where(eq(agencyOpsMoneyPendingAdjustment.teamId, teamId))
      .limit(1),
    db
      .select({ n: sql<number>`1` })
      .from(agencyOpsClient)
      .where(
        and(
          eq(agencyOpsClient.teamId, teamId),
          sql`${agencyOpsClient.billableRateAmount} is not null`,
        ),
      )
      .limit(1),
  ]);

  return checks.some((rows) => rows.length > 0);
}

async function ensureAgencyCurrencyLocked(teamId: string): Promise<void> {
  const now = new Date();
  await db
    .insert(agencyOpsMoneySettings)
    .values({
      teamId,
      currency: "USD",
      currencyLockedAt: now,
      rulesJson: { enabledRuleIds: [] },
      calcOptionsJson: { enabledOptionIds: [] },
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsMoneySettings.teamId,
      set: {
        currencyLockedAt: sql`COALESCE(${agencyOpsMoneySettings.currencyLockedAt}, ${now})`,
        updatedAt: now,
      },
    });
  invalidateMoneySettingsCache(teamId);
}

async function listTeamFxRateRows(teamId: string): Promise<MoneyFxRateRow[]> {
  const rows = await db
    .select({
      fromCurrency: agencyOpsFxRate.fromCurrency,
      toCurrency: agencyOpsFxRate.toCurrency,
      rate: agencyOpsFxRate.rate,
    })
    .from(agencyOpsFxRate)
    .where(eq(agencyOpsFxRate.teamId, teamId));
  return rows;
}

function mapPeriodFxRows(
  rows: Array<{ fromCurrency: string; toCurrency: string; rate: string; fxAsOf: Date | null }>,
): AgencyPeriodFxRecord[] {
  return rows.map((row) => ({
    fromCurrency: row.fromCurrency,
    toCurrency: row.toCurrency,
    rate: row.rate,
    fxAsOf: row.fxAsOf?.toISOString() ?? null,
  }));
}

async function loadPeriodFxRows(
  teamId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<Array<{ fromCurrency: string; toCurrency: string; rate: string; fxAsOf: Date | null }>> {
  return db
    .select({
      fromCurrency: agencyOpsPeriodFx.fromCurrency,
      toCurrency: agencyOpsPeriodFx.toCurrency,
      rate: agencyOpsPeriodFx.rate,
      fxAsOf: agencyOpsPeriodFx.fxAsOf,
    })
    .from(agencyOpsPeriodFx)
    .where(
      and(
        eq(agencyOpsPeriodFx.teamId, teamId),
        eq(agencyOpsPeriodFx.periodStart, periodStart),
        eq(agencyOpsPeriodFx.periodEnd, periodEnd),
      ),
    );
}

async function periodHasInvoices(
  teamId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<boolean> {
  const rows = await db
    .select({ n: sql<number>`1` })
    .from(agencyOpsInvoice)
    .where(
      and(
        eq(agencyOpsInvoice.teamId, teamId),
        eq(agencyOpsInvoice.periodStart, periodStart),
        eq(agencyOpsInvoice.periodEnd, periodEnd),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function snapshotMissingPeriodFx(
  teamId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<MoneyFxRateRow[]> {
  const current = await listTeamFxRateRows(teamId);
  const snapshot = await loadPeriodFxRows(teamId, periodStart, periodEnd);
  const missing = missingPeriodFxPairs(current, snapshot);
  if (missing.length === 0) {
    return snapshot.map((row) => ({
      fromCurrency: row.fromCurrency,
      toCurrency: row.toCurrency,
      rate: row.rate,
    }));
  }

  const now = new Date();
  await db
    .insert(agencyOpsPeriodFx)
    .values(
      missing.map((row) => ({
        id: createWorkspaceId("agency-period-fx"),
        teamId,
        periodStart,
        periodEnd,
        fromCurrency: normalizeCurrencyCode(row.fromCurrency),
        toCurrency: normalizeCurrencyCode(row.toCurrency),
        rate: row.rate,
        fxAsOf: now,
        createdAt: now,
      })),
    )
    .onConflictDoNothing();

  const next = await loadPeriodFxRows(teamId, periodStart, periodEnd);
  return next.map((row) => ({
    fromCurrency: row.fromCurrency,
    toCurrency: row.toCurrency,
    rate: row.rate,
  }));
}

/** Public read of agency currency (membership required). */
export async function getAgencyCurrency(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ currency: string; currencyLockedAt: string | null }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  return loadAgencyCurrency(input.teamId);
}

export type MoneyResolveContext = {
  agencyCurrency: string;
  resolve: (
    sourceAmount: number,
    sourceCurrency?: string,
    fxRateOverride?: string,
  ) => ResolvedMoneyValue;
  lock: () => Promise<void>;
};

/**
 * Load FX + agency currency once per write transaction.
 * Caller must already have required team membership; actor is for the service contract only.
 */
export async function loadMoneyResolveContext(
  actorUserId: string,
  input: { teamId: string },
): Promise<MoneyResolveContext> {
  void actorUserId;
  const { currency: agencyCurrency } = await loadAgencyCurrency(input.teamId);
  const rates = await listTeamFxRateRows(input.teamId);
  return {
    agencyCurrency,
    resolve(sourceAmount: number, sourceCurrency?: string, fxRateOverride?: string) {
      try {
        return resolveMoneyValue({
          sourceAmount,
          sourceCurrency: sourceCurrency || agencyCurrency,
          agencyCurrency,
          rates,
          fxRateOverride,
        });
      } catch (error) {
        if (error instanceof MoneyCurrencyError) {
          throw new ORPCError("BAD_REQUEST", { message: error.message });
        }
        throw error;
      }
    },
    async lock() {
      await ensureAgencyCurrencyLocked(input.teamId);
    },
  };
}

/**
 * Resolve a source amount into agency currency and soft-lock team currency.
 */
export async function resolveMoneyForTeam(
  actorUserId: string,
  input: { teamId: string; sourceAmount: number; sourceCurrency: string },
): Promise<ResolvedMoneyValue & { agencyCurrency: string }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  const ctx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
  const resolved = ctx.resolve(input.sourceAmount, input.sourceCurrency);
  await ctx.lock();
  return { ...resolved, agencyCurrency: ctx.agencyCurrency };
}

export async function listFxRates(
  actorUserId: string,
  input: { teamId: string },
): Promise<{
  items: AgencyFxRateRecord[];
  agencyCurrency: string;
  currencyLockedAt: string | null;
}> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  const agency = await loadAgencyCurrency(input.teamId);
  const rows = await db
    .select()
    .from(agencyOpsFxRate)
    .where(eq(agencyOpsFxRate.teamId, input.teamId));
  return {
    items: rows.map(mapFxRow),
    agencyCurrency: agency.currency,
    currencyLockedAt: agency.currencyLockedAt,
  };
}

export async function upsertFxRate(
  actorUserId: string,
  input: {
    teamId: string;
    fromCurrency: string;
    toCurrency: string;
    rate: string;
    id?: string;
  },
): Promise<AgencyFxRateRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const fromCurrency = normalizeCurrencyCode(input.fromCurrency);
  const toCurrency = normalizeCurrencyCode(input.toCurrency);
  if (!ISO_CURRENCY.test(fromCurrency) || !ISO_CURRENCY.test(toCurrency)) {
    throw new ORPCError("BAD_REQUEST", { message: "Currency must be a 3-letter ISO code." });
  }
  if (fromCurrency === toCurrency) {
    throw new ORPCError("BAD_REQUEST", { message: "fromCurrency and toCurrency must differ." });
  }
  const rateNum = Number(input.rate);
  if (!Number.isFinite(rateNum) || rateNum <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Rate must be a positive number." });
  }
  const rate = String(rateNum);
  const now = new Date();

  const [row] = await db
    .insert(agencyOpsFxRate)
    .values({
      id: input.id ?? createWorkspaceId("agency-fx"),
      teamId: input.teamId,
      fromCurrency,
      toCurrency,
      rate,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsFxRate.teamId, agencyOpsFxRate.fromCurrency, agencyOpsFxRate.toCurrency],
      set: {
        rate,
        updatedAt: now,
      },
    })
    .returning();

  if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return mapFxRow(row);
}

export async function deleteFxRate(
  actorUserId: string,
  input: { teamId: string; id: string },
): Promise<{ ok: true }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  const deleted = await db
    .delete(agencyOpsFxRate)
    .where(and(eq(agencyOpsFxRate.teamId, input.teamId), eq(agencyOpsFxRate.id, input.id)))
    .returning({ id: agencyOpsFxRate.id });
  if (deleted.length === 0) {
    throw new ORPCError("NOT_FOUND", { message: "FX rate was not found." });
  }
  return { ok: true };
}

export async function ensurePeriodFx(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string },
): Promise<MoneyFxRateRow[]> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }
  return snapshotMissingPeriodFx(input.teamId, periodStart, periodEnd);
}

export async function listPeriodFx(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string },
): Promise<{ items: AgencyPeriodFxRecord[]; canApplyCurrent: boolean }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }
  await snapshotMissingPeriodFx(input.teamId, periodStart, periodEnd);
  const rows = await loadPeriodFxRows(input.teamId, periodStart, periodEnd);
  return {
    items: mapPeriodFxRows(rows),
    canApplyCurrent: !(await periodHasInvoices(input.teamId, periodStart, periodEnd)),
  };
}

export async function applyCurrentFxToPeriod(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string },
): Promise<{ items: AgencyPeriodFxRecord[]; canApplyCurrent: boolean }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }
  const blocked = periodFxApplyBlockedMessage(
    await periodHasInvoices(input.teamId, periodStart, periodEnd),
  );
  if (blocked) {
    throw new ORPCError("BAD_REQUEST", {
      message: blocked,
    });
  }

  const current = await listTeamFxRateRows(input.teamId);
  const now = new Date();
  await db
    .delete(agencyOpsPeriodFx)
    .where(
      and(
        eq(agencyOpsPeriodFx.teamId, input.teamId),
        eq(agencyOpsPeriodFx.periodStart, periodStart),
        eq(agencyOpsPeriodFx.periodEnd, periodEnd),
      ),
    );

  if (current.length > 0) {
    await db.insert(agencyOpsPeriodFx).values(
      current.map((row) => ({
        id: createWorkspaceId("agency-period-fx"),
        teamId: input.teamId,
        periodStart,
        periodEnd,
        fromCurrency: normalizeCurrencyCode(row.fromCurrency),
        toCurrency: normalizeCurrencyCode(row.toCurrency),
        rate: row.rate,
        fxAsOf: now,
        createdAt: now,
      })),
    );
  }

  const rows = await loadPeriodFxRows(input.teamId, periodStart, periodEnd);
  return { items: mapPeriodFxRows(rows), canApplyCurrent: true };
}

export async function setAgencyCurrency(
  actorUserId: string,
  input: { teamId: string; currency: string },
): Promise<{ currency: string; currencyLockedAt: string | null }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const currency = normalizeCurrencyCode(input.currency);
  if (!ISO_CURRENCY.test(currency)) {
    throw new ORPCError("BAD_REQUEST", { message: "Currency must be a 3-letter ISO code." });
  }

  const existing = await loadAgencyCurrency(input.teamId);
  if (existing.currencyLockedAt || (await teamHasMoneyRecords(input.teamId))) {
    if (existing.currency !== currency) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Currency locked after money exists.",
      });
    }
    return existing;
  }

  const now = new Date();
  await db
    .insert(agencyOpsMoneySettings)
    .values({
      teamId: input.teamId,
      currency,
      currencyLockedAt: null,
      rulesJson: { enabledRuleIds: [] },
      calcOptionsJson: { enabledOptionIds: [] },
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsMoneySettings.teamId,
      set: {
        currency,
        updatedAt: now,
      },
    });

  invalidateMoneySettingsCache(input.teamId);
  return { currency, currencyLockedAt: null };
}

/** Frankfurter live suggest — does not persist. */
export async function suggestFxRate(
  actorUserId: string,
  input: { teamId: string; fromCurrency: string; toCurrency: string },
): Promise<{ rate: string; asOf: string; provider: "frankfurter" }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const from = normalizeCurrencyCode(input.fromCurrency);
  const to = normalizeCurrencyCode(input.toCurrency);
  if (!ISO_CURRENCY.test(from) || !ISO_CURRENCY.test(to)) {
    throw new ORPCError("BAD_REQUEST", { message: "Currency must be a 3-letter ISO code." });
  }
  if (from === to) {
    return { rate: "1", asOf: new Date().toISOString(), provider: "frankfurter" };
  }

  const url = `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new ORPCError("BAD_GATEWAY", { message: "Could not reach FX provider." });
  }
  if (!response.ok) {
    throw new ORPCError("BAD_GATEWAY", {
      message: `FX provider returned ${response.status}.`,
    });
  }

  const body = (await response.json()) as { rate?: number; date?: string };
  if (typeof body.rate !== "number" || !Number.isFinite(body.rate) || body.rate <= 0) {
    throw new ORPCError("BAD_GATEWAY", { message: "FX provider returned an invalid rate." });
  }

  const asOf = body.date
    ? new Date(`${body.date}T00:00:00.000Z`).toISOString()
    : new Date().toISOString();

  return {
    rate: String(body.rate),
    asOf,
    provider: "frankfurter",
  };
}
