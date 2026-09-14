/** Approach 03 — merge ready work + documents into one account-level bill row. */

import { formatDuration } from "@/lib/utils/format-duration";

import type { MoneyBillsStatusFilter } from "./money-bills-filters";
import {
  formatMoneyAmount,
  formatMoneyBillPeriod,
  moneyBillStatusLabel,
  type MoneyBillAdjustmentRow,
  type MoneyBillClientActivitySource,
  type MoneyBillInvoiceSource,
  type MoneyBillMemberActivitySource,
  type MoneyBillRowBase,
  type MoneyBillStatus,
  type MoneyBillTeamPayoutSource,
} from "./money-bills-rows";

export type MoneyBillMergedClientRow = MoneyBillRowBase & {
  kind: "merged-client";
  party: "client";
  clientId: string;
  clientName: string;
  totalCents: number;
  receivedAmount: number;
  remainingAmount: number;
  uninvoicedCents: number;
  wasteAmount: number;
  openCents: number;
  currency: string;
  totalLabel: string;
  receivedLabel: string;
  remainingLabel: string;
  wasteLabel: string;
  openLabel: string;
  primaryInvoiceId: string | null;
  durationSeconds: number;
};

export type MoneyBillMergedMemberRow = MoneyBillRowBase & {
  kind: "merged-member";
  party: "team";
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalCents: number;
  receivedAmount: number;
  remainingAmount: number;
  uninvoicedCents: number;
  wasteAmount: number;
  openCents: number;
  currency: string;
  totalLabel: string;
  receivedLabel: string;
  remainingLabel: string;
  wasteLabel: string;
  openLabel: string;
  /** Paid column uses received* naming for shared UI (team party). */
  paidTitle: "Paid";
  primaryPayoutId: string | null;
  durationSeconds: number;
};

export type MoneyBillDisplayRow =
  | MoneyBillMergedClientRow
  | MoneyBillMergedMemberRow
  | MoneyBillAdjustmentRow;

function pickPrimaryInvoice(invoices: MoneyBillInvoiceSource[]): MoneyBillInvoiceSource | null {
  const open = invoices.find(
    (invoice) =>
      invoice.billStatus === "outstanding" ||
      invoice.billStatus === "partial" ||
      invoice.status === "draft" ||
      invoice.status === "sent",
  );
  return open ?? invoices[0] ?? null;
}

function pickPrimaryPayout(payouts: MoneyBillTeamPayoutSource[]): MoneyBillTeamPayoutSource | null {
  const open = payouts.find(
    (payout) => payout.billStatus === "outstanding" || payout.billStatus === "partial",
  );
  return open ?? payouts[0] ?? null;
}

function mergedClientStatusLabel(input: {
  uninvoicedCents: number;
  invoices: MoneyBillInvoiceSource[];
}): string {
  const hasReady = input.uninvoicedCents > 0;
  const hasInvoice = input.invoices.length > 0;
  if (hasReady && hasInvoice) return "Mixed";
  if (hasReady) return "Ready";
  const primary = pickPrimaryInvoice(input.invoices);
  if (!primary) return "Ready";
  if (primary.billStatus === "partial") return "Part paid";
  return moneyBillStatusLabel(primary.billStatus);
}

function mergedMemberStatusLabel(input: {
  uninvoicedCents: number;
  payouts: MoneyBillTeamPayoutSource[];
}): string {
  const hasReady = input.uninvoicedCents > 0;
  const hasPayout = input.payouts.length > 0;
  if (hasReady && hasPayout) return "Mixed";
  if (hasReady) return "Ready";
  const primary = pickPrimaryPayout(input.payouts);
  if (!primary) return "Ready";
  if (primary.billStatus === "partial") return "Part paid";
  return moneyBillStatusLabel(primary.billStatus);
}

