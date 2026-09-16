import { Check, ChevronDown, Search } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";

/** Canonical picker field trigger. Command-bar filters add width caps on top. */
export const agencyPickerFieldTriggerClass = cn(
  "inline-flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-default bg-default px-3 text-left text-xs font-semibold transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
  agencyFocusRingClass,
);

export const agencyPickerChipTriggerClass = cn(
  "inline-flex h-8 w-fit max-w-full items-center gap-1.5 rounded-full border border-default bg-elevated px-2 text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
  agencyFocusRingClass,
);

export const agencyPickerInlineTriggerClass = cn(
  "inline-flex min-w-0 max-w-full items-center justify-start gap-1.5 overflow-hidden rounded-lg border-0 bg-transparent px-2 font-normal text-foreground shadow-none transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
  agencyFocusRingClass,
);

type AgencyPickerTriggerProps = {
  variant?: "field" | "chip" | "inline";
  glyph?: ReactNode;
  label: ReactNode;
  open?: boolean;
  filled?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  ref?: Ref<HTMLButtonElement>;
  "aria-label"?: string;
};

export function AgencyPickerTrigger({
  variant = "field",
  glyph,
  label,
  open,
  filled,
  disabled,
  className,
  id,
  ref,
  "aria-label": ariaLabel,
  ...rest
}: AgencyPickerTriggerProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      {...rest}
      id={id}
      ref={ref}
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={open}
      className={cn(
        variant === "chip"
          ? agencyPickerChipTriggerClass
          : variant === "inline"
            ? agencyPickerInlineTriggerClass
            : agencyPickerFieldTriggerClass,
        filled ? "text-foreground" : "text-muted",
        className,
      )}
    >
      {glyph ? (
        <span className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {glyph}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <ChevronDown
        className={cn(
          "shrink-0 opacity-70 transition-transform motion-reduce:transition-none",
          open && "rotate-180",
          variant === "chip" ? "size-3" : "size-3.5",
        )}
        aria-hidden
      />
    </button>
  );
}

export function AgencyPickerSearch({
  value,
  onChange,
  placeholder,
  ariaLabel,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="shrink-0 border-b border-border p-2">
      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
        <Input
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            "h-9 rounded-lg border-default bg-default pl-8 text-base md:text-sm",
            agencyInputPlaceholderClass,
          )}
        />
      </div>
    </div>
  );
}

export function AgencyPickerRow({
  glyph,
  label,
  query,
  description,
  selected,
  onSelect,
  leading = "check",
  checked,
  onCheckedChange,
  accessibleName,
}: {
  glyph?: ReactNode;
  label: string;
  query?: string;
  description?: string;
  selected?: boolean;
  onSelect?: () => void;
  leading?: "check" | "checkbox" | "none";
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  accessibleName?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={accessibleName}
      onClick={leading === "checkbox" ? undefined : onSelect}
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-start transition-colors hover:bg-accent",
        selected && "bg-accent text-accent-foreground",
        agencyFocusRingClass,
        "motion-reduce:transition-none",
      )}
    >
      {leading === "checkbox" ? (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onCheckedChange?.(value === true)}
          aria-label={accessibleName ?? label}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}
      {glyph ? (
        <span className="inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {glyph}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "min-w-0 truncate text-sm font-medium",
            selected ? "text-primary" : "text-highlighted",
          )}
        >
          <AgencySearchHighlight text={label} query={query ?? ""} />
        </span>
        {description ? (
          <span className="truncate text-[11px] text-muted-foreground">{description}</span>
        ) : null}
      </span>
      {leading === "check" && selected ? (
        <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
      ) : null}
    </button>
  );
}

export function AgencyPickerEmpty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-4 text-center text-xs text-muted">{children}</p>;
}
