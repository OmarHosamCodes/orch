import { agencyClientHref } from "@/features/shared/agency-segments";
import { formatDuration } from "@/lib/utils/format-duration";

import type { MoneyBillsPartyFilter, MoneyBillsStatusFilter } from "./money-bills-filters";
import {
  allocationFromInvoice,
  allocationFromPayout,
  allocationFromReadyClient,
  allocationFromReadyMember,
  type MoneyBillAllocationView,
} from "./money-bill-allocation";
import { parseMoneyExpenseAmount } from "./money-expense-form";

type MoneyBillInvoiceStatus = "draft" | "sent" | "partial" | "paid" | "refunded";
type MoneyBillPayoutStatus = "draft" | "partial" | "paid";
export type MoneyBillStatus = "outstanding" | "partial" | "paid" | "refunded";

export type MoneyBillInvoiceSource = {
  id: string;
  clientId: string;
  clientName: string;
  number: string;
  status: MoneyBillInvoiceStatus;
  billStatus: MoneyBillStatus;
  amount: number;
  receivedAmount: number;
  remainingAmount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
};

export type MoneyBillClientActivitySource = {
  clientId: string;
  clientName: string;
  durationSeconds: number;
  billableAmount: number;
  wasteAmount: number;
  currency: string;
};

export type MoneyBillMemberActivitySource = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  durationSeconds: number;
  payableAmount: number;
  wasteAmount: number;
  currency: string;
};

export type MoneyBillPayoutSectionKey =
  | "salaries"
  | "team_loss"
  | "device_comp"
  | "paid_vacation"
  | "debt_discount"
  | "charity"
  | "pbc"
  | "extra";

export type MoneyBillTeamPayoutSource = {
  id: string;
  sectionKey: MoneyBillPayoutSectionKey;
  sectionTitle: string;
  userId: string | null;
  userName: string;
  userAvatar: string | null;
  label: string;
  status: MoneyBillPayoutStatus;
  billStatus: Exclude<MoneyBillStatus, "refunded">;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  durationSeconds: number;
  periodStart: string;
  periodEnd: string;
};

export type MoneyBillAdjustmentSource = MoneyBillTeamPayoutSource & {
  canDelete?: boolean;
};

export type MoneyBillRowBase = {
  id: string;
  title: string;
  subtitle: string;
  metaLabel: string;
  statusLabel: string;
  canSend: boolean;
  canMarkPaid: boolean;
  canRecordPayment: boolean;
  canRefund: boolean;
  canCreateInvoice: boolean;
  canCreatePayout: boolean;
};

export type MoneyBillInvoiceRow = MoneyBillRowBase & {
  kind: "invoice";
  party: "client";
  clientId: string;
  clientName: string;
  number: string;
  status: MoneyBillInvoiceStatus;
  billStatus: MoneyBillStatus;
  billStatusLabel: string;
  amount: number;
  receivedAmount: number;
  remainingAmount: number;
  currency: string;
  amountLabel: string;
  receivedLabel: string;
  remainingLabel: string;
  periodLabel: string;
  allocation: MoneyBillAllocationView;
};

type MoneyBillClientActivityRow = MoneyBillRowBase & {
  kind: "client-activity";
  party: "client";
  clientId: string;
  clientName: string;
  durationSeconds: number;
  durationLabel: string;
  billableAmount: number;
  wasteAmount: number;
  currency: string;
  amountLabel: string;
  allocation: MoneyBillAllocationView;
};

type MoneyBillMemberActivityRow = MoneyBillRowBase & {
  kind: "member-activity";
  party: "team";
  userId: string;
  userName: string;
  userAvatar: string | null;
  durationSeconds: number;
  durationLabel: string;
  payableAmount: number;
  wasteAmount: number;
  currency: string;
  amountLabel: string;
  allocation: MoneyBillAllocationView;
};

