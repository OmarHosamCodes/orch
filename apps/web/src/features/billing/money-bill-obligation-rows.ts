/** Display rows for compose-on-demand: person groups with separate obligation lines. */

import {
  pendingAdjustmentKindLabel,
  signedClientAdjustmentAmount,
} from "@orch/api/routers/agency-ops/billing/money-bill-carry";
import { formatDuration } from "@/lib/utils/format-duration";

import type { MoneyBillsStatusFilter } from "./money-bills-filters";
import {
  formatMoneyAmount,
  formatMoneyBillPeriod,
  type MoneyBillAdjustmentRow,
} from "./money-bills-rows";

export type MoneyObligationClientSource = {
  kind: "invoice" | "ready";
  id: string;
  clientId: string;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  isCarry: boolean;
  amount: number;
  sourceAmount: number;
  rateCurrency: string;
  receivedAmount: number;
  remainingAmount: number;
  wasteAmount: number;
  durationSeconds: number;
  number: string | null;
  currency?: string;
};

export type MoneyObligationMemberSource = {
  kind: "payout" | "ready";
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  periodStart: string;
  periodEnd: string;
  isCarry: boolean;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  wasteAmount: number;
  durationSeconds: number;
  currency?: string;
};

export type MoneyPendingAdjustmentSource = {
  id: string;
  partyType: "client" | "member";
  partyId: string;
  kind: "discount" | "surcharge" | "debt";
  amount: number;
  note: string;
  periodStart: string | null;
  periodEnd: string | null;
  obligationId: string | null;
  appliedInvoiceId: string | null;
};

export type MoneyBillObligationLine = {
  id: string;
  party: "client" | "team";
  obligationKind: "ready" | "invoice" | "payout";
  isCarry: boolean;
  title: string;
  subtitle: string;
  statusLabel: string;
  totalCents: number;
  sourceAmount: number;
  rateCurrency: string;
  receivedAmount: number;
  remainingAmount: number;
  wasteAmount: number;
  durationSeconds: number;
  openCents: number;
  currency: string;
  totalLabel: string;
  sourceTotalLabel: string;
  receivedLabel: string;
  remainingLabel: string;
  wasteLabel: string;
  openLabel: string;
  periodStart: string;
  periodEnd: string;
  documentId: string | null;
  clientId?: string;
  userId?: string;
  userAvatar?: string | null;
};

export type MoneyBillPendingAdjustmentItem = {
  id: string;
  kind: "discount" | "surcharge" | "debt";
  amount: number;
  signedAmount: number;
  note: string;
  obligationId: string | null;
  applied: boolean;
  kindLabel: string;
  amountLabel: string;
};

export type MoneyBillPersonGroup = {
  kind: "person-group";
  id: string;
  party: "client" | "team";
  title: string;
  clientId?: string;
  userId?: string;
  userAvatar?: string | null;
  lines: MoneyBillObligationLine[];
  totalCents: number;
  sourceAmount: number;
  rateCurrency: string;
  durationSeconds: number;
  receivedAmount: number;
  remainingAmount: number;
  wasteAmount: number;
  openCents: number;
  currency: string;
  totalLabel: string;
  sourceTotalLabel: string;
  hoursLabel: string;
  receivedLabel: string;
  remainingLabel: string;
  wasteLabel: string;
  openLabel: string;
  pendingAdjustmentCents: number;
  pendingAdjustments: MoneyBillPendingAdjustmentItem[];
};

export type MoneyBillComposeDisplayRow = MoneyBillPersonGroup | MoneyBillAdjustmentRow;

export function moneyBillGroupPartyType(group: MoneyBillPersonGroup): "client" | "member" {
  return group.party === "client" ? "client" : "member";
}

export function moneyBillGroupPartyId(group: MoneyBillPersonGroup): string | null {
  return group.clientId ?? group.userId ?? null;
}

function obligationStatusLabel(line: {
  obligationKind: "ready" | "invoice" | "payout";
  remainingAmount: number;
  receivedAmount: number;
  totalCents: number;
}): string {
  if (line.obligationKind === "ready") return "Ready";
  if (line.remainingAmount <= 0 && line.receivedAmount > 0) return "Paid";
  if (line.receivedAmount > 0 && line.remainingAmount > 0) return "Part paid";
  if (line.remainingAmount > 0) return "Outstanding";
  return "Paid";
}

