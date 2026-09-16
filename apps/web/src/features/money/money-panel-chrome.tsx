import { type ReactNode } from "react";
import { Search } from "lucide-react";

import {
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyMetricClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

export const moneyPanelHeaderClass =
  "flex flex-col gap-3 border-b border-default px-4 py-3.5";

export function MoneyPanelNorthStar({
  value,
  label,
  hint,
}: {
  value: ReactNode;
  label: string;
  hint?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span
          className={cn(
            agencyMetricClass,
            "font-mono text-lg font-semibold tabular-nums tracking-tight text-highlighted",
          )}
        >
          {value}
        </span>
        <span className="text-xs text-muted">{label}</span>
      </p>
      {hint ? (
        <p className="max-w-2xl text-xs text-muted text-balance" aria-live="polite">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function MoneyPanelSearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative w-full min-w-44 sm:w-52">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          "h-9 rounded-xl border-default bg-default pl-9 text-sm",
          agencyInputPlaceholderClass,
          value.trim() ? "text-highlighted" : undefined,
        )}
      />
    </div>
  );
}

export function MoneyPanelToolbar({
  start,
  end,
}: {
  start: ReactNode;
  end?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1 overflow-x-auto">{start}</div>
      {end ? (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 lg:shrink-0">
          {end}
        </div>
      ) : null}
    </div>
  );
}

export function MoneyPanelHeading({
  title,
  headingId,
  headingTabIndex,
  children,
}: {
  title: ReactNode;
  headingId?: string;
  headingTabIndex?: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h2
        id={headingId}
        tabIndex={headingTabIndex}
        className={cn(agencyWorkTitleClass, "min-w-0 text-balance")}
      >
        {title}
      </h2>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>
      ) : null}
    </div>
  );
}

/** @deprecated Use MoneyPanelHeading + MoneyPanelNorthStar */
export function MoneyPanelTitleRow({
  title,
  metric,
  children,
  headingId,
  headingTabIndex,
}: {
  title: ReactNode;
  metric?: ReactNode;
  children?: ReactNode;
  headingId?: string;
  headingTabIndex?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h2
        id={headingId}
        tabIndex={headingTabIndex}
        className="min-w-0 text-sm font-semibold leading-snug text-balance text-highlighted"
      >
        {title}
      </h2>
      {metric}
      {children ? (
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use MoneyPanelNorthStar */
export function MoneyPanelMetricBlock({ label, value }: { label: string; value: ReactNode }) {
  return <MoneyPanelNorthStar value={value} label={label} />;
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
          className={cn("h-7 px-2 text-xs text-muted", agencyFocusRingClass)}
          disabled={applying}
          onClick={onApplyCurrent}
        >
          Update from current FX
        </Button>
      ) : null}
    </div>
  );
}