export type MoneyBillTeamPayoutRow = MoneyBillRowBase & {
  kind: "team-payout";
  party: "team";
  userId: string | null;
  userName: string;
  userAvatar: string | null;
  label: string;
  status: MoneyBillPayoutStatus;
  billStatus: Exclude<MoneyBillStatus, "refunded">;
  billStatusLabel: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  amountLabel: string;
  paidLabel: string;
  remainingLabel: string;
  durationSeconds: number;
  durationLabel: string;
  periodLabel: string;
  allocation: MoneyBillAllocationView;
};

export type MoneyBillAdjustmentRow = MoneyBillRowBase & {
  kind: "adjustment";
  party: "adjustments";
  sectionKey: MoneyBillPayoutSectionKey;
  sectionTitle: string;
  label: string;
  status: MoneyBillPayoutStatus;
  billStatus: Exclude<MoneyBillStatus, "refunded">;
  billStatusLabel: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  amountLabel: string;
  paidLabel: string;
  remainingLabel: string;
  periodLabel: string;
  canDismiss: boolean;
};

export type MoneyBillRow =
  | MoneyBillInvoiceRow
  | MoneyBillClientActivityRow
  | MoneyBillMemberActivityRow
  | MoneyBillTeamPayoutRow
  | MoneyBillAdjustmentRow;

const ADJUSTMENT_SECTION_KEYS = new Set<MoneyBillPayoutSectionKey>([
  "debt_discount",
  "charity",
  "pbc",
  "extra",
]);

export function moneyBillsPartyShowsAdjustments(party: MoneyBillsPartyFilter): boolean {
  return party === "all" || party === "adjustments";
}

export function moneyBillsPartyShowsExpenses(party: MoneyBillsPartyFilter): boolean {
  return party === "expenses";
}

export function moneyBillStatusLabel(billStatus: MoneyBillStatus): string {
  switch (billStatus) {
    case "outstanding":
      return "Outstanding";
    case "partial":
      return "Partial";
    case "paid":
      return "Paid";
    case "refunded":
      return "Refunded";
    default: {
      const _exhaustive: never = billStatus;
      return _exhaustive;
    }
  }
}

