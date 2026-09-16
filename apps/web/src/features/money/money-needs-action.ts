import type {
  MoneyBillsPartyFilter,
  MoneyBillsStatusFilter,
} from "@/features/billing/money-bills-filters";
import { formatMoneyAmount } from "@/features/billing/money-bills-rows";
import type { ExpenseStripFilter, ExpenseStripItem } from "@/features/money/money-expenses-strip";

type MoneyNeedsActionKind = "salary-pool" | "client-remaining" | "expenses-due" | "profit-share";

export type MoneyNeedsActionItem = {
  id: string;
  kind: MoneyNeedsActionKind;
  title: string;
  meta: string;
  remainingAmount: number;
  remainingLabel: string;
  actionLabel: "Collect" | "Pay" | "Record";
  party: MoneyBillsPartyFilter;
  status: MoneyBillsStatusFilter | null;
  expense: ExpenseStripFilter | null;
};

export type MoneyNeedsActionInput = {
  currency: string;
  clientRemainingAmount: number;
  salaryPoolRemainingAmount: number;
  profitShareRemainingAmount: number;
  dueExpenses: readonly Pick<
    ExpenseStripItem,
    "remainingAmount" | "name" | "kind" | "canRecordPayment"
  >[];
};

const QUEUE_LIMIT = 6;

function compareNeedsAction(a: MoneyNeedsActionItem, b: MoneyNeedsActionItem): number {
  if (a.remainingAmount !== b.remainingAmount) {
    return b.remainingAmount - a.remainingAmount;
  }
  const dueRank = (item: MoneyNeedsActionItem) => (item.kind === "expenses-due" ? 0 : 1);
  const dueDelta = dueRank(a) - dueRank(b);
  if (dueDelta !== 0) return dueDelta;
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

function dueExpenseQueueItem(
  dueExpenses: MoneyNeedsActionInput["dueExpenses"],
  currency: string,
): MoneyNeedsActionItem | null {
  const unpaid = dueExpenses.filter((item) => item.remainingAmount > 0);
  if (unpaid.length === 0) return null;

  const remainingAmount = unpaid.reduce((sum, item) => sum + item.remainingAmount, 0);
  const named = unpaid.length === 1 ? unpaid[0]! : null;
  const hasSubscription = unpaid.some((item) => item.kind === "subscription");
  const canPay = unpaid.some((item) => item.canRecordPayment);
  const actionLabel = canPay && !hasSubscription ? "Record" : "Pay";
  const meta = dueExpenseMeta(unpaid.length, named?.kind ?? null);

  return {
    id: named ? `expense:${named.name}` : "expenses-due",
    kind: "expenses-due",
    title: named ? named.name : "Due expenses",
    meta,
    remainingAmount,
    remainingLabel: formatMoneyAmount(remainingAmount, currency),
    actionLabel,
    party: "expenses",
    status: null,
    expense: "due",
  };
}

function dueExpenseMeta(unpaidCount: number, kind: "subscription" | "one_time" | null): string {
  if (unpaidCount !== 1) return `${unpaidCount} due this period`;
  if (kind === "subscription") return "Subscription due this period";
  return "One-time expense due this period";
}

export function buildMoneyNeedsActionItems(input: MoneyNeedsActionInput): MoneyNeedsActionItem[] {
  const items: MoneyNeedsActionItem[] = [];

  if (input.salaryPoolRemainingAmount > 0) {
    items.push({
      id: "salary-pool",
      kind: "salary-pool",
      title: "Team salaries",
      meta: "Salary pool remaining",
      remainingAmount: input.salaryPoolRemainingAmount,
      remainingLabel: formatMoneyAmount(input.salaryPoolRemainingAmount, input.currency),
      actionLabel: "Pay",
      party: "team",
      status: null,
      expense: null,
    });
  }

  if (input.clientRemainingAmount > 0) {
    items.push({
      id: "client-remaining",
      kind: "client-remaining",
      title: "Client remaining",
      meta: "Outstanding client bills",
      remainingAmount: input.clientRemainingAmount,
      remainingLabel: formatMoneyAmount(input.clientRemainingAmount, input.currency),
      actionLabel: "Collect",
      party: "client",
      status: "outstanding",
      expense: null,
    });
  }

  if (input.profitShareRemainingAmount > 0) {
    items.push({
      id: "profit-share",
      kind: "profit-share",
      title: "Profit share",
      meta: "Formula allocation still open",
      remainingAmount: input.profitShareRemainingAmount,
      remainingLabel: formatMoneyAmount(input.profitShareRemainingAmount, input.currency),
      actionLabel: "Pay",
      party: "adjustments",
      status: null,
      expense: null,
    });
  }

  const expensesItem = dueExpenseQueueItem(input.dueExpenses, input.currency);
  if (expensesItem) items.push(expensesItem);

  return items.sort(compareNeedsAction).slice(0, QUEUE_LIMIT);
}

export function moneyNeedsActionEmptyCopy(): { title: string; body: string } {
  return {
    title: "Nothing to collect or pay",
    body: "This period is clear. Client remaining, the salary pool, due expenses, and open allocations will land here.",
  };
}

export function moneyNeedsActionStatus(
  scoreboardStatus: "loading" | "error" | "ready",
  expensesStatus: "loading" | "error" | "ready",
  salaryPoolStatus: "loading" | "error" | "ready",
): "loading" | "error" | "ready" {
  if (
    scoreboardStatus === "loading" ||
    expensesStatus === "loading" ||
    salaryPoolStatus === "loading"
  ) {
    return "loading";
  }
  if (scoreboardStatus === "error" || expensesStatus === "error") {
    return "error";
  }
  return "ready";
}
