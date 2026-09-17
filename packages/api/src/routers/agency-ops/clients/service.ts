import { eq, isNotNull, isNull, and, asc, sql, gte, lte, desc, inArray } from "drizzle-orm";
import {
  agencyOpsClient,
  agencyOpsClientContact,
  agencyOpsInvoice,
  agencyOpsProject,
  agencyOpsTimeEntry,
} from "@orch/db/schema";
import { db } from "@orch/db";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { getClientByIdForTeam } from "../shared/lookup-helpers";
import { type AgencyClientArchiveFilter } from "../shared/report-helpers";
import { requireAgencyRole } from "../shared/membership";
import { loadMoneyResolveContext } from "../billing/money-fx-service";
import { assertWithinLimit } from "../../../billing-team";

type AgencyClientCommercialInput = {
  category?: "internal" | "external";
  billableRateAmount?: number | null;
  currency?: string;
};

function clientInputTouchesCommercialFields(input: AgencyClientCommercialInput): boolean {
  if ("category" in input && input.category !== undefined) {
    return true;
  }
  if ("billableRateAmount" in input && input.billableRateAmount !== undefined) {
    return true;
  }
  if ("currency" in input && input.currency !== undefined) {
    return true;
  }
  return false;
}

async function requireAgencyClientWriteRole(
  actorUserId: string,
  teamId: string,
  input: AgencyClientCommercialInput,
) {
  if (clientInputTouchesCommercialFields(input)) {
    await requireAgencyRole(actorUserId, teamId, "owner");
  } else {
    await requireAgencyRole(actorUserId, teamId, "editor");
  }
}

