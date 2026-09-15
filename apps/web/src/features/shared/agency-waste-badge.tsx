import { motion, type Transition } from "motion/react";
import { X } from "lucide-react";

import {
  agencyBaseTransition,
  agencyFastTransition,
  agencyTapScale,
} from "@/features/shared/agency-motion";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { Badge } from "@/ui/badge";
import { cn } from "@/lib/utils";

type AgencyWasteDismissibleProps = {
  className?: string;
  /** Clears waste when dismissed. Omit for display-only. */
  onDismiss?: () => void;
  /** Screen-reader label for the X. Defaults to "Unmark as waste". */
  dismissLabel?: string;
  disabled?: boolean;
  /** Enter/exit tween. Defaults to the shared agency base transition. */
  motionTransition?: Transition;
};

function WasteDismissButton({
  disabled,
  prefersReducedMotion,
  label,
  onDismiss,
}: {
  disabled: boolean;
  prefersReducedMotion: boolean;
  label: string;
  onDismiss: () => void;
}) {
  return (
    <motion.button
      type="button"
      data-icon="inline-end"
      className={cn(
        "inline-flex size-3.5 shrink-0 items-center justify-center rounded-full",
        "text-destructive/70 hover:bg-destructive/10 hover:text-destructive",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
      aria-label={label}
      disabled={disabled}
      whileTap={prefersReducedMotion ? undefined : agencyTapScale}
      transition={agencyFastTransition}
      onClick={(event) => {
        event.stopPropagation();
        onDismiss();
      }}
    >
      <X className="size-2.5" strokeWidth={2.5} aria-hidden />
    </motion.button>
  );
}

/**
 * Inline Waste tag — Tracker entry-log treatment, also used on Reports rows.
 * Dismissible with X when `onDismiss` is set (single or grouped bulk unmark).
 * Visibility is parent-driven (`{isWaste ? <AgencyWasteTag /> : null}`) so a failed
 * unmark never leaves a false-positive hidden tag.
 */
export function AgencyWasteTag({
  className,
  onDismiss,
  dismissLabel = "Unmark as waste",
  disabled = false,
  motionTransition = agencyBaseTransition,
}: AgencyWasteDismissibleProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const dismissible = Boolean(onDismiss);

  return (
    <motion.span
      className={cn("inline-flex shrink-0 self-center", className)}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
      transition={motionTransition}
    >
      <Badge
        variant="destructive"
        className={cn(
          "shrink-0 gap-0.5 px-1.5 text-[10px] font-semibold uppercase tracking-wide",
          dismissible && "pr-0.5",
        )}
      >
        Waste
        {dismissible ? (
          <WasteDismissButton
            disabled={disabled}
            prefersReducedMotion={prefersReducedMotion}
            label={dismissLabel}
            onDismiss={() => {
              if (disabled) return;
              onDismiss?.();
            }}
          />
        ) : null}
      </Badge>
    </motion.span>
  );
}

/** Quiet partial-waste chip for collapsed xN rows (some waste, some not). */
export function AgencyPartialWasteChip({
  wasteCount,
  totalCount,
  className,
  onActivate,
}: {
  wasteCount: number;
  totalCount: number;
  className?: string;
  /** Prefer expanding the group so the user can see which rows are waste. */
  onActivate?: () => void;
}) {
  const label = `${wasteCount}/${totalCount} waste`;
  const classNames = cn(
    "inline-flex h-5 shrink-0 items-center rounded-full border border-destructive/40 bg-destructive/10",
    "px-1.5 text-[10px] font-semibold uppercase tracking-wide text-destructive",
    className,
  );

  if (onActivate) {
    return (
      <button
        type="button"
        className={classNames}
        aria-label={`Show ${label} entries`}
        onClick={onActivate}
      >
        {label}
      </button>
    );
  }

  return <span className={classNames}>{label}</span>;
}