export function formatMoneyAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function formatMoneyBillPeriod(periodStart: string, periodEnd: string): string {
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  const sameMonth =
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth();
  const startLabel = startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const endLabel = endDate.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${startLabel} – ${endLabel}`;
}

/** Whether client invoice/activity rows belong under the current party lens. */
export function moneyBillsPartyShowsClients(party: MoneyBillsPartyFilter): boolean {
  return party === "all" || party === "client";
}

export function moneyBillsPartyShowsMembers(party: MoneyBillsPartyFilter): boolean {
  return party === "all" || party === "team";
}

export function moneyBillRowFromInvoice(
  invoice: MoneyBillInvoiceSource,
  wasteAmount = 0,
): MoneyBillInvoiceRow {
  const billStatusLabel = moneyBillStatusLabel(invoice.billStatus);
  const periodLabel = formatMoneyBillPeriod(invoice.periodStart, invoice.periodEnd);
  const amountLabel = formatMoneyAmount(invoice.amount, invoice.currency);
  return {
    kind: "invoice",
    id: invoice.id,
    party: "client",
    title: invoice.clientName,
    subtitle: `${invoice.number} · ${periodLabel}`,
    metaLabel: amountLabel,
    statusLabel: billStatusLabel,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    number: invoice.number,
    status: invoice.status,
    billStatus: invoice.billStatus,
    billStatusLabel,
    amount: invoice.amount,
    receivedAmount: invoice.receivedAmount,
    remainingAmount: invoice.remainingAmount,
    currency: invoice.currency,
    amountLabel,
    receivedLabel: formatMoneyAmount(invoice.receivedAmount, invoice.currency),
    remainingLabel: formatMoneyAmount(invoice.remainingAmount, invoice.currency),
    periodLabel,
    allocation: allocationFromInvoice({
      amount: invoice.amount,
      receivedAmount: invoice.receivedAmount,
      remainingAmount: invoice.remainingAmount,
      wasteAmount,
      currency: invoice.currency,
    }),
    canSend: invoice.status === "draft",
    canMarkPaid: invoice.status === "sent" || invoice.status === "partial",
    canRecordPayment: invoice.status === "sent" || invoice.status === "partial",
    canRefund:
      invoice.status === "sent" || invoice.status === "partial" || invoice.status === "paid",
    canCreateInvoice: false,
    canCreatePayout: false,
  };
}

function moneyBillRowFromClientActivity(
  client: MoneyBillClientActivitySource,
): MoneyBillClientActivityRow {
  const durationLabel = formatDuration(client.durationSeconds, "short");
  const amountLabel = formatMoneyAmount(client.billableAmount, client.currency);
  return {
    kind: "client-activity",
    id: `client-activity:${client.clientId}`,
    party: "client",
    title: client.clientName,
    subtitle: durationLabel,
    metaLabel: amountLabel,
    statusLabel: "Ready",
    clientId: client.clientId,
    clientName: client.clientName,
    durationSeconds: client.durationSeconds,
    durationLabel,
    billableAmount: client.billableAmount,
    wasteAmount: client.wasteAmount,
    currency: client.currency,
    amountLabel,
    allocation: allocationFromReadyClient({
      billableAmount: client.billableAmount,
      wasteAmount: client.wasteAmount,
      currency: client.currency,
    }),
    canSend: false,
    canMarkPaid: false,
    canRecordPayment: false,
    canRefund: false,
    canCreateInvoice: true,
    canCreatePayout: false,
  };
}

function moneyBillRowFromMemberActivity(
  member: MoneyBillMemberActivitySource,
): MoneyBillMemberActivityRow {
  const durationLabel = formatDuration(member.durationSeconds, "short");
  const amountLabel = formatMoneyAmount(member.payableAmount, member.currency);
  return {
    kind: "member-activity",
    id: `member-activity:${member.userId}`,
    party: "team",
    title: member.userName,
    subtitle: durationLabel,
    metaLabel: amountLabel,
    statusLabel: "Ready",
    userId: member.userId,
    userName: member.userName,
    userAvatar: member.userAvatar,
    durationSeconds: member.durationSeconds,
    durationLabel,
    payableAmount: member.payableAmount,
    wasteAmount: member.wasteAmount,
    currency: member.currency,
    amountLabel,
    allocation: allocationFromReadyMember({
      payableAmount: member.payableAmount,
      wasteAmount: member.wasteAmount,
      currency: member.currency,
    }),
    canSend: false,
    canMarkPaid: false,
    canRecordPayment: false,
    canRefund: false,
    canCreateInvoice: false,
    canCreatePayout: true,
  };
}

export function moneyBillRowFromPayoutLine(
  payout: MoneyBillTeamPayoutSource,
  wasteAmount = 0,
): MoneyBillTeamPayoutRow {
  const billStatusLabel = moneyBillStatusLabel(payout.billStatus);
  const periodLabel = formatMoneyBillPeriod(payout.periodStart, payout.periodEnd);
  const amountLabel = formatMoneyAmount(payout.amount, payout.currency);
  const durationLabel = formatDuration(payout.durationSeconds, "short");
  return {
    kind: "team-payout",
    id: payout.id,
    party: "team",
    title: payout.userName,
    subtitle: `${payout.label} · ${periodLabel}`,
    metaLabel: amountLabel,
    statusLabel: billStatusLabel,
    userId: payout.userId,
    userName: payout.userName,
    userAvatar: payout.userAvatar,
    label: payout.label,
    status: payout.status,
    billStatus: payout.billStatus,
    billStatusLabel,
    amount: payout.amount,
    paidAmount: payout.paidAmount,
    remainingAmount: payout.remainingAmount,
    currency: payout.currency,
    amountLabel,
    paidLabel: formatMoneyAmount(payout.paidAmount, payout.currency),
    remainingLabel: formatMoneyAmount(payout.remainingAmount, payout.currency),
    durationSeconds: payout.durationSeconds,
    durationLabel,
    periodLabel,
    allocation: allocationFromPayout({
      amount: payout.amount,
      paidAmount: payout.paidAmount,
      remainingAmount: payout.remainingAmount,
      wasteAmount,
      currency: payout.currency,
    }),
    canSend: false,
    canMarkPaid: payout.status === "draft" || payout.status === "partial",
    canRecordPayment: payout.status === "draft" || payout.status === "partial",
    canRefund: false,
    canCreateInvoice: false,
    canCreatePayout: false,
  };
}

export function moneyBillRowFromAdjustmentLine(
  payout: MoneyBillAdjustmentSource,
): MoneyBillAdjustmentRow {
  const billStatusLabel = moneyBillStatusLabel(payout.billStatus);
  const periodLabel = formatMoneyBillPeriod(payout.periodStart, payout.periodEnd);
  const amountLabel = formatMoneyAmount(payout.amount, payout.currency);
  return {
    kind: "adjustment",
    id: payout.id,
    party: "adjustments",
    title: payout.label || payout.userName,
    subtitle: `${payout.sectionTitle} · ${periodLabel}`,
    metaLabel: amountLabel,
    statusLabel: billStatusLabel,
    sectionKey: payout.sectionKey,
    sectionTitle: payout.sectionTitle,
    label: payout.label,
    status: payout.status,
    billStatus: payout.billStatus,
    billStatusLabel,
    amount: payout.amount,
    paidAmount: payout.paidAmount,
    remainingAmount: payout.remainingAmount,
    currency: payout.currency,
    amountLabel,
    paidLabel: formatMoneyAmount(payout.paidAmount, payout.currency),
    remainingLabel: formatMoneyAmount(payout.remainingAmount, payout.currency),
    periodLabel,
    canSend: false,
    canMarkPaid: payout.status === "draft" || payout.status === "partial",
    canRecordPayment: payout.status === "draft" || payout.status === "partial",
    canRefund: false,
    canCreateInvoice: false,
    canCreatePayout: false,
    canDismiss: payout.canDelete === true,
  };
}

export function moneyBillClientHref(clientId: string): string {
  return agencyClientHref(clientId);
}

export function moneyBillMemberHref(userId: string): string {
  return `/agency/members/${encodeURIComponent(userId)}`;
}

/** Agency deep-link for the bill party name (Clients segment or member profile). */
export function moneyBillPartyHref(row: MoneyBillRow): string | null {
  switch (row.kind) {
    case "client-activity":
    case "invoice":
      return moneyBillClientHref(row.clientId);
    case "member-activity":
      return moneyBillMemberHref(row.userId);
    case "team-payout":
      return row.userId ? moneyBillMemberHref(row.userId) : null;
    case "adjustment":
      return null;
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

type MoneyBillRowSectionId = "ready" | "invoices" | "ready-payout" | "team" | "adjustments";

export type MoneyBillRowSection = {
  id: MoneyBillRowSectionId;
  title: string;
  hint: string;
  rows: MoneyBillRow[];
};

const SECTION_ORDER: MoneyBillRowSectionId[] = [
  "ready",
  "invoices",
  "ready-payout",
  "team",
  "adjustments",
];

export function groupMoneyBillRows(rows: MoneyBillRow[]): MoneyBillRowSection[] {
  const buckets: Record<MoneyBillRowSectionId, MoneyBillRow[]> = {
    ready: [],
    invoices: [],
    "ready-payout": [],
    team: [],
    adjustments: [],
  };
  for (const row of rows) {
    switch (row.kind) {
      case "client-activity":
        buckets.ready.push(row);
        break;
      case "invoice":
        buckets.invoices.push(row);
        break;
      case "member-activity":
        buckets["ready-payout"].push(row);
        break;
      case "team-payout":
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

  const sections: MoneyBillRowSection[] = [];
  for (const id of SECTION_ORDER) {
    const sectionRows = buckets[id];
    if (sectionRows.length === 0) continue;
    switch (id) {
      case "ready":
        sections.push({
          id,
          title: "Ready to invoice",
          hint: `${sectionRows.length} client${sectionRows.length === 1 ? "" : "s"} with unbilled time`,
          rows: sectionRows,
        });
        break;
      case "invoices":
        sections.push({
          id,
          title: "Invoices",
          hint: `${sectionRows.length} in this period`,
          rows: sectionRows,
        });
        break;
      case "ready-payout":
        sections.push({
          id,
          title: "Ready to pay",
          hint: `${sectionRows.length} member${sectionRows.length === 1 ? "" : "s"} with tracked time`,
          rows: sectionRows,
        });
        break;
      case "team":
        sections.push({
          id,
          title: "Payouts",
          hint: `${sectionRows.length} in this period`,
          rows: sectionRows,
        });
        break;
      case "adjustments":
        sections.push({
          id,
          title: "Adjustments",
          hint: `${sectionRows.length} in this period`,
          rows: sectionRows,
        });
        break;
      default: {
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  }
  return sections;
}

export function moneyBillListInsight(rows: MoneyBillRow[]): string | null {
  const readyClients = rows.filter((row) => row.kind === "client-activity");
  const readyPayouts = rows.filter((row) => row.kind === "member-activity");
  const parts: string[] = [];
  if (readyClients.length > 0) {
    const totalSeconds = readyClients.reduce((sum, row) => sum + row.durationSeconds, 0);
    parts.push(
      `${readyClients.length} client${readyClients.length === 1 ? "" : "s"} ready · ${formatDuration(totalSeconds, "short")} unbilled`,
    );
  }
  if (readyPayouts.length > 0) {
    parts.push(`${readyPayouts.length} member${readyPayouts.length === 1 ? "" : "s"} ready to pay`);
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function moneyBillInitials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/**
 * Bills list: invoices + uninvoiced clients + payout lines + members without a line.
 * Status filter applies to invoices/payouts; ready rows only when Outstanding or unset.
 */
export function buildMoneyBillRows(input: {
  party: MoneyBillsPartyFilter;
  statusFilter: MoneyBillsStatusFilter | null;
  invoices: MoneyBillInvoiceSource[];
  clients: MoneyBillClientActivitySource[];
  members: MoneyBillMemberActivitySource[];
  payouts: MoneyBillTeamPayoutSource[];
  adjustments?: MoneyBillAdjustmentSource[];
  /** Period waste cents keyed by client id (for invoice row chips). */
  wasteByClientId?: ReadonlyMap<string, number>;
  /** Period waste cents keyed by member user id (for payout row chips). */
  wasteByUserId?: ReadonlyMap<string, number>;
}): MoneyBillRow[] {
  const rows: MoneyBillRow[] = [];
  const showClients = moneyBillsPartyShowsClients(input.party);
  const showMembers = moneyBillsPartyShowsMembers(input.party);
  const showAdjustments = moneyBillsPartyShowsAdjustments(input.party);

  if (showClients) {
    for (const invoice of input.invoices) {
      rows.push(
        moneyBillRowFromInvoice(invoice, input.wasteByClientId?.get(invoice.clientId) ?? 0),
      );
    }

    const invoicedClientIds = new Set(input.invoices.map((invoice) => invoice.clientId));
    const showUninvoiced = input.statusFilter === null || input.statusFilter === "outstanding";
    if (showUninvoiced) {
      for (const client of input.clients) {
        if (invoicedClientIds.has(client.clientId)) continue;
        rows.push(moneyBillRowFromClientActivity(client));
      }
    }
  }

  if (showMembers) {
    const teamPayouts = input.payouts.filter(
      (payout) => !ADJUSTMENT_SECTION_KEYS.has(payout.sectionKey),
    );
    for (const payout of teamPayouts) {
      rows.push(
        moneyBillRowFromPayoutLine(
          payout,
          payout.userId ? (input.wasteByUserId?.get(payout.userId) ?? 0) : 0,
        ),
      );
    }

    const paidMemberIds = new Set(
      teamPayouts.map((payout) => payout.userId).filter((id): id is string => Boolean(id)),
    );
    const showReady = input.statusFilter === null || input.statusFilter === "outstanding";
    if (showReady) {
      for (const member of input.members) {
        if (paidMemberIds.has(member.userId)) continue;
        rows.push(moneyBillRowFromMemberActivity(member));
      }
    }
  }

  if (showAdjustments) {
    const adjustmentLines =
      input.adjustments ??
      input.payouts.filter((payout) => ADJUSTMENT_SECTION_KEYS.has(payout.sectionKey));
    for (const payout of adjustmentLines) {
      rows.push(moneyBillRowFromAdjustmentLine(payout));
    }
  }

  return rows;
}

/** All + Clients tabs default to external-only until the badge is dismissed. */
export function filterMoneyBillRowsByClientCategory(
  rows: MoneyBillRow[],
  category: "external" | null,
  clientCategoryById: ReadonlyMap<string, "internal" | "external">,
): MoneyBillRow[] {
  if (!category) return rows;
  return rows.filter((row) => {
    if (row.kind !== "invoice" && row.kind !== "client-activity") return true;
    return (clientCategoryById.get(row.clientId) ?? "external") === category;
  });
}

export const MONEY_ADJUSTMENT_SECTION_OPTIONS: ReadonlyArray<{
  id:
    | Extract<MoneyBillPayoutSectionKey, "debt_discount" | "charity" | "pbc" | "extra">
    | "salary_pool";
  label: string;
}> = [
  { id: "salary_pool", label: "Team salaries total" },
  { id: "extra", label: "Extra" },
  { id: "debt_discount", label: "Debt / Discount" },
  { id: "charity", label: "Charity" },
  { id: "pbc", label: "PBC" },
];

export function moneyBillsIsAdjustmentSection(key: string): boolean {
  return ADJUSTMENT_SECTION_KEYS.has(key as MoneyBillPayoutSectionKey);
}

export function moneyBillsAdjustmentCreateValid(
  sectionKey: string,
  label: string,
  amount: string,
): boolean {
  if (!sectionKey) return false;
  if (sectionKey !== "salary_pool" && !label.trim()) return false;
  return parseMoneyExpenseAmount(amount) !== null;
}

export function moneyBillsCanRefundObligation(
  obligationKind: "ready" | "invoice" | "payout",
  receivedAmount = 0,
): boolean {
  return obligationKind !== "ready" && receivedAmount > 0;
}

export function moneyBillsDefaultAdjustTab(line: {
  obligationKind: "ready" | "invoice" | "payout";
  openCents: number;
  receivedAmount: number;
}): "pay" | "refund" | "adjustments" {
  if (line.openCents > 0) return "pay";
  if (moneyBillsCanRefundObligation(line.obligationKind, line.receivedAmount)) {
    return "refund";
  }
  return "adjustments";
}

export function moneyBillsPickAdjustLine<T extends { openCents: number }>(
  lines: readonly T[],
): T | null {
  return lines.find((line) => line.openCents > 0) ?? lines[0] ?? null;
}

export function moneyBillsAdjustCtaLabel(
  party: "client" | "team",
  line: {
    obligationKind: "ready" | "invoice" | "payout";
    openCents: number;
    receivedAmount: number;
  },
): "Collect" | "Pay" | "Uncollect" | "Refund" | "Adjust" {
  const defaultTab = moneyBillsDefaultAdjustTab(line);
  switch (defaultTab) {
    case "pay":
      return party === "client" ? "Collect" : "Pay";
    case "refund":
      return party === "client" ? "Uncollect" : "Refund";
    case "adjustments":
      return "Adjust";
    default: {
      const _exhaustive: never = defaultTab;
      return _exhaustive;
    }
  }
}

export function moneyBillsCreateFormValid(
  clientId: string,
  periodStart: string,
  periodEnd: string,
): boolean {
  return (
    Boolean(clientId) && Boolean(periodStart) && Boolean(periodEnd) && periodEnd >= periodStart
  );
}

/** Major-unit payment string → minor-unit amount; null when invalid. */
export function parseMoneyBillPaymentAmount(value: string, remainingAmount: number): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const major = Number(trimmed);
  if (!Number.isFinite(major) || major <= 0) return null;
  const amount = Math.round(major * 100);
  if (amount > remainingAmount) return null;
  return amount;
}

export function moneyBillsPaymentCanSubmit(value: string, remainingAmount: number): boolean {
  return parseMoneyBillPaymentAmount(value, remainingAmount) !== null;
}

export type { MoneyBillsStatusFilter };