type AgencyClientRecord = {
  id: string;
  teamId: string;
  name: string;
  category: "internal" | "external";
  billableRateAmount: number | null;
  sourceBillableRateAmount: number | null;
  currency: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapClientRow(row: {
  id: string;
  teamId: string;
  name: string;
  category: "internal" | "external";
  billableRateAmount: number | null;
  sourceBillableRateAmount: number | null;
  currency: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AgencyClientRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    name: row.name,
    category: row.category,
    billableRateAmount: row.billableRateAmount,
    sourceBillableRateAmount: row.sourceBillableRateAmount,
    currency: row.currency,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const clientSelect = {
  id: agencyOpsClient.id,
  teamId: agencyOpsClient.teamId,
  name: agencyOpsClient.name,
  category: agencyOpsClient.category,
  billableRateAmount: agencyOpsClient.billableRateAmount,
  sourceBillableRateAmount: agencyOpsClient.sourceBillableRateAmount,
  currency: agencyOpsClient.currency,
  archivedAt: agencyOpsClient.archivedAt,
  createdAt: agencyOpsClient.createdAt,
  updatedAt: agencyOpsClient.updatedAt,
};

export async function listAgencyClients(
  actorUserId: string,
  input: {
    teamId: string;
    includeArchived?: boolean;
    archiveFilter?: AgencyClientArchiveFilter;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const archiveFilter = input.archiveFilter ?? (input.includeArchived ? "all" : "nonarchived");

  const filters = [eq(agencyOpsClient.teamId, input.teamId)];
  if (archiveFilter === "archived") {
    filters.push(isNotNull(agencyOpsClient.archivedAt));
  } else if (archiveFilter === "nonarchived") {
    filters.push(isNull(agencyOpsClient.archivedAt));
  }

  const rows = await db
    .select(clientSelect)
    .from(agencyOpsClient)
    .where(and(...filters))
    .orderBy(asc(agencyOpsClient.name));

  return {
    items: rows.map((row) => mapClientRow(row)),
  };
}

export type AgencyClientBookIndexItem = {
  clientId: string;
  weekDurationSeconds: number;
  monthUninvoicedDurationSeconds: number;
  outstandingAmount: number;
  billingCurrency: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

export type AgencyClientBookIndex = {
  canViewBilling: boolean;
  items: AgencyClientBookIndexItem[];
};

export async function listAgencyClientsBookIndex(
  actorUserId: string,
  input: {
    teamId: string;
    includeArchived?: boolean;
    archiveFilter?: AgencyClientArchiveFilter;
  },
): Promise<AgencyClientBookIndex> {
  const role = await requireAgencyRole(actorUserId, input.teamId, "viewer");
  const listed = await listAgencyClients(actorUserId, input);
  const canViewBilling = role === "owner";
  const clientIds = listed.items.map((client) => client.id);
  if (clientIds.length === 0) {
    return { canViewBilling, items: [] };
  }

  const weekStart = utcWeekStart();
  const { start: monthStart, end: monthEnd } = utcMonthBounds();

  const contactRows = await db
    .select({
      clientId: agencyOpsClientContact.clientId,
      name: agencyOpsClientContact.name,
      email: agencyOpsClientContact.email,
      phone: agencyOpsClientContact.phone,
    })
    .from(agencyOpsClientContact)
    .where(
      and(
        eq(agencyOpsClientContact.teamId, input.teamId),
        inArray(agencyOpsClientContact.clientId, clientIds),
      ),
    );

  const weekRows = await db
    .select({
      clientId: agencyOpsProject.clientId,
      total: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`.mapWith(Number),
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
        inArray(agencyOpsProject.clientId, clientIds),
        gte(agencyOpsTimeEntry.startedAt, weekStart),
      ),
    )
    .groupBy(agencyOpsProject.clientId);

  const monthRows = await db
    .select({
      clientId: agencyOpsProject.clientId,
      total: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`.mapWith(Number),
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
        inArray(agencyOpsProject.clientId, clientIds),
        gte(agencyOpsTimeEntry.startedAt, monthStart),
        lte(agencyOpsTimeEntry.startedAt, monthEnd),
      ),
    )
    .groupBy(agencyOpsProject.clientId);

  const weekByClient = new Map(weekRows.map((row) => [row.clientId, row.total]));
  const monthByClient = new Map(monthRows.map((row) => [row.clientId, row.total]));
  const contactByClient = new Map(contactRows.map((row) => [row.clientId, row]));

  const outstandingByClient = new Map<string, { amount: number; currency: string }>();
  const invoicedThisMonth = new Set<string>();

  if (canViewBilling) {
    const openStatuses = ["draft", "sent", "partial"] as const;
    const openRows = await db
      .select({
        clientId: agencyOpsInvoice.clientId,
        amount: agencyOpsInvoice.amount,
        receivedAmount: agencyOpsInvoice.receivedAmount,
        currency: agencyOpsInvoice.currency,
      })
      .from(agencyOpsInvoice)
      .where(
        and(
          eq(agencyOpsInvoice.teamId, input.teamId),
          inArray(agencyOpsInvoice.clientId, clientIds),
          inArray(agencyOpsInvoice.status, [...openStatuses]),
        ),
      );

    for (const row of openRows) {
      const remaining = Math.max(0, row.amount - row.receivedAmount);
      const current = outstandingByClient.get(row.clientId);
      outstandingByClient.set(row.clientId, {
        amount: (current?.amount ?? 0) + remaining,
        currency: row.currency || current?.currency || "EGP",
      });
    }

    const overlapRows = await db
      .select({ clientId: agencyOpsInvoice.clientId })
      .from(agencyOpsInvoice)
      .where(
        and(
          eq(agencyOpsInvoice.teamId, input.teamId),
          inArray(agencyOpsInvoice.clientId, clientIds),
          lte(agencyOpsInvoice.periodStart, monthEnd),
          gte(agencyOpsInvoice.periodEnd, monthStart),
        ),
      );

    for (const row of overlapRows) {
      invoicedThisMonth.add(row.clientId);
    }
  }

  return {
    canViewBilling,
    items: listed.items.map((client) => {
      const contact = contactByClient.get(client.id);
      const monthDuration = monthByClient.get(client.id) ?? 0;
      const monthUninvoicedDurationSeconds =
        !canViewBilling || invoicedThisMonth.has(client.id) ? 0 : monthDuration;
      const outstanding = outstandingByClient.get(client.id);
      return {
        clientId: client.id,
        weekDurationSeconds: weekByClient.get(client.id) ?? 0,
        monthUninvoicedDurationSeconds,
        outstandingAmount: canViewBilling ? (outstanding?.amount ?? 0) : 0,
        billingCurrency: outstanding?.currency ?? client.currency,
        contactName: contact?.name ?? "",
        contactEmail: contact?.email ?? "",
        contactPhone: contact?.phone ?? "",
      };
    }),
  };
}

export async function getAgencyClient(
  actorUserId: string,
  input: { teamId: string; clientId: string },
) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const [row] = await db
    .select(clientSelect)
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.teamId, input.teamId), eq(agencyOpsClient.id, input.clientId)))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Client was not found." });
  }

  return mapClientRow(row);
}