function matchesObligationStatus(
  statusFilter: MoneyBillsStatusFilter | null,
  line: MoneyBillObligationLine,
): boolean {
  if (!statusFilter) return true;
  switch (statusFilter) {
    case "outstanding":
      return line.obligationKind === "ready" || line.statusLabel === "Outstanding";
    case "partial":
      return line.statusLabel === "Part paid";
    case "paid":
      return line.statusLabel === "Paid";
    case "refunded":
      return false;
    default: {
      const _exhaustive: never = statusFilter;
      return _exhaustive;
    }
  }
}

function moneyBillLineFromClientObligation(
  source: MoneyObligationClientSource,
): MoneyBillObligationLine {
  const currency = source.currency ?? "USD";
  const totalCents = source.amount;
  const receivedAmount = source.receivedAmount;
  const remainingAmount = source.remainingAmount;
  const wasteAmount = source.wasteAmount;
  const openCents = remainingAmount;
  const obligationKind = source.kind;
  const statusLabel = obligationStatusLabel({
    obligationKind,
    remainingAmount,
    receivedAmount,
    totalCents,
  });
  const subtitleParts = [
    source.isCarry ? "Prior period" : null,
    formatMoneyBillPeriod(source.periodStart, source.periodEnd),
    source.number,
    source.durationSeconds > 0 ? formatDuration(source.durationSeconds, "short") : null,
  ].filter(Boolean);

  return {
    id: source.id,
    party: "client",
    obligationKind,
    isCarry: source.isCarry,
    title: source.clientName,
    subtitle: subtitleParts.join(" · "),
    statusLabel,
    totalCents,
    sourceAmount: source.sourceAmount,
    rateCurrency: source.rateCurrency,
    receivedAmount,
    remainingAmount,
    wasteAmount,
    durationSeconds: source.durationSeconds,
    openCents,
    currency,
    totalLabel: formatMoneyAmount(totalCents, currency),
    sourceTotalLabel: formatMoneyAmount(source.sourceAmount, source.rateCurrency),
    receivedLabel: formatMoneyAmount(receivedAmount, currency),
    remainingLabel: formatMoneyAmount(remainingAmount, currency),
    wasteLabel: formatMoneyAmount(wasteAmount, currency),
    openLabel: formatMoneyAmount(openCents, currency),
    periodStart: source.periodStart,
    periodEnd: source.periodEnd,
    documentId: source.kind === "invoice" ? source.id : null,
    clientId: source.clientId,
  };
}

function moneyBillLineFromMemberObligation(
  source: MoneyObligationMemberSource,
): MoneyBillObligationLine {
  const currency = source.currency ?? "USD";
  const totalCents = source.amount;
  const receivedAmount = source.paidAmount;
  const remainingAmount = source.remainingAmount;
  const wasteAmount = source.wasteAmount;
  const openCents = remainingAmount;
  const obligationKind = source.kind;
  const statusLabel = obligationStatusLabel({
    obligationKind,
    remainingAmount,
    receivedAmount,
    totalCents,
  });
  const subtitleParts = [
    source.isCarry ? "Prior period" : null,
    formatMoneyBillPeriod(source.periodStart, source.periodEnd),
    source.durationSeconds > 0 ? formatDuration(source.durationSeconds, "short") : null,
  ].filter(Boolean);

  return {
    id: source.id,
    party: "team",
    obligationKind,
    isCarry: source.isCarry,
    title: source.userName,
    subtitle: subtitleParts.join(" · "),
    statusLabel,
    totalCents,
    sourceAmount: totalCents,
    rateCurrency: currency,
    receivedAmount,
    remainingAmount,
    wasteAmount,
    durationSeconds: source.durationSeconds,
    openCents,
    currency,
    totalLabel: formatMoneyAmount(totalCents, currency),
    sourceTotalLabel: formatMoneyAmount(totalCents, currency),
    receivedLabel: formatMoneyAmount(receivedAmount, currency),
    remainingLabel: formatMoneyAmount(remainingAmount, currency),
    wasteLabel: formatMoneyAmount(wasteAmount, currency),
    openLabel: formatMoneyAmount(openCents, currency),
    periodStart: source.periodStart,
    periodEnd: source.periodEnd,
    documentId: source.kind === "payout" ? source.id : null,
    userId: source.userId,
    userAvatar: source.userAvatar,
  };
}

function sumPendingForParty(
  pending: MoneyPendingAdjustmentSource[],
  partyType: "client" | "member",
  partyId: string,
): number {
  let delta = 0;
  for (const item of pending) {
    if (item.partyType !== partyType || item.partyId !== partyId) continue;
    if (item.appliedInvoiceId) continue;
    delta += signedClientAdjustmentAmount(item.kind, item.amount);
  }
  return delta;
}

