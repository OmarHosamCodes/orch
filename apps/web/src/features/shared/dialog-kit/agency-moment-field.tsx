import { Clock } from "lucide-react";

import { MemberProfileDatePicker } from "@/features/shared/date/member-profile-date-picker";
import { AgencyKitReveal } from "@/features/shared/dialog-kit/agency-kit-reveal";
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Input } from "@/ui/input";

type AgencyMomentFieldProps = {
  dateId: string;
  dateValue: string;
  onDateChange: (value: string) => void;
  dateAriaLabel: string;
  label?: string;
  hint?: string | null;
  timeId?: string;
  timeValue?: string;
  onTimeChange?: (value: string) => void;
  disabled?: boolean;
  variant?: "field" | "chip";
};

export function AgencyMomentField({
  dateId,
  dateValue,
  onDateChange,
  dateAriaLabel,
  label,
  hint,
  timeId,
  timeValue,
  onTimeChange,
  disabled = false,
  variant = "field",
}: AgencyMomentFieldProps) {
  const showTime = Boolean(onTimeChange);
  const isChip = variant === "chip";

  return (
    <div className={isChip ? "flex min-w-0 flex-col gap-1" : agencyFormFieldClass}>
      {label && !isChip ? <span className={agencyFormLabelClass}>{label}</span> : null}
      <div className="flex min-w-0 flex-col gap-2">
        <MemberProfileDatePicker
          id={dateId}
          value={dateValue}
          onChange={onDateChange}
          disabled={disabled}
          aria-label={dateAriaLabel}
          className={
            isChip ? "h-8 w-fit max-w-full rounded-full px-2.5 text-xs" : "h-10 rounded-xl"
          }
        />
        {showTime ? (
          <AgencyKitReveal open={Boolean(dateValue)}>
            <div className="pt-0.5">
              <label className="relative flex h-10 items-center gap-2 rounded-xl border border-default bg-default px-3">
                <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="sr-only">Time</span>
                <Input
                  id={timeId}
                  type="time"
                  value={timeValue ?? ""}
                  onChange={(event) => onTimeChange?.(event.target.value)}
                  disabled={disabled || !dateValue}
                  className={cn(
                    "h-9 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0",
                    "font-mono text-sm tabular-nums",
                    agencyInputPlaceholderClass,
                    agencyFocusRingClass,
                  )}
                />
              </label>
            </div>
          </AgencyKitReveal>
        ) : null}
      </div>
      {hint ? <p className="text-[11px] text-muted text-pretty">{hint}</p> : null}
    </div>
  );
}
