import { Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { agencyCommandBarSearchInputClass, agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

const APPLY_PULSE_MS = 220;

const agencyCommandBarShellClass =
  "relative flex flex-wrap items-center gap-2 rounded-surface border border-default bg-card p-2";

export const agencyCommandBarCustomRangeTriggerClass =
  "h-9 min-h-9 w-auto max-w-[22rem] py-1.5 text-xs font-semibold";

type AgencyCommandBarRootProps = {
  children: ReactNode;
  className?: string;
  busy?: boolean;
  busyLabel?: string;
};

function AgencyCommandBarRoot({
  children,
  className,
  busy = false,
  busyLabel = "Loading",
}: AgencyCommandBarRootProps) {
  return (
    <div
      className={cn(agencyCommandBarShellClass, busy && "overflow-hidden", className)}
      aria-busy={busy || undefined}
    >
      {busy ? (
        <>
          <span
            className="agency-command-bar-shimmer pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
            aria-hidden
          />
          <span className="sr-only" role="status">
            {busyLabel}
          </span>
        </>
      ) : null}
      {children}
    </div>
  );
}

type AgencyCommandBarStartProps = {
  children: ReactNode;
};

function AgencyCommandBarStart({ children }: AgencyCommandBarStartProps) {
  return <>{children}</>;
}

type AgencyCommandBarEndProps = {
  children: ReactNode;
  className?: string;
};

function AgencyCommandBarEnd({ children, className }: AgencyCommandBarEndProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 md:ml-auto", className)}>{children}</div>
  );
}

type AgencyCommandBarSearchProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
};

function AgencyCommandBarSearch({
  value,
  onValueChange,
  placeholder,
}: AgencyCommandBarSearchProps) {
  return (
    <div className="relative min-w-64 flex-1 md:max-w-72">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
      <Input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          agencyCommandBarSearchInputClass,
          value.trim() ? "text-highlighted" : undefined,
        )}
      />
    </div>
  );
}

type AgencyCommandBarApplyProps = {
  onClick: () => void;
  disabled?: boolean;
};

function AgencyCommandBarApply({ onClick, disabled }: AgencyCommandBarApplyProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!pulse) return;
    const timer = window.setTimeout(() => setPulse(false), APPLY_PULSE_MS);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      disabled={disabled}
      onClick={() => {
        onClick();
        setPulse(true);
      }}
      className={cn(
        "text-xs font-semibold transition-shadow duration-200 ease-out motion-reduce:transition-none",
        pulse && "ring-3 ring-primary/20",
      )}
    >
      Apply
    </Button>
  );
}

type AgencyCommandBarResetProps = {
  onClick: () => void;
};

function AgencyCommandBarReset({ onClick }: AgencyCommandBarResetProps) {
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

export const AgencyCommandBar = {
  Root: AgencyCommandBarRoot,
  Start: AgencyCommandBarStart,
  End: AgencyCommandBarEnd,
  Search: AgencyCommandBarSearch,
  Apply: AgencyCommandBarApply,
  Reset: AgencyCommandBarReset,
};