function matchesStatusFilter(
  statusFilter: MoneyBillsStatusFilter | null,
  input: {
    uninvoicedCents: number;
    openCents: number;
    billStatuses: MoneyBillStatus[];
  },
): boolean {
  if (!statusFilter) return true;
  switch (statusFilter) {
    case "outstanding":
      return input.uninvoicedCents > 0 || input.billStatuses.includes("outstanding");
    case "partial":
      return input.billStatuses.includes("partial");
    case "paid":
      return input.openCents === 0 && input.billStatuses.includes("paid");
    case "refunded":
      return input.billStatuses.includes("refunded");
    default: {
      const _exhaustive: never = statusFilter;
      return _exhaustive;
    }
  }
}

export function moneyBillRowFromMergedClient(input: {
  clientId: string;
  clientName: string;
  activity: MoneyBillClientActivitySource | null;
  invoices: MoneyBillInvoiceSource[];
}): MoneyBillMergedClientRow {
  const currency = input.activity?.currency ?? input.invoices[0]?.currency ?? "USD";
  const uninvoicedCents = Math.max(0, input.activity?.billableAmount ?? 0);
  const wasteAmount = Math.max(0, input.activity?.wasteAmount ?? 0);
  const receivedAmount = input.invoices.reduce((sum, invoice) => sum + invoice.receivedAmount, 0);
  const remainingAmount = input.invoices.reduce((sum, invoice) => sum + invoice.remainingAmount, 0);
  const totalCents = uninvoicedCents + receivedAmount + remainingAmount;
  const openCents = uninvoicedCents + remainingAmount;
  const primary = pickPrimaryInvoice(input.invoices);
  const durationSeconds = input.activity?.durationSeconds ?? 0;
  const statusLabel = mergedClientStatusLabel({
    uninvoicedCents,
    invoices: input.invoices,
  });

  const subtitleParts: string[] = [];
  // Ready-only rows already carry a Ready chip; keep the amount for Mixed only.
  if (uninvoicedCents > 0 && input.invoices.length > 0) {
    subtitleParts.push(`Ready ${formatMoneyAmount(uninvoicedCents, currency)}`);
  } else if (durationSeconds > 0) {
    subtitleParts.push(formatDuration(durationSeconds, "short"));
  }
  if (primary) {
    subtitleParts.push(
      `${primary.number} · ${formatMoneyBillPeriod(primary.periodStart, primary.periodEnd)}`,
    );
  }

  return {
    kind: "merged-client",
    id: `merged-client:${input.clientId}`,
    party: "client",
    title: input.clientName,
    subtitle: subtitleParts.join(" · ") || "No activity",
    metaLabel: `${formatMoneyAmount(openCents, currency)} open`,
    statusLabel,
    clientId: input.clientId,
    clientName: input.clientName,
    totalCents,
    receivedAmount,
    remainingAmount,
    uninvoicedCents,
    wasteAmount,
    openCents,
    currency,
    totalLabel: formatMoneyAmount(totalCents, currency),
    receivedLabel: formatMoneyAmount(receivedAmount, currency),
    remainingLabel: formatMoneyAmount(remainingAmount, currency),
    wasteLabel: formatMoneyAmount(wasteAmount, currency),
    openLabel: formatMoneyAmount(openCents, currency),
    primaryInvoiceId: primary?.id ?? null,
    durationSeconds,
    canSend: primary?.status === "draft",
    canMarkPaid: primary?.status === "sent" || primary?.status === "partial",
    canRecordPayment: primary?.status === "sent" || primary?.status === "partial",
    canRefund:
      primary?.status === "sent" || primary?.status === "partial" || primary?.status === "paid",
    canCreateInvoice: uninvoicedCents > 0,
    canCreatePayout: false,
  };
}

