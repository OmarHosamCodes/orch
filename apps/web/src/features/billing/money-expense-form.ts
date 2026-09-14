/** Expense draft helpers for Money Expenses create / payment dialogs. */

export type MoneyExpenseKind = "one_time" | "subscription";

export type MoneyExpensePeriod = "weekly" | "monthly" | "quarterly" | "yearly";

export type MoneyExpenseStatus = "due" | "partial" | "paid";

export type MoneyExpenseAmountMode = "fixed" | "variable";

export type MoneyExpenseRecord = {
  id: string;
  name: string;
  kind: MoneyExpenseKind;
  period: MoneyExpensePeriod | null;
  note: string;
  amountMode?: MoneyExpenseAmountMode;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  sourceAmount?: number | null;
  fxRate: string;
  status: MoneyExpenseStatus;
  startsAt: string | null;
  nextDueAt: string | null;
  occurredAt: string | null;
  createdAt: string;
};

export const MONEY_EXPENSE_KIND_OPTIONS: ReadonlyArray<{
  id: MoneyExpenseKind;
  label: string;
}> = [
  { id: "one_time", label: "One-time" },
  { id: "subscription", label: "Subscription" },
];

export const MONEY_EXPENSE_PERIOD_OPTIONS: ReadonlyArray<{
  id: MoneyExpensePeriod;
  label: string;
}> = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" },
];

export const MONEY_EXPENSE_AMOUNT_MODE_OPTIONS: ReadonlyArray<{
  id: MoneyExpenseAmountMode;
  label: string;
}> = [
  { id: "fixed", label: "Fixed" },
  { id: "variable", label: "Variable" },
];

export function moneyExpensePeriodLabel(period: MoneyExpensePeriod | null): string | null {
  if (!period) return null;
  return MONEY_EXPENSE_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? null;
}

/** Parse major-unit amount string → positive cents, or null if invalid. */
export function parseMoneyExpenseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const major = Number(normalized);
  if (!Number.isFinite(major) || major <= 0) return null;
  return Math.round(major * 100);
}

export function moneyExpenseAmountError(value: string): string | null {
  if (!value.trim()) return "Enter an amount.";
  return parseMoneyExpenseAmount(value) === null
    ? "Use a positive amount with up to two decimal places."
    : null;
}

export function moneyExpenseCanSubmit(
  name: string,
  kind: MoneyExpenseKind,
  period: MoneyExpensePeriod | null,
  amount: string,
  amountMode: MoneyExpenseAmountMode = "fixed",
): boolean {
  if (!name.trim()) return false;
  if (kind === "subscription" && period === null) return false;
  if (kind === "subscription" && amountMode === "variable") {
    if (!amount.trim()) return true;
    return parseMoneyExpenseAmount(amount) !== null;
  }
  return parseMoneyExpenseAmount(amount) !== null;
}

export function parseExpenseFxRate(draft: string | null): string | null {
  if (draft == null) return null;
  const trimmed = draft.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return trimmed;
}

function fxRatesEqual(a: string, b: string): boolean {
  const left = Number(a);
  const right = Number(b);
  if (Number.isFinite(left) && Number.isFinite(right)) return left === right;
  return a === b;
}

export function expenseFxRateError(draft: string | null): string | null {
  if (draft == null) return null;
  return parseExpenseFxRate(draft) === null ? "Rate must be greater than zero." : null;
}

export function expenseFxRateForSave(input: {
  sourceCurrency: string;
  agencyCurrency: string;
  teamRate: string | null;
  draft: string | null;
}): string | undefined {
  if (input.sourceCurrency.toUpperCase() === input.agencyCurrency.toUpperCase()) return undefined;
  const parsed = parseExpenseFxRate(input.draft);
  if (parsed == null) return undefined;
  if (input.teamRate != null && fxRatesEqual(parsed, input.teamRate)) return undefined;
  return parsed;
}

export function expenseFxOverridePrefill(input: {
  sourceCurrency: string;
  agencyCurrency: string;
  storedRate: string;
  teamRate: string | null;
}): string | null {
  if (input.sourceCurrency.toUpperCase() === input.agencyCurrency.toUpperCase()) return null;
  const stored = parseExpenseFxRate(input.storedRate);
  if (stored == null) return null;
  if (input.teamRate != null && fxRatesEqual(stored, input.teamRate)) return null;
  return stored;
}

export function moneyExpenseAmountLabel(input: {
  amountMode: MoneyExpenseAmountMode;
  amount: number;
  currency: string;
}): string {
  if (input.amountMode === "variable" && input.amount <= 0) return "Variable";
  return formatMoneyExpenseAmount(input.amount, input.currency);
}

export function parseMoneyExpensePaymentAmount(
  value: string,
  remainingAmount: number,
  amountMode: MoneyExpenseAmountMode,
): number | null {
  if (amountMode === "variable") return parseMoneyExpenseAmount(value);
  const parsed = parseMoneyExpenseAmount(value);
  if (parsed === null || parsed > remainingAmount) return null;
  return parsed;
}

export function moneyExpensePaymentCanSubmit(
  value: string,
  remainingAmount: number,
  amountMode: MoneyExpenseAmountMode,
): boolean {
  return parseMoneyExpensePaymentAmount(value, remainingAmount, amountMode) !== null;
}

function moneyExpenseSourceAmount(amount: number, sourceAmount?: number | null): number {
  return sourceAmount ?? amount;
}

export function moneyExpenseDraftAmount(
  amount: number,
  sourceAmount: number | null | undefined,
  amountMode: MoneyExpenseAmountMode,
): string {
  const source = moneyExpenseSourceAmount(amount, sourceAmount);
  if (amountMode === "variable" && source <= 0) return "";
  return (source / 100).toFixed(2);
}

export function formatMoneyExpenseAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function moneyExpenseStatusLabel(status: MoneyExpenseStatus): string {
  switch (status) {
    case "due":
      return "Due";
    case "partial":
      return "Partial";
    case "paid":
      return "Paid";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function formatMoneyExpenseDueDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Date-only uses UTC midnight (same as subscription start). Time uses local clock. */
export function moneyExpenseOccurredAtIso(dateKey: string, time = ""): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!dateMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!timeMatch) {
    return new Date(Date.UTC(year, month, day)).toISOString();
  }
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours > 23 || minutes > 59) return null;
  return new Date(year, month, day, hours, minutes, 0, 0).toISOString();
}

export function moneyExpenseOccurredAtInputs(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const isUtcMidnight =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  if (isUtcMidnight) {
    return { date: date.toISOString().slice(0, 10), time: "" };
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
}

export function moneyExpenseOneTimeMeta(occurredAt: string | null): string {
  const formatted = formatMoneyExpenseDueDate(occurredAt);
  if (!formatted) return "One-time";
  const { time } = moneyExpenseOccurredAtInputs(occurredAt);
  if (!time) return `One-time · ${formatted}`;
  return `One-time · ${formatted} · ${time}`;
}

export function moneyExpenseSubscriptionMeta(record: {
  period: MoneyExpensePeriod | null;
  nextDueAt: string | null;
  startsAt: string | null;
}): string {
  const periodLabel = moneyExpensePeriodLabel(record.period) ?? "Subscription";
  const nextDue = formatMoneyExpenseDueDate(record.nextDueAt);
  if (nextDue) return `${periodLabel} · Next ${nextDue}`;
  const starts = formatMoneyExpenseDueDate(record.startsAt);
  if (starts) return `${periodLabel} · Starts ${starts}`;
  return periodLabel;
}