function pendingItemsForParty(
  pending: MoneyPendingAdjustmentSource[],
  partyType: "client" | "member",
  partyId: string,
  currency: string,
): MoneyBillPendingAdjustmentItem[] {
  return pending
    .filter((item) => item.partyType === partyType && item.partyId === partyId)
    .map((item) => {
      const signedAmount = signedClientAdjustmentAmount(item.kind, item.amount);
      return {
        id: item.id,
        kind: item.kind,
        amount: item.amount,
        signedAmount,
        note: item.note,
        obligationId: item.obligationId,
        applied: Boolean(item.appliedInvoiceId),
        kindLabel: pendingAdjustmentKindLabel(item.kind),
        amountLabel: formatMoneyAmount(signedAmount, currency),
      };
    });
}

export function buildMoneyBillPersonGroups(input: {
  clients: MoneyObligationClientSource[];
  members: MoneyObligationMemberSource[];
  adjustments: MoneyBillAdjustmentRow[];
  pendingAdjustments: MoneyPendingAdjustmentSource[];
  statusFilter: MoneyBillsStatusFilter | null;
  includeClients: boolean;
  includeMembers: boolean;
  includeAdjustments: boolean;
}): MoneyBillComposeDisplayRow[] {
  const rows: MoneyBillComposeDisplayRow[] = [];

  if (input.includeClients) {
    const byClient = new Map<string, MoneyBillObligationLine[]>();
    for (const source of input.clients) {
      const line = moneyBillLineFromClientObligation(source);
      if (!matchesObligationStatus(input.statusFilter, line)) continue;
      const list = byClient.get(source.clientId) ?? [];
      list.push(line);
      byClient.set(source.clientId, list);
    }
    for (const [clientId, lines] of byClient) {
      if (lines.length === 0) continue;
      const currency = lines[0]?.currency ?? "USD";
      const rateCurrency = lines[0]?.rateCurrency ?? currency;
      const totalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
      const sourceAmount = lines.reduce((sum, line) => sum + line.sourceAmount, 0);
      const durationSeconds = lines.reduce((sum, line) => sum + line.durationSeconds, 0);
      const receivedAmount = lines.reduce((sum, line) => sum + line.receivedAmount, 0);
      const remainingAmount = lines.reduce((sum, line) => sum + line.remainingAmount, 0);
      const wasteAmount = lines.reduce((sum, line) => sum + line.wasteAmount, 0);
      const openCents = lines.reduce((sum, line) => sum + line.openCents, 0);
      const pendingAdjustmentCents = sumPendingForParty(
        input.pendingAdjustments,
        "client",
        clientId,
      );
      const pendingAdjustments = pendingItemsForParty(
        input.pendingAdjustments,
        "client",
        clientId,
        currency,
      );
      rows.push({
        kind: "person-group",
        id: `person-group:client:${clientId}`,
        party: "client",
        title: lines[0]?.title ?? clientId,
        clientId,
        lines,
        totalCents,
        sourceAmount,
        rateCurrency,
        durationSeconds,
        receivedAmount,
        remainingAmount,
        wasteAmount,
        openCents,
        currency,
        totalLabel: formatMoneyAmount(totalCents, currency),
        sourceTotalLabel: formatMoneyAmount(sourceAmount, rateCurrency),
        hoursLabel: formatDuration(durationSeconds, "units"),
        receivedLabel: formatMoneyAmount(receivedAmount, currency),
        remainingLabel: formatMoneyAmount(remainingAmount, currency),
        wasteLabel: formatMoneyAmount(wasteAmount, currency),
        openLabel: formatMoneyAmount(openCents, currency),
        pendingAdjustmentCents,
        pendingAdjustments,
      });
    }
  }

  if (input.includeMembers) {
    const byMember = new Map<string, MoneyBillObligationLine[]>();
    for (const source of input.members) {
      const line = moneyBillLineFromMemberObligation(source);
      if (!matchesObligationStatus(input.statusFilter, line)) continue;
      const list = byMember.get(source.userId) ?? [];
      list.push(line);
      byMember.set(source.userId, list);
    }
    for (const [userId, lines] of byMember) {
      if (lines.length === 0) continue;
      const currency = lines[0]?.currency ?? "USD";
      const totalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
      const sourceAmount = totalCents;
      const durationSeconds = lines.reduce((sum, line) => sum + line.durationSeconds, 0);
      const receivedAmount = lines.reduce((sum, line) => sum + line.receivedAmount, 0);
      const remainingAmount = lines.reduce((sum, line) => sum + line.remainingAmount, 0);
      const wasteAmount = lines.reduce((sum, line) => sum + line.wasteAmount, 0);
      const openCents = lines.reduce((sum, line) => sum + line.openCents, 0);
      const pendingAdjustmentCents = sumPendingForParty(input.pendingAdjustments, "member", userId);
      const pendingAdjustments = pendingItemsForParty(
        input.pendingAdjustments,
        "member",
        userId,
        currency,
      );
      rows.push({
        kind: "person-group",
        id: `person-group:member:${userId}`,
        party: "team",
        title: lines[0]?.title ?? userId,
        userId,
        userAvatar: lines[0]?.userAvatar ?? null,
        lines,
        totalCents,
        sourceAmount,
        rateCurrency: currency,
        durationSeconds,
        receivedAmount,
        remainingAmount,
        wasteAmount,
        openCents,
        currency,
        totalLabel: formatMoneyAmount(totalCents, currency),
        sourceTotalLabel: formatMoneyAmount(sourceAmount, currency),
        hoursLabel: formatDuration(durationSeconds, "units"),
        receivedLabel: formatMoneyAmount(receivedAmount, currency),
        remainingLabel: formatMoneyAmount(remainingAmount, currency),
        wasteLabel: formatMoneyAmount(wasteAmount, currency),
        openLabel: formatMoneyAmount(openCents, currency),
        pendingAdjustmentCents,
        pendingAdjustments,
      });
    }
  }

  if (input.includeAdjustments) {
    rows.push(...input.adjustments);
  }

  return rows;
}