export type AgencyClientCommercialSummary = {
  client: AgencyClientRecord;
  contact: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  activeProjectCount: number;
  trashedProjectCount: number;
  weekDurationSeconds: number;
  monthDurationSeconds: number;
  monthUninvoicedDurationSeconds: number;
  billing: {
    canView: boolean;
    openInvoiceCount: number;
    outstandingAmount: number;
    currency: string;
    recentInvoices: Array<{
      id: string;
      number: string;
      status: string;
      amount: number;
      remainingAmount: number;
      currency: string;
      periodStart: string;
      periodEnd: string;
    }>;
  };
};

function utcWeekStart(now = new Date()): Date {
  const day = now.getUTCDay();
  const diff = (day + 6) % 7; // Monday start (matches common agency default)
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
}

function utcMonthBounds(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

export async function getAgencyClientCommercialSummary(
  actorUserId: string,
  input: { teamId: string; clientId: string },
): Promise<AgencyClientCommercialSummary> {
  const role = await requireAgencyRole(actorUserId, input.teamId, "viewer");
  const client = await getAgencyClient(actorUserId, input);

  const [contactRow] = await db
    .select({
      id: agencyOpsClientContact.id,
      name: agencyOpsClientContact.name,
      email: agencyOpsClientContact.email,
      phone: agencyOpsClientContact.phone,
    })
    .from(agencyOpsClientContact)
    .where(
      and(
        eq(agencyOpsClientContact.teamId, input.teamId),
        eq(agencyOpsClientContact.clientId, input.clientId),
      ),
    )
    .limit(1);

  const projectRows = await db
    .select({
      id: agencyOpsProject.id,
      deletedAt: agencyOpsProject.deletedAt,
    })
    .from(agencyOpsProject)
    .where(
      and(eq(agencyOpsProject.teamId, input.teamId), eq(agencyOpsProject.clientId, input.clientId)),
    );

  const activeProjectCount = projectRows.filter((p) => !p.deletedAt).length;
  const trashedProjectCount = projectRows.filter((p) => p.deletedAt).length;
  const projectIds = projectRows.map((p) => p.id);

  const weekStart = utcWeekStart();
  const { start: monthStart, end: monthEnd } = utcMonthBounds();

  let weekDurationSeconds = 0;
  let monthDurationSeconds = 0;

  if (projectIds.length > 0) {
    const [weekAgg] = await db
      .select({
        total: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`.mapWith(Number),
      })
      .from(agencyOpsTimeEntry)
      .where(
        and(
          eq(agencyOpsTimeEntry.teamId, input.teamId),
          isNull(agencyOpsTimeEntry.deletedAt),
          inArray(agencyOpsTimeEntry.projectId, projectIds),
          gte(agencyOpsTimeEntry.startedAt, weekStart),
        ),
      );

    const [monthAgg] = await db
      .select({
        total: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`.mapWith(Number),
      })
      .from(agencyOpsTimeEntry)
      .where(
        and(
          eq(agencyOpsTimeEntry.teamId, input.teamId),
          isNull(agencyOpsTimeEntry.deletedAt),
          inArray(agencyOpsTimeEntry.projectId, projectIds),
          gte(agencyOpsTimeEntry.startedAt, monthStart),
          lte(agencyOpsTimeEntry.startedAt, monthEnd),
        ),
      );

    weekDurationSeconds = weekAgg?.total ?? 0;
    monthDurationSeconds = monthAgg?.total ?? 0;
  }

  let monthUninvoicedDurationSeconds = monthDurationSeconds;
  const canViewBilling = role === "owner";
  let openInvoiceCount = 0;
  let outstandingAmount = 0;
  let billingCurrency = client.currency;
  const recentInvoices: AgencyClientCommercialSummary["billing"]["recentInvoices"] = [];

  if (canViewBilling) {
    const invoiceRows = await db
      .select({
        id: agencyOpsInvoice.id,
        number: agencyOpsInvoice.number,
        status: agencyOpsInvoice.status,
        amount: agencyOpsInvoice.amount,
        receivedAmount: agencyOpsInvoice.receivedAmount,
        currency: agencyOpsInvoice.currency,
        periodStart: agencyOpsInvoice.periodStart,
        periodEnd: agencyOpsInvoice.periodEnd,
      })
      .from(agencyOpsInvoice)
      .where(
        and(
          eq(agencyOpsInvoice.teamId, input.teamId),
          eq(agencyOpsInvoice.clientId, input.clientId),
        ),
      )
      .orderBy(desc(agencyOpsInvoice.createdAt))
      .limit(8);

    const openStatuses = new Set(["draft", "sent", "partial"]);
    for (const inv of invoiceRows) {
      const remaining = Math.max(0, inv.amount - inv.receivedAmount);
      if (openStatuses.has(inv.status)) {
        openInvoiceCount += 1;
        outstandingAmount += remaining;
        billingCurrency = inv.currency || billingCurrency;
      }
      recentInvoices.push({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount: inv.amount,
        remainingAmount: remaining,
        currency: inv.currency,
        periodStart: inv.periodStart.toISOString(),
        periodEnd: inv.periodEnd.toISOString(),
      });
    }

    const [overlappingInvoice] = await db
      .select({ id: agencyOpsInvoice.id })
      .from(agencyOpsInvoice)
      .where(
        and(
          eq(agencyOpsInvoice.teamId, input.teamId),
          eq(agencyOpsInvoice.clientId, input.clientId),
          lte(agencyOpsInvoice.periodStart, monthEnd),
          gte(agencyOpsInvoice.periodEnd, monthStart),
        ),
      )
      .limit(1);

    if (overlappingInvoice) {
      monthUninvoicedDurationSeconds = 0;
    }
  }

  return {
    client,
    contact: contactRow
      ? {
          id: contactRow.id,
          name: contactRow.name,
          email: contactRow.email,
          phone: contactRow.phone,
        }
      : null,
    activeProjectCount,
    trashedProjectCount,
    weekDurationSeconds,
    monthDurationSeconds,
    monthUninvoicedDurationSeconds,
    billing: {
      canView: canViewBilling,
      openInvoiceCount,
      outstandingAmount,
      currency: billingCurrency,
      recentInvoices: canViewBilling ? recentInvoices : [],
    },
  };
}

export async function createAgencyClient(
  actorUserId: string,
  input: {
    teamId: string;
    name: string;
    category?: "internal" | "external";
    billableRateAmount?: number | null;
    currency?: string;
  },
) {
  await requireAgencyClientWriteRole(actorUserId, input.teamId, input);

  const now = new Date();
  let billableRateAmount = input.billableRateAmount ?? null;
  let currency = (input.currency ?? "USD").toUpperCase();
  let sourceBillableRateAmount: number | null = null;
  let fxRate = "1";
  let fxAsOf: Date | null = null;

  if (billableRateAmount != null) {
    const moneyCtx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
    currency = (input.currency ?? moneyCtx.agencyCurrency).toUpperCase();
    const money = moneyCtx.resolve(billableRateAmount, currency);
    await moneyCtx.lock();
    billableRateAmount = money.amount;
    sourceBillableRateAmount = money.sourceAmount;
    currency = money.sourceCurrency;
    fxRate = money.fxRate;
    fxAsOf = new Date(money.fxAsOf);
  }

  const [created] = await db.transaction(async (tx) => {
    await assertWithinLimit(input.teamId, "clients", { tx });
    return tx
      .insert(agencyOpsClient)
      .values({
        id: createWorkspaceId("agency-client"),
        teamId: input.teamId,
        name: input.name.trim(),
        category: input.category ?? "external",
        billableRateAmount,
        currency,
        sourceBillableRateAmount,
        fxRate,
        fxAsOf,
        createdByUserId: actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning(clientSelect);
  });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  return mapClientRow(created);
}

export async function updateAgencyClient(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    name?: string;
    category?: "internal" | "external";
    billableRateAmount?: number | null;
    currency?: string;
  },
) {
  await requireAgencyClientWriteRole(actorUserId, input.teamId, input);

  const [current] = await db
    .select({
      id: agencyOpsClient.id,
      currency: agencyOpsClient.currency,
      billableRateAmount: agencyOpsClient.billableRateAmount,
      sourceBillableRateAmount: agencyOpsClient.sourceBillableRateAmount,
    })
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.teamId, input.teamId), eq(agencyOpsClient.id, input.clientId)))
    .limit(1);

  if (!current) {
    throw new ORPCError("NOT_FOUND");
  }

  const hasPatch =
    input.name !== undefined ||
    input.category !== undefined ||
    input.billableRateAmount !== undefined ||
    input.currency !== undefined;

  if (!hasPatch) {
    throw new ORPCError("BAD_REQUEST", { message: "No fields to update." });
  }

  const now = new Date();
  const patch: {
    updatedAt: Date;
    name?: string;
    category?: "internal" | "external";
    billableRateAmount?: number | null;
    currency?: string;
    sourceBillableRateAmount?: number | null;
    fxRate?: string;
    fxAsOf?: Date | null;
  } = { updatedAt: now };

  if (input.name !== undefined) {
    patch.name = input.name.trim();
  }
  if (input.category !== undefined) {
    patch.category = input.category;
  }
  if (input.billableRateAmount !== undefined || input.currency !== undefined) {
    if (input.billableRateAmount === null) {
      patch.billableRateAmount = null;
      patch.sourceBillableRateAmount = null;
      patch.fxRate = "1";
      patch.fxAsOf = null;
      if (input.currency !== undefined) patch.currency = input.currency.toUpperCase();
    } else {
      const moneyCtx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
      const sourceCurrency = (
        input.currency ??
        current.currency ??
        moneyCtx.agencyCurrency
      ).toUpperCase();
      const sourceAmount =
        input.billableRateAmount ?? current.sourceBillableRateAmount ?? current.billableRateAmount;
      if (sourceAmount != null) {
        const money = moneyCtx.resolve(sourceAmount, sourceCurrency);
        await moneyCtx.lock();
        patch.billableRateAmount = money.amount;
        patch.sourceBillableRateAmount = money.sourceAmount;
        patch.currency = money.sourceCurrency;
        patch.fxRate = money.fxRate;
        patch.fxAsOf = new Date(money.fxAsOf);
      } else if (input.currency !== undefined) {
        patch.currency = input.currency.toUpperCase();
      }
    }
  }

  const [updated] = await db
    .update(agencyOpsClient)
    .set(patch)
    .where(and(eq(agencyOpsClient.teamId, input.teamId), eq(agencyOpsClient.id, input.clientId)))
    .returning(clientSelect);

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  return mapClientRow(updated);
}