export function moneyBillRowFromMergedMember(input: {
  userId: string;
  userName: string;
  userAvatar: string | null;
  activity: MoneyBillMemberActivitySource | null;
  payouts: MoneyBillTeamPayoutSource[];
}): MoneyBillMergedMemberRow {
  const currency = input.activity?.currency ?? input.payouts[0]?.currency ?? "USD";
  const uninvoicedCents = Math.max(0, input.activity?.payableAmount ?? 0);
  const wasteAmount = Math.max(0, input.activity?.wasteAmount ?? 0);
  const receivedAmount = input.payouts.reduce((sum, payout) => sum + payout.paidAmount, 0);
  const remainingAmount = input.payouts.reduce((sum, payout) => sum + payout.remainingAmount, 0);
  const totalCents = uninvoicedCents + receivedAmount + remainingAmount;
  const openCents = uninvoicedCents + remainingAmount;
  const primary = pickPrimaryPayout(input.payouts);
  const durationSeconds = input.activity?.durationSeconds ?? 0;
  const statusLabel = mergedMemberStatusLabel({
    uninvoicedCents,
    payouts: input.payouts,
  });

  const subtitleParts: string[] = [];
  // Ready-only rows already carry a Ready chip; keep the amount for Mixed only.
  if (uninvoicedCents > 0 && input.payouts.length > 0) {
    subtitleParts.push(`Ready ${formatMoneyAmount(uninvoicedCents, currency)}`);
  } else if (durationSeconds > 0) {
    subtitleParts.push(formatDuration(durationSeconds, "short"));
  }
  if (primary) {
    subtitleParts.push(
      `${primary.label} · ${formatMoneyBillPeriod(primary.periodStart, primary.periodEnd)}`,
    );
  }

  return {
    kind: "merged-member",
    id: `merged-member:${input.userId}`,
    party: "team",
    title: input.userName,
    subtitle: subtitleParts.join(" · ") || "No activity",
    metaLabel: `${formatMoneyAmount(openCents, currency)} open`,
    statusLabel,
    userId: input.userId,
    userName: input.userName,
    userAvatar: input.userAvatar,
    totalCents,
    receivedAmount,
    remainingAmount,
    uninvoicedCents,
    wasteAmount,
    openCents,
    currency,
    totalLabel: formatMoneyAmount(totalCents, currency),
    receivedLabel: formatMoneyAmount(receivedAmount, currency),
    remainingLabel: formatMoneyAmount(remainingAmount, currency),
    wasteLabel: formatMoneyAmount(wasteAmount, currency),
    openLabel: formatMoneyAmount(openCents, currency),
    paidTitle: "Paid",
    primaryPayoutId: primary?.id ?? null,
    durationSeconds,
    canSend: false,
    canMarkPaid: primary?.status === "draft" || primary?.status === "partial",
    canRecordPayment: primary?.status === "draft" || primary?.status === "partial",
    canRefund: false,
    canCreateInvoice: false,
    canCreatePayout: uninvoicedCents > 0,
  };
}

