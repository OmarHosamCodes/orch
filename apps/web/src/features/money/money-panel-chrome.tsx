import { type ReactNode } from "react";

import { agencyMetricClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

export const moneyPanelHeaderClass = "flex flex-col gap-3 border-b border-default p-surface";

export function MoneyPanelTitleRow({
  title,
  children,
  headingId,
  headingTabIndex,
}: {
  title: ReactNode;
  children?: ReactNode;
  headingId?: string;
  headingTabIndex?: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h2
        id={headingId}
        tabIndex={headingTabIndex}
        className="min-w-0 text-sm font-semibold leading-snug text-balance text-highlighted"
      >
        {title}
      </h2>
      {children ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:gap-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function MoneyPanelMetricBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <div className="text-[0.625rem] font-medium tracking-[0.06em] text-muted uppercase">
            {label}
          </div>
          <div
            className={cn(
              agencyMetricClass,
              "mt-0.5 font-mono text-base font-semibold tabular-nums tracking-tight text-highlighted",
            )}
          >
            {value}
          </div>
        </div>
        {hint ? (
          <p className="max-w-sm text-xs text-muted text-balance sm:text-end" aria-live="polite">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function MoneyPeriodFxLine({
  label,
  canApplyCurrent,
  applying,
  onApplyCurrent,
}: {
  label: string | null;
  canApplyCurrent: boolean;
  applying: boolean;
  onApplyCurrent: () => void;
}) {
  if (!label && !canApplyCurrent) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {label ? <p className="text-xs text-muted">{label}</p> : null}
      {canApplyCurrent ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted"
          disabled={applying}
          onClick={onApplyCurrent}
        >
          Update from current FX
        </Button>
      ) : null}
    </div>
  );
}