export async function archiveAgencyClient(
  actorUserId: string,
  input: { teamId: string; clientId: string },
) {
  await requireAgencyRole(actorUserId, input.teamId, "editor");

  const [client] = await db
    .select({ id: agencyOpsClient.id, archivedAt: agencyOpsClient.archivedAt })
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)))
    .limit(1);

  if (!client) {
    throw new ORPCError("NOT_FOUND", { message: "Client was not found." });
  }

  if (client.archivedAt) {
    throw new ORPCError("BAD_REQUEST", { message: "Client is already archived." });
  }

  const now = new Date();
  await db
    .update(agencyOpsClient)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)));

  return { clientId: input.clientId, archived: true };
}

export async function unarchiveAgencyClient(
  actorUserId: string,
  input: { teamId: string; clientId: string },
) {
  await requireAgencyRole(actorUserId, input.teamId, "editor");

  const now = new Date();
  await db
    .update(agencyOpsClient)
    .set({ archivedAt: null, updatedAt: now })
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)));

  return { clientId: input.clientId, archived: false };
}

type AgencyClientContactRecord = {
  id: string;
  teamId: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

export async function getClientContact(
  actorUserId: string,
  input: { teamId: string; clientId: string },
): Promise<AgencyClientContactRecord | null> {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const [row] = await db
    .select()
    .from(agencyOpsClientContact)
    .where(
      and(
        eq(agencyOpsClientContact.teamId, input.teamId),
        eq(agencyOpsClientContact.clientId, input.clientId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    teamId: row.teamId,
    clientId: row.clientId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertClientContact(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    name?: string;
    email?: string;
    phone?: string;
  },
): Promise<AgencyClientContactRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "editor");

  await getClientByIdForTeam(input.teamId, input.clientId);

  const now = new Date();

  // Use a single upsert to avoid a TOCTOU race between the existence check
  // and the insert (two concurrent callers could both see no row and both try
  // to insert, hitting the unique constraint).
  const [upserted] = await db
    .insert(agencyOpsClientContact)
    .values({
      id: createWorkspaceId("agency-contact"),
      teamId: input.teamId,
      clientId: input.clientId,
      name: input.name ?? "",
      email: input.email ?? "",
      phone: input.phone ?? "",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsClientContact.clientId],
      set: {
        name: input.name !== undefined ? input.name : sql`${agencyOpsClientContact.name}`,
        email: input.email !== undefined ? input.email : sql`${agencyOpsClientContact.email}`,
        phone: input.phone !== undefined ? input.phone : sql`${agencyOpsClientContact.phone}`,
        updatedAt: now,
      },
    })
    .returning();

  if (!upserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return {
    id: upserted.id,
    teamId: upserted.teamId,
    clientId: upserted.clientId,
    name: upserted.name,
    email: upserted.email,
    phone: upserted.phone,
    createdAt: upserted.createdAt.toISOString(),
    updatedAt: upserted.updatedAt.toISOString(),
  };
}
