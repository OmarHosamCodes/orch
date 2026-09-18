import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

export type AgencyModeSegmentOption<T extends string> = {
  value: T;
  label: string;
};

type AgencyModeSegmentProps<T extends string> = {
  value: T;
  options: readonly AgencyModeSegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  stretch?: boolean;
  "aria-label": string;
  className?: string;
};

export function AgencyModeSegment<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  stretch = false,
  "aria-label": ariaLabel,
  className,
}: AgencyModeSegmentProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full rounded-full border border-default bg-elevated p-1",
        stretch ? "w-full" : "w-fit",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold transition-[color,background-color,transform] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
              stretch && "min-w-0 flex-1",
              selected
                ? "bg-background text-highlighted shadow-sm"
                : "text-muted hover:text-highlighted",
              "disabled:cursor-not-allowed disabled:opacity-50",
              agencyFocusRingClass,
              "motion-reduce:transition-none",
            )}
            onClick={() => {
              if (!selected) onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
