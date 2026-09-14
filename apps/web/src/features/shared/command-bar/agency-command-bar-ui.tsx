import type { ReactNode } from "react";

import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

export const agencyCommandBarShellClass =
  "flex flex-wrap items-center gap-2 rounded-surface border border-default bg-card p-2";

export const agencyCommandBarFilterTriggerClass = cn(
  "inline-flex h-9 min-w-32 max-w-44 overflow-hidden items-center justify-between gap-2 rounded-xl border border-default bg-default px-3 text-left text-xs font-semibold transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
  agencyFocusRingClass,
);

type AgencyCommandBarActionsProps = {
  children: ReactNode;
  className?: string;
};

export function AgencyCommandBarActions({ children, className }: AgencyCommandBarActionsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 md:ml-auto", className)}>{children}</div>
  );
}

type AgencyCommandBarResetButtonProps = {
  onClick: () => void;
};

export function AgencyCommandBarResetButton({ onClick }: AgencyCommandBarResetButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "h-9 rounded-xl px-2.5 text-xs font-semibold text-muted transition-colors hover:bg-default hover:text-highlighted",
        agencyFocusRingClass,
        "motion-reduce:transition-none",
      )}
      onClick={onClick}
    >
      Reset
    </button>
  );
}
