import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";

import { AgencyEntityIconPickerView } from "@/features/shared/agency-entity-icon-picker-view";
import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

type AgencyIdentityFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string | null;
  iconKey?: AgencyEntityIconKey | null;
  onIconChange?: (iconKey: AgencyEntityIconKey | null) => void;
  /** Display-only hue override; chooser create passes the selected swatch. */
  colorHueId?: number | null;
  /** When set, hue swatches live in the icon popover (same payload). */
  onColorHueChange?: (hueId: number) => void;
  /** Stable seed for hash fallback when colorHueId is absent. */
  projectId?: string;
  "aria-label"?: string;
  className?: string;
};

export function AgencyIdentityField({
  id,
  value,
  onChange,
  placeholder,
  autoFocus = false,
  disabled = false,
  error,
  iconKey,
  onIconChange,
  colorHueId,
  onColorHueChange,
  projectId,
  "aria-label": ariaLabel,
  className,
}: AgencyIdentityFieldProps) {
  const hueSeed = projectId ?? iconKey ?? "draft";

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div
        className={cn(
          "flex h-10 min-w-0 items-center gap-1 rounded-xl border border-default bg-default pr-1",
          "transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          error && "border-destructive",
          "motion-reduce:transition-none",
        )}
      >
        {onIconChange ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label="Choose icon"
                className={cn(
                  "ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                  "transition-[color,transform,background-color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] hover:bg-muted",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  agencyFocusRingClass,
                  "motion-reduce:transition-none",
                )}
              >
                <AgencyEntityMark
                  name={value}
                  projectId={hueSeed}
                  iconKey={iconKey}
                  colorHueId={colorHueId}
                  size="header"
                  className="transition-[color,transform] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] motion-reduce:transition-none"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent size="form" align="start" className="z-[60] p-3">
              <AgencyEntityIconPickerView
                name={value}
                value={iconKey ?? null}
                onChange={onIconChange}
                disabled={disabled}
                projectId={hueSeed}
                colorHueId={colorHueId}
                onColorHueChange={onColorHueChange}
              />
            </PopoverContent>
          </Popover>
        ) : null}
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={Boolean(error)}
          className={cn(
            "h-9 min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0",
            "rounded-xl text-sm",
            agencyInputPlaceholderClass,
          )}
        />
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
