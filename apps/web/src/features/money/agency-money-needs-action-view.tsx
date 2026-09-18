import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyPanelClass,
  agencyWorkMetaClass,
  agencyWorkMetricClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";
import { ExpenseStripGlyph } from "./money-expense-strip-glyphs";
import { type MoneyNeedsActionItem } from "./money-needs-action";

function needsActionMarkLabel(kind: Exclude<MoneyNeedsActionItem["kind"], "expenses-due">): string {
  switch (kind) {
    case "salary-pool":
      return "TS";
    case "client-remaining":
      return "CR";
    case "profit-share":
      return "PS";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function NeedsActionMark({ item }: { item: MoneyNeedsActionItem }) {
  switch (item.kind) {
    case "expenses-due":
      return <ExpenseStripGlyph kind="subscription" />;
    case "salary-pool":
    case "client-remaining":
    case "profit-share":
      return (
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-default bg-muted/35 text-[0.6875rem] font-semibold tracking-wide text-highlighted"
          aria-hidden
        >
          {needsActionMarkLabel(item.kind)}
        </span>
      );
    default: {
      const _exhaustive: never = item.kind;
      return _exhaustive;
    }
  }
}

function NeedsActionRow({
  item,
  onSelect,
}: {
  item: MoneyNeedsActionItem;
  onSelect: AgencyMoneySurfaceViewModel["needsAction"]["onSelect"];
}) {
  return (
    <li>
      <div className="flex items-start gap-3 py-3">
        <NeedsActionMark item={item} />
        <button
          type="button"
          className={cn("min-w-0 flex-1 rounded-md text-start", agencyFocusRingClass)}
          onClick={() => onSelect(item)}
        >
          <span className={cn(agencyWorkTitleClass, "block truncate")}>{item.title}</span>
          <span className={cn(agencyWorkMetaClass, "mt-0.5 block truncate")}>{item.meta}</span>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1.5 ps-2">
          <span className={cn(agencyWorkMetricClass, "text-warning")}>{item.remainingLabel}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onSelect(item)}
          >
            {item.actionLabel}
          </Button>
        </div>
      </div>
    </li>
  );
}

export function MoneyNeedsActionQueue({
  needsAction,
}: {
  needsAction: AgencyMoneySurfaceViewModel["needsAction"];
}) {
  if (needsAction.status === "loading") {
    return <SurfaceShimmer className="h-full min-h-[16rem]" label="Loading needs action" />;
  }

  if (needsAction.status === "error") {
    return (
      <section className={cn(agencyErrorPanelClass, "h-full")} role="alert">
        <p className="text-sm font-medium text-highlighted">Couldn’t load needs action</p>
        <p className="mt-1 text-xs text-muted">Retry the period scoreboard to refresh this list.</p>
      </section>
    );
  }

  const empty = needsAction.items.length === 0;

  return (
    <section
      className={cn(agencyPanelClass, "flex h-full min-h-0 min-w-0 flex-col")}
      aria-label="Needs action"
    >
      <header className="border-b border-default px-4 py-3">
        <h2 className={agencyWorkTitleClass}>Needs action</h2>
        <p className={cn(agencyWorkMetaClass, "mt-1")}>
          Collect, pay, or record the largest remaining amounts first.
        </p>
      </header>
      {empty ? (
        <div className="flex flex-1 flex-col justify-center px-4 py-8">
          <p className="text-sm font-medium text-highlighted">{needsAction.emptyCopy.title}</p>
          <p className={cn(agencyWorkMetaClass, "mt-1 max-w-sm text-pretty")}>
            {needsAction.emptyCopy.body}
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border px-4">
          {needsAction.items.map((item) => (
            <NeedsActionRow key={item.id} item={item} onSelect={needsAction.onSelect} />
          ))}
        </ul>
      )}
    </section>
  );
}
