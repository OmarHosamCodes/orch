/** Two-level operate ledger rows for every Money list of money. */

import {
  type MoneyBillObligationLine,
  type MoneyBillPersonGroup,
  moneyBillComposeHueId,
} from "@/features/billing/money-bill-obligation-rows";
import {
  moneyBillAdjustmentSettleLabel,
  moneyBillGroupSettleLabel,
  moneyBillSalaryPoolSettleLabel,
  moneyLedgerParentStatusLabel,
  moneyLedgerReceivedHeading,
  moneyLedgerSettleButtonLabel,
  moneyLedgerStatusTone,
  type MoneyLedgerStatusTone,
} from "@/features/billing/money-bills-table-columns";
import {
  formatMoneyBillPeriod,
  type MoneyBillAdjustmentRow,
} from "@/features/billing/money-bills-rows";
import { formatDuration } from "@/lib/utils/format-duration";
import {
  moneyExpenseSettleLabel,
  type ExpenseStripItem,
} from "@/features/money/money-expenses-strip";

export type MoneyLedgerPartyKind = "client" | "team" | "adjustment" | "salary-pool" | "expense";

export type MoneyLedgerOverflowId = "preview" | "adjust" | "send";

export type MoneyLedgerMark =
  | { kind: "client"; hueId: string }
  | { kind: "member"; userId: string; avatarUrl: string | null }
  | { kind: "expense"; expenseKind: "one_time" | "subscription" }
  | { kind: "adjustment" }
  | { kind: "salary-pool" };

export type MoneyLedgerChildRow = {
  id: string;
  periodLabel: string;
  isCarry: boolean;
  wasteLabel: string | null;
  statusLabel: string;
  statusTone: MoneyLedgerStatusTone;
  hoursLabel: string;
  totalLabel: string;
  receivedLabel: string;
  remainingLabel: string;
  remainingAmount: number;
  settleLabel: string | null;
  overflow: readonly MoneyLedgerOverflowId[];
};

export type MoneyLedgerParentRow = {
  id: string;
  partyKind: MoneyLedgerPartyKind;
  title: string;
  mark: MoneyLedgerMark;
  statusLabel: string;
  statusTone: MoneyLedgerStatusTone;
  hoursLabel: string;
  totalLabel: string;
  receivedLabel: string;
  remainingLabel: string;
  remainingAmount: number;
  settleLabel: string | null;
  expandable: boolean;
  overflow: readonly MoneyLedgerOverflowId[];
  children: readonly MoneyLedgerChildRow[];
};

export type MoneyLedgerSalaryPoolInput = {
  pool: {
    totalLabel: string;
    paidLabel: string;
    remainingLabel: string;
    remainingAmount: number;
    statusLabel: string;
  } | null;
  canPay: boolean;
};

function hoursLabelFromSeconds(durationSeconds: number): string {
  if (durationSeconds <= 0) return "";
  return formatDuration(durationSeconds, "units");
}

function sortObligationLines(lines: readonly MoneyBillObligationLine[]): MoneyBillObligationLine[] {
  return [...lines].sort((left, right) => {
    if (left.isCarry !== right.isCarry) return left.isCarry ? 1 : -1;
    return left.periodStart.localeCompare(right.periodStart);
  });
}

function childFromObligationLine(
  line: MoneyBillObligationLine,
  settleLabel: string | null,
): MoneyLedgerChildRow {
  const canSend = line.obligationKind === "invoice" && line.statusLabel === "Outstanding";
  const overflow: MoneyLedgerOverflowId[] = ["preview", "adjust"];
  if (canSend) overflow.push("send");
  return {
    id: line.id,
    periodLabel: formatMoneyBillPeriod(line.periodStart, line.periodEnd),
    isCarry: line.isCarry,
    wasteLabel: line.wasteAmount > 0 ? line.wasteLabel : null,
    statusLabel: line.statusLabel,
    statusTone: moneyLedgerStatusTone(line.statusLabel),
    hoursLabel: hoursLabelFromSeconds(line.durationSeconds),
    totalLabel: line.totalLabel,
    receivedLabel: line.receivedLabel,
    remainingLabel: line.remainingLabel,
    remainingAmount: line.remainingAmount,
    settleLabel: line.remainingAmount > 0 ? settleLabel : null,
    overflow,
  };
}

function parentFromPersonGroup(group: MoneyBillPersonGroup): MoneyLedgerParentRow {
  const settleLabel = moneyLedgerSettleButtonLabel(
    moneyBillGroupSettleLabel(group.party, group.remainingAmount),
  );
  const statusLabel = moneyLedgerParentStatusLabel(group);
  const children = sortObligationLines(group.lines).map((line) =>
    childFromObligationLine(line, settleLabel),
  );
  const canSend = children.some((child) => child.overflow.includes("send"));
  const overflow: MoneyLedgerOverflowId[] = ["preview", "adjust"];
  if (canSend) overflow.push("send");
  const mark: MoneyLedgerMark =
    group.party === "team"
      ? {
          kind: "member",
          userId: group.userId ?? group.id,
          avatarUrl: group.userAvatar ?? null,
        }
      : { kind: "client", hueId: moneyBillComposeHueId(group) ?? group.id };

  return {
    id: group.id,
    partyKind: group.party,
    title: group.title,
    mark,
    statusLabel,
    statusTone: moneyLedgerStatusTone(statusLabel),
    hoursLabel: group.hoursLabel,
    totalLabel: group.totalLabel,
    receivedLabel: group.receivedLabel,
    remainingLabel: group.remainingLabel,
    remainingAmount: group.remainingAmount,
    settleLabel,
    expandable: children.length > 1,
    overflow,
    children,
  };
}

