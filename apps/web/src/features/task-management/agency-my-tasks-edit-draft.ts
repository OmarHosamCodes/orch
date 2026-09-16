import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import { catalogRateAmount } from "@/features/shared/format-rate";

export type MyTasksEditDraft = {
  title: string;
  iconKey: AgencyEntityIconKey | null;
  assignedToTeam: boolean;
  assigneeUserIds: string[];
  estimateMinutes: number | null;
  billableRateDraft: string;
  billableRateCurrency: string;
};

function sortedIds(ids: string[]): string[] {
  return [...ids].sort();
}

function billableRateDraftFromAmount(amount: number | null | undefined): string {
  if (amount == null) return "";
  return String(amount / 100);
}

export function myTasksEditDraftFromTask(task: {
  title: string;
  iconKey?: AgencyEntityIconKey | null;
  assignedToTeam: boolean;
  assignees: { userId: string }[];
  estimateMinutes?: number | null;
  billableRateAmount?: number | null;
  sourceBillableRateAmount?: number | null;
  currency?: string | null;
  projectBillableRateAmount?: number | null;
  projectCurrency?: string | null;
  clientCurrency?: string | null;
}): MyTasksEditDraft {
  const catalogAmount = catalogRateAmount(task.sourceBillableRateAmount, task.billableRateAmount);
  const inheritCurrency =
    task.projectBillableRateAmount != null
      ? (task.projectCurrency ?? task.clientCurrency ?? "USD")
      : (task.clientCurrency ?? "USD");
  return {
    title: task.title,
    iconKey: task.iconKey ?? null,
    assignedToTeam: task.assignedToTeam,
    assigneeUserIds: sortedIds(task.assignees.map((a) => a.userId)),
    estimateMinutes: task.estimateMinutes ?? null,
    billableRateDraft: billableRateDraftFromAmount(catalogAmount),
    billableRateCurrency:
      task.billableRateAmount != null ? (task.currency ?? inheritCurrency) : inheritCurrency,
  };
}

export function isMyTasksEditDraftDirty(
  baseline: MyTasksEditDraft,
  draft: MyTasksEditDraft,
): boolean {
  if (baseline.title.trim() !== draft.title.trim()) return true;
  if (baseline.iconKey !== draft.iconKey) return true;
  if (baseline.assignedToTeam !== draft.assignedToTeam) return true;
  if (baseline.estimateMinutes !== draft.estimateMinutes) return true;
  if (baseline.billableRateDraft.trim() !== draft.billableRateDraft.trim()) return true;
  if (baseline.billableRateCurrency !== draft.billableRateCurrency) return true;
  const a = sortedIds(baseline.assigneeUserIds).join("\0");
  const b = sortedIds(draft.assigneeUserIds).join("\0");
  return a !== b;
}

export function canSaveMyTasksEdit(args: {
  draft: MyTasksEditDraft;
  baseline: MyTasksEditDraft;
  pending: boolean;
  billableRateAmountValid?: boolean;
}): boolean {
  if (args.pending) return false;
  if (!args.draft.title.trim()) return false;
  if (args.billableRateAmountValid === false) return false;
  return isMyTasksEditDraftDirty(args.baseline, args.draft);
}