export function moneyBillComposeHueId(row: MoneyBillComposeDisplayRow): string | null {
  switch (row.kind) {
    case "person-group":
      return row.clientId ?? row.userId ?? row.id;
    case "adjustment":
      return row.id;
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

type MoneyBillComposeSectionId = "clients" | "team" | "adjustments";

export type MoneyBillComposeSection = {
  id: MoneyBillComposeSectionId;
  title: string;
  hint: string;
  rows: MoneyBillComposeDisplayRow[];
};

export function groupMoneyBillComposeDisplayRows(
  rows: MoneyBillComposeDisplayRow[],
): MoneyBillComposeSection[] {
  const buckets: Record<MoneyBillComposeSectionId, MoneyBillComposeDisplayRow[]> = {
    clients: [],
    team: [],
    adjustments: [],
  };
  for (const row of rows) {
    switch (row.kind) {
      case "person-group":
        if (row.party === "client") buckets.clients.push(row);
        else buckets.team.push(row);
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

  const sections: MoneyBillComposeSection[] = [];
  if (buckets.clients.length > 0) {
    sections.push({
      id: "clients",
      title: "Clients",
      hint: "Open balances and ready work",
      rows: buckets.clients,
    });
  }
  if (buckets.team.length > 0) {
    sections.push({
      id: "team",
      title: "Team",
      hint: "Open payouts and ready pay",
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

export function moneyBillComposeListInsight(rows: MoneyBillComposeDisplayRow[]): string | null {
  const groups = rows.filter((row): row is MoneyBillPersonGroup => row.kind === "person-group");
  const lines = groups.flatMap((group) => group.lines);
  const readyCount = lines.filter((line) => line.obligationKind === "ready").length;
  const priorOpenCount = lines.filter(
    (line) => line.isCarry && line.openCents > 0 && line.obligationKind !== "ready",
  ).length;
  const openGroups = groups.filter((group) => group.openCents > 0).length;
  const parts: string[] = [];
  if (openGroups > 0) {
    parts.push(`${openGroups} account${openGroups === 1 ? "" : "s"} still open`);
  }
  if (priorOpenCount > 0) {
    parts.push(
      `${priorOpenCount} prior-period balance${priorOpenCount === 1 ? "" : "s"} to settle`,
    );
  }
  if (readyCount > 0) {
    parts.push(`${readyCount} ready to export`);
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function filterComposeRowsByClientCategory(
  rows: MoneyBillComposeDisplayRow[],
  category: "external" | null,
  clientCategoryById: ReadonlyMap<string, "internal" | "external">,
): MoneyBillComposeDisplayRow[] {
  if (!category) return rows;
  return rows.filter((row) => {
    if (row.kind !== "person-group" || row.party !== "client" || !row.clientId) return true;
    return (clientCategoryById.get(row.clientId) ?? "external") === category;
  });
}