/** Build Approach-03 account rows (clients/members merged; adjustments stay line-level). */
export function buildMergedMoneyBillDisplayRows(input: {
  clients: MoneyBillClientActivitySource[];
  invoices: MoneyBillInvoiceSource[];
  members: MoneyBillMemberActivitySource[];
  payouts: MoneyBillTeamPayoutSource[];
  adjustments: MoneyBillAdjustmentRow[];
  statusFilter: MoneyBillsStatusFilter | null;
  includeClients: boolean;
  includeMembers: boolean;
}): MoneyBillDisplayRow[] {
  const rows: MoneyBillDisplayRow[] = [];

  if (input.includeClients) {
    const activityByClient = new Map(input.clients.map((client) => [client.clientId, client]));
    const invoicesByClient = new Map<string, MoneyBillInvoiceSource[]>();
    for (const invoice of input.invoices) {
      const list = invoicesByClient.get(invoice.clientId) ?? [];
      list.push(invoice);
      invoicesByClient.set(invoice.clientId, list);
    }
    const clientIds = new Set([...activityByClient.keys(), ...invoicesByClient.keys()]);
    for (const clientId of clientIds) {
      const activity = activityByClient.get(clientId) ?? null;
      const invoices = invoicesByClient.get(clientId) ?? [];
      const clientName = activity?.clientName ?? invoices[0]?.clientName ?? "Client";
      const row = moneyBillRowFromMergedClient({
        clientId,
        clientName,
        activity,
        invoices,
      });
      if (
        !matchesStatusFilter(input.statusFilter, {
          uninvoicedCents: row.uninvoicedCents,
          openCents: row.openCents,
          billStatuses: invoices.map((invoice) => invoice.billStatus),
        })
      ) {
        continue;
      }
      rows.push(row);
    }
  }

  if (input.includeMembers) {
    const activityByMember = new Map(input.members.map((member) => [member.userId, member]));
    const payoutsByMember = new Map<string, MoneyBillTeamPayoutSource[]>();
    for (const payout of input.payouts) {
      if (!payout.userId) continue;
      const list = payoutsByMember.get(payout.userId) ?? [];
      list.push(payout);
      payoutsByMember.set(payout.userId, list);
    }
    const userIds = new Set([...activityByMember.keys(), ...payoutsByMember.keys()]);
    for (const userId of userIds) {
      const activity = activityByMember.get(userId) ?? null;
      const payouts = payoutsByMember.get(userId) ?? [];
      const row = moneyBillRowFromMergedMember({
        userId,
        userName: activity?.userName ?? payouts[0]?.userName ?? "Member",
        userAvatar: activity?.userAvatar ?? payouts[0]?.userAvatar ?? null,
        activity,
        payouts,
      });
      if (
        !matchesStatusFilter(input.statusFilter, {
          uninvoicedCents: row.uninvoicedCents,
          openCents: row.openCents,
          billStatuses: payouts.map((payout) => payout.billStatus),
        })
      ) {
        continue;
      }
      rows.push(row);
    }
  }

  rows.push(...input.adjustments);
  return rows;
}

type MoneyBillDisplaySectionId = "clients" | "team" | "adjustments";

export type MoneyBillDisplaySection = {
  id: MoneyBillDisplaySectionId;
  title: string;
  hint: string;
  rows: MoneyBillDisplayRow[];
};

export function groupMoneyBillDisplayRows(rows: MoneyBillDisplayRow[]): MoneyBillDisplaySection[] {
  const buckets: Record<MoneyBillDisplaySectionId, MoneyBillDisplayRow[]> = {
    clients: [],
    team: [],
    adjustments: [],
  };
  for (const row of rows) {
    switch (row.kind) {
      case "merged-client":
        buckets.clients.push(row);
        break;
      case "merged-member":
        buckets.team.push(row);
        break;
      case "adjustment":
        buckets.adjustments.push(row);
        break;
      default: {
        const _exhaustive: never = row;
        void _exhaustive;
      }
    }
  }

  const sections: MoneyBillDisplaySection[] = [];
  if (buckets.clients.length > 0) {
    sections.push({
      id: "clients",
      title: "Bills by client",
      hint: "Ready work + invoices consolidated",
      rows: buckets.clients,
    });
  }
  if (buckets.team.length > 0) {
    sections.push({
      id: "team",
      title: "Bills by member",
      hint: "Ready work + payouts consolidated",
      rows: buckets.team,
    });
  }
  if (buckets.adjustments.length > 0) {
    sections.push({
      id: "adjustments",
      title: "Adjustments",
      hint: `${buckets.adjustments.length} in this period`,
      rows: buckets.adjustments,
    });
  }
  return sections;
}

export function filterMergedRowsByClientCategory(
  rows: MoneyBillDisplayRow[],
  category: "external" | null,
  clientCategoryById: ReadonlyMap<string, "internal" | "external">,
): MoneyBillDisplayRow[] {
  if (!category) return rows;
  return rows.filter((row) => {
    if (row.kind !== "merged-client") return true;
    return (clientCategoryById.get(row.clientId) ?? "external") === category;
  });
}