function parentFromAdjustment(row: MoneyBillAdjustmentRow): MoneyLedgerParentRow {
  const settleLabel = moneyLedgerSettleButtonLabel(moneyBillAdjustmentSettleLabel(row));
  return {
    id: row.id,
    partyKind: "adjustment",
    title: row.title,
    mark: { kind: "adjustment" },
    statusLabel: row.statusLabel,
    statusTone: moneyLedgerStatusTone(row.statusLabel),
    hoursLabel: "",
    totalLabel: row.amountLabel,
    receivedLabel: row.paidLabel,
    remainingLabel: row.remainingLabel,
    remainingAmount: row.remainingAmount,
    settleLabel,
    expandable: false,
    overflow: [],
    children: [],
  };
}

function parentFromSalaryPool(salaryPool: MoneyLedgerSalaryPoolInput): MoneyLedgerParentRow | null {
  const pool = salaryPool.pool;
  if (!pool) return null;
  return {
    id: "salary-pool",
    partyKind: "salary-pool",
    title: "Team salaries",
    mark: { kind: "salary-pool" },
    statusLabel: pool.statusLabel,
    statusTone: moneyLedgerStatusTone(pool.statusLabel),
    hoursLabel: "",
    totalLabel: pool.totalLabel,
    receivedLabel: pool.paidLabel,
    remainingLabel: pool.remainingLabel,
    remainingAmount: pool.remainingAmount,
    settleLabel: moneyLedgerSettleButtonLabel(
      moneyBillSalaryPoolSettleLabel(pool.remainingAmount, salaryPool.canPay),
    ),
    expandable: false,
    overflow: [],
    children: [],
  };
}

function expenseStatusTone(item: ExpenseStripItem): MoneyLedgerStatusTone {
  switch (item.status) {
    case "paid":
      return "success";
    case "due":
      return "warning";
    case "partial":
      return "default";
    default: {
      const _exhaustive: never = item.status;
      return _exhaustive;
    }
  }
}

function parentFromExpenseItem(item: ExpenseStripItem): MoneyLedgerParentRow {
  return {
    id: item.id,
    partyKind: "expense",
    title: item.name,
    mark: { kind: "expense", expenseKind: item.kind },
    statusLabel: item.statusLabel,
    statusTone: expenseStatusTone(item),
    hoursLabel: "",
    totalLabel: item.amountLabel,
    receivedLabel: item.status === "paid" ? item.amountLabel : "",
    remainingLabel: item.remainingLabel,
    remainingAmount: item.remainingAmount,
    settleLabel: moneyLedgerSettleButtonLabel(moneyExpenseSettleLabel(item)),
    expandable: false,
    overflow: [],
    children: [],
  };
}

export function buildMoneyLedgerParents(input: {
  clientGroups: readonly MoneyBillPersonGroup[];
  teamGroups: readonly MoneyBillPersonGroup[];
  adjustments: readonly MoneyBillAdjustmentRow[];
  salaryPool: MoneyLedgerSalaryPoolInput;
}): MoneyLedgerParentRow[] {
  const rows: MoneyLedgerParentRow[] = [];
  for (const group of input.clientGroups) {
    rows.push(parentFromPersonGroup(group));
  }
  for (const group of input.teamGroups) {
    rows.push(parentFromPersonGroup(group));
  }
  const salaryPoolRow = parentFromSalaryPool(input.salaryPool);
  if (salaryPoolRow) rows.push(salaryPoolRow);
  for (const row of input.adjustments) {
    rows.push(parentFromAdjustment(row));
  }
  return rows;
}

export function buildMoneyLedgerExpenseParents(
  items: readonly ExpenseStripItem[],
): MoneyLedgerParentRow[] {
  return items.map(parentFromExpenseItem);
}

export function moneyLedgerTableReceivedHeading(input: {
  clientGroups: readonly unknown[];
  teamGroups: readonly unknown[];
  adjustments: readonly unknown[];
  salaryPool: MoneyLedgerSalaryPoolInput;
}): "Received" | "Paid" | "In" {
  return moneyLedgerReceivedHeading({
    hasClients: input.clientGroups.length > 0,
    hasTeam: input.teamGroups.length > 0 || Boolean(input.salaryPool.pool),
    hasAdjustments: input.adjustments.length > 0,
  });
}

export type { MoneyLedgerStatusTone };
