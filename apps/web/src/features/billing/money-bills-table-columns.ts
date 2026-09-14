import type { MoneyBillPersonGroup } from "./money-bill-obligation-rows";
import { formatMoneyBillPeriod } from "./money-bills-rows";

function periodKey(line: { periodStart: string; periodEnd: string }): string {
  return `${line.periodStart}\0${line.periodEnd}`;
}

function periodLabelFromLines(
  lines: ReadonlyArray<{ periodStart: string; periodEnd: string }>,
): string {
  if (lines.length === 0) return "";

  const keys = new Set(lines.map(periodKey));
  if (keys.size === 1) {
    const line = lines[0];
    if (!line) return "";
    return formatMoneyBillPeriod(line.periodStart, line.periodEnd);
  }

  return "Mixed";
}

export function moneyBillGroupCarryCount(group: Pick<MoneyBillPersonGroup, "lines">): number {
  return group.lines.filter((line) => line.isCarry).length;
}

export function moneyBillGroupPeriodLabel(group: Pick<MoneyBillPersonGroup, "lines">): string {
  const nonCarryLines = group.lines.filter((line) => !line.isCarry);
  const sourceLines = nonCarryLines.length > 0 ? nonCarryLines : group.lines;
  return periodLabelFromLines(sourceLines);
}

export function moneyBillTableShowsWaste(rows: ReadonlyArray<{ wasteAmount: number }>): boolean {
  return rows.some((row) => row.wasteAmount > 0);
}

export function moneyBillTableShowsCarry(
  groups: ReadonlyArray<{ lines: ReadonlyArray<{ isCarry: boolean }> }>,
): boolean {
  return groups.some((group) => group.lines.some((line) => line.isCarry));
}

export function moneyBillGroupStatusLabel(
  group: Pick<MoneyBillPersonGroup, "lines"> | { lines: ReadonlyArray<{ statusLabel: string }> },
): string {
  const firstStatus = group.lines[0]?.statusLabel ?? "Ready";
  return group.lines.every((line) => line.statusLabel === firstStatus) ? firstStatus : "Mixed";
}

export function moneyBillStatusBadgeVariant(
  label: string,
): "success" | "warning" | "default" | "outline" {
  switch (label) {
    case "Paid":
      return "success";
    case "Outstanding":
      return "warning";
    case "Ready":
      return "default";
    default:
      return "outline";
  }
}

export function moneyBillGroupSettleLabel(
  party: "client" | "team",
  remainingAmount: number,
): "Collect" | "Pay" | null {
  if (remainingAmount <= 0) return null;
  return party === "client" ? "Collect" : "Pay";
}

export function moneyBillSalaryPoolSettleLabel(
  remainingAmount: number,
  canPay: boolean,
): "Pay" | null {
  if (!canPay || remainingAmount <= 0) return null;
  return "Pay";
}

export function moneyBillAdjustmentSettleLabel(row: {
  remainingAmount: number;
  canRecordPayment: boolean;
  canMarkPaid: boolean;
}): "Record payment" | "Mark paid" | null {
  if (row.remainingAmount <= 0) return null;
  if (row.canRecordPayment) return "Record payment";
  if (row.canMarkPaid) return "Mark paid";
  return null;
}

export type MoneyBillsSheetCaptionInput = {
  kind: "group" | "adjustment" | "salary-pool" | "expense";
  remainingAmount: number;
  carryCount?: number;
  party?: "client" | "team";
  sectionTitle?: string;
  expenseKind?: "subscription" | "one_time";
  expenseStatus?: "paid" | "due" | "partial";
};

export function moneyBillsSheetCaption(input: MoneyBillsSheetCaptionInput): string {
  switch (input.kind) {
    case "group": {
      if (input.remainingAmount <= 0) return "Settled for this period";
      if ((input.carryCount ?? 0) > 0) return "Open balance, including prior periods";
      return "Open balance for this period";
    }
    case "adjustment":
      return input.remainingAmount > 0
        ? `${input.sectionTitle ?? "Adjustment"} still open`
        : `${input.sectionTitle ?? "Adjustment"} settled`;
    case "salary-pool":
      return input.remainingAmount > 0
        ? "Shared salary pool still open"
        : "Shared salary pool settled";
    case "expense": {
      if (input.expenseStatus === "paid" || input.remainingAmount <= 0) {
        return "Recorded in this period";
      }
      return input.expenseKind === "subscription"
        ? "Subscription due this period"
        : "One-time expense still open";
    }
    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
}
