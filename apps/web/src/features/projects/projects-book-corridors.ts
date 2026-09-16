/** Corridor Board grouping for the Agency Projects list. */

import { clientBookWeekHeatBarClass } from "@/features/clients/clients-book-corridors";

export const PROJECT_JOURNEY_STALLED_DAYS = 14;

const PROJECT_BOOK_CORRIDOR_IDS = ["at_risk", "active", "quiet", "trash"] as const;

export type ProjectBookCorridorId = (typeof PROJECT_BOOK_CORRIDOR_IDS)[number];

const PROJECT_BOOK_NEED_IDS = [
  "at_risk",
  "no_budget",
  "journey_stalled",
  "client_archived",
  "rate_override",
] as const;

export type ProjectBookNeedId = (typeof PROJECT_BOOK_NEED_IDS)[number];

export type ProjectBookBudgetInput = {
  hoursBudget: number | null;
  hoursLogged: number;
  costBudgetAmount: number | null;
  costLoggedAmount: number;
} | null;

export type ProjectBookCorridorInput = {
  deletedAt: string | null;
  weekDurationSeconds: number;
  budget: ProjectBookBudgetInput;
};

export type ProjectBookNeedInput = {
  deletedAt: string | null;
  budget: ProjectBookBudgetInput;
  clientArchivedAt: string | null;
  inheritsClientRate: boolean;
  journeyIncomplete: boolean;
  daysSinceLastActivity: number | null;
};

export function projectBudgetUsagePct(budget: ProjectBookBudgetInput): number {
  if (!budget) return 0;
  if (budget.hoursBudget && budget.hoursBudget > 0) {
    return Math.min(100, Math.round((budget.hoursLogged / budget.hoursBudget) * 100));
  }
  if (budget.costBudgetAmount && budget.costBudgetAmount > 0) {
    return Math.min(100, Math.round((budget.costLoggedAmount / budget.costBudgetAmount) * 100));
  }
  return 0;
}

export function projectHasBudget(budget: ProjectBookBudgetInput): boolean {
  if (!budget) return false;
  return Boolean(
    (budget.hoursBudget && budget.hoursBudget > 0) ||
      (budget.costBudgetAmount && budget.costBudgetAmount > 0),
  );
}

export function projectIsAtRisk(budget: ProjectBookBudgetInput): boolean {
  if (!projectHasBudget(budget)) return false;
  return projectBudgetUsagePct(budget) >= 85;
}

export function projectBookCorridor(input: ProjectBookCorridorInput): ProjectBookCorridorId {
  if (input.deletedAt) return "trash";
  if (projectIsAtRisk(input.budget)) return "at_risk";
  if (input.weekDurationSeconds > 0) return "active";
  return "quiet";
}

export function projectBookCorridorLabel(id: ProjectBookCorridorId): string {
  switch (id) {
    case "at_risk":
      return "At risk";
    case "active":
      return "Active this week";
    case "quiet":
      return "Quiet";
    case "trash":
      return "In trash";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function projectBookNeedLabel(id: ProjectBookNeedId): string {
  switch (id) {
    case "at_risk":
      return "At risk";
    case "no_budget":
      return "No budget";
    case "journey_stalled":
      return "Journey stalled";
    case "client_archived":
      return "Client archived";
    case "rate_override":
      return "Inherits rate";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/** Semantic chip colors for corridor need tags (glyph/chip ink only). */
export function projectBookNeedChipClass(id: ProjectBookNeedId): string {
  switch (id) {
    case "at_risk":
      return "bg-warning/15 text-warning";
    case "no_budget":
    case "journey_stalled":
      return "bg-info/15 text-info";
    case "client_archived":
      return "bg-muted text-muted-foreground";
    case "rate_override":
      return "bg-info/10 text-info";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/** Corridor label accent for list section headers. */
export function projectBookCorridorAccentClass(id: ProjectBookCorridorId): string {
  switch (id) {
    case "at_risk":
      return "text-warning";
    case "active":
      return "text-success";
    case "quiet":
      return "text-muted";
    case "trash":
      return "text-dimmed";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/** Week heat bar fill keyed to activity and budget urgency. */
export function projectBookWeekHeatBarClass(input: {
  durationSeconds: number;
  hasAtRiskNeed: boolean;
}): string {
  return clientBookWeekHeatBarClass({
    durationSeconds: input.durationSeconds,
    hasInvoiceNeed: input.hasAtRiskNeed,
  });
}

export function projectBookNeeds(input: ProjectBookNeedInput): ProjectBookNeedId[] {
  if (input.deletedAt) return [];
  const needs: ProjectBookNeedId[] = [];
  if (projectIsAtRisk(input.budget)) needs.push("at_risk");
  if (!projectHasBudget(input.budget)) needs.push("no_budget");
  if (
    input.journeyIncomplete &&
    input.daysSinceLastActivity != null &&
    input.daysSinceLastActivity >= PROJECT_JOURNEY_STALLED_DAYS
  ) {
    needs.push("journey_stalled");
  }
  if (input.clientArchivedAt) needs.push("client_archived");
  if (input.inheritsClientRate) needs.push("rate_override");
  return needs;
}

export function groupProjectsByCorridor<T extends { corridor: ProjectBookCorridorId }>(
  items: T[],
): Array<{ id: ProjectBookCorridorId; label: string; items: T[] }> {
  const buckets = new Map<ProjectBookCorridorId, T[]>();
  for (const id of PROJECT_BOOK_CORRIDOR_IDS) buckets.set(id, []);
  for (const item of items) {
    buckets.get(item.corridor)?.push(item);
  }
  return PROJECT_BOOK_CORRIDOR_IDS.flatMap((id) => {
    const grouped = buckets.get(id) ?? [];
    if (grouped.length === 0) return [];
    return [{ id, label: projectBookCorridorLabel(id), items: grouped }];
  });
}
