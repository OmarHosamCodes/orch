import type { ReactNode } from "react";

import {
  instrumentPlateInkClass,
  instrumentPlateSurfaceClass,
  type InstrumentPlateTone,
} from "@/features/member-profile/member-profile-instrument-plate";
import { agencyFocusRingClass, agencyMetricClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

export function AgencyDetailInstrumentPlate({
  label,
  value,
  hint,
  tone,
  glyph,
  onClick,
  actionLabel,
}: {
  label: string;
  value: string;
  hint: string;
  tone: InstrumentPlateTone;
  glyph: ReactNode;
  onClick?: () => void;
  actionLabel?: string;
}) {
  const ink = instrumentPlateInkClass(tone);
  const className = cn(
    instrumentPlateSurfaceClass(),
    "flex min-h-[7.5rem] flex-col items-center justify-between gap-2 rounded-surface border px-3 py-3 text-center transition-colors motion-reduce:transition-none",
    onClick && cn(agencyFocusRingClass, "hover:bg-muted/60"),
  );

  const body = (
    <>
      <div className={cn("h-7 w-full", ink)}>{glyph}</div>
      <span className={cn(agencyMetricClass, "text-lg font-semibold leading-none")}>{value}</span>
      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground">{hint}</span>
      {actionLabel ? (
        <span className="text-[11px] font-bold text-highlighted">{actionLabel}</span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

export function AgencyDetailWeekGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <rect x="4" y="11" width="56" height="6" rx="1.5" className="fill-current opacity-20" />
      <rect x="4" y="11" width="34" height="6" rx="1.5" className="fill-current" />
    </svg>
  );
}

export function AgencyDetailMonthGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <rect
        x="8"
        y="6"
        width="48"
        height="16"
        rx="2"
        fill="none"
        className="stroke-current"
        strokeWidth="1.5"
      />
      <rect x="14" y="12" width="8" height="6" className="fill-current opacity-35" />
      <rect x="28" y="12" width="8" height="6" className="fill-current" />
      <rect x="42" y="12" width="8" height="6" className="fill-current opacity-35" />
    </svg>
  );
}

export function AgencyDetailTasksGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <rect x="10" y="8" width="44" height="4" rx="1" className="fill-current" />
      <rect x="10" y="16" width="32" height="4" rx="1" className="fill-current opacity-70" />
      <rect x="10" y="24" width="24" height="4" rx="1" className="fill-current opacity-40" />
    </svg>
  );
}

export function AgencyDetailBudgetGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <rect x="8" y="18" width="48" height="4" rx="1" className="fill-current opacity-20" />
      <rect x="8" y="18" width="30" height="4" rx="1" className="fill-current" />
      <rect x="8" y="10" width="10" height="10" rx="1" className="fill-current opacity-35" />
      <rect x="22" y="10" width="10" height="10" rx="1" className="fill-current opacity-55" />
      <rect x="36" y="10" width="10" height="10" rx="1" className="fill-current" />
    </svg>
  );
}
