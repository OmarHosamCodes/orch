import { optionalSafeRedirectPath } from "@/lib/safe-redirect-path";

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function validateLooseSearch(search: Record<string, unknown>): Record<string, unknown> {
  return { ...search };
}

export function validatePeriodSearch(search: Record<string, unknown>): {
  from?: string;
  to?: string;
} {
  return {
    from: optionalString(search.from),
    to: optionalString(search.to),
  };
}

const MONEY_PARTIES = ["all", "client", "team", "adjustments", "expenses"] as const;
const MONEY_STATUSES = ["outstanding", "partial", "paid", "refunded"] as const;
const MONEY_EXPENSE_FILTERS = ["all", "due", "paid"] as const;

function optionalMember<T extends string>(value: unknown, values: readonly T[]): T | undefined {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : undefined;
}

export function validateMoneySearch(search: Record<string, unknown>): {
  from?: string;
  to?: string;
  party?: (typeof MONEY_PARTIES)[number];
  status?: (typeof MONEY_STATUSES)[number];
  expense?: (typeof MONEY_EXPENSE_FILTERS)[number];
  q?: string;
} {
  return {
    ...validatePeriodSearch(search),
    party: optionalMember(search.party, MONEY_PARTIES),
    status: optionalMember(search.status, MONEY_STATUSES),
    expense: optionalMember(search.expense, MONEY_EXPENSE_FILTERS),
    q: optionalString(search.q),
  };
}

export function validateReportSearch(search: Record<string, unknown>): {
  from?: string;
  to?: string;
  fields?: string;
  showWaste?: string;
  mergeTasks?: string;
} {
  return {
    ...validatePeriodSearch(search),
    fields: optionalString(search.fields),
    showWaste: optionalString(search.showWaste),
    mergeTasks: optionalString(search.mergeTasks),
  };
}

export function validateProfileSearch(search: Record<string, unknown>): {
  focus?: string;
  alertId?: string;
  day?: string;
  period?: string;
} {
  return {
    focus: optionalString(search.focus),
    alertId: optionalString(search.alertId),
    day: optionalString(search.day),
    period: optionalString(search.period),
  };
}

export function validateProjectSearch(search: Record<string, unknown>): {
  focusTask?: string;
} {
  return {
    focusTask: optionalString(search.focusTask),
  };
}

export function validateLoginSearch(search: Record<string, unknown>): {
  redirect?: string;
  error?: string;
  checkout_id?: string;
} {
  return {
    redirect: optionalSafeRedirectPath(optionalString(search.redirect)),
    error: optionalString(search.error),
    checkout_id: optionalString(search.checkout_id),
  };
}
