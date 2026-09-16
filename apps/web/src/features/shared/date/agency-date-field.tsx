import { CalendarDays, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  agencyFocusRingClass,
  agencyTimeEntryIconButtonClass,
  agencyTimeTrackerDateTriggerClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Calendar } from "@/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

/** Parse `YYYY-MM-DD` as a local calendar day (avoid UTC parseISO shifts). */
export function parseAgencyDateKey(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatAgencyDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatAgencyDisplayDay(value: string, style: "long" | "short" = "long"): string {
  const date = parseAgencyDateKey(value);
  if (!date) return value || "Pick a date";
  return date.toLocaleDateString(
    undefined,
    style === "long"
      ? { weekday: "short", month: "short", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  );
}

type AgencyDateFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** full: form field · label: tracker text trigger · icon: ghost icon button. */
  variant?: "full" | "label" | "icon";
  /** Custom trigger content for the label variant (e.g. "Today"). */
  label?: ReactNode;
  placeholder?: string;
  displayStyle?: "long" | "short";
  align?: "start" | "center" | "end";
  /** When set and a date is chosen, show an inline affordance to clear it. */
  onClear?: () => void;
  "aria-label": string;
};

export function AgencyDateField({
  id,
  value,
  onChange,
  disabled = false,
  className,
  variant = "full",
  label,
  placeholder = "Pick a date",
  displayStyle = "long",
  align = "start",
  onClear,
  "aria-label": ariaLabel,
}: AgencyDateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseAgencyDateKey(value);
  const clearable = Boolean(selected && onClear);

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={variant === "full" ? "outline" : "ghost"}
          size={variant === "icon" ? "icon" : variant === "label" ? "lg" : undefined}
          id={id}
          disabled={disabled}
          aria-label={variant === "label" && typeof label === "string" ? `${ariaLabel}, ${label}` : ariaLabel}
          aria-expanded={open}
          className={cn(
            variant === "full" &&
              "h-10 w-full justify-start gap-2 px-3 font-normal transition-[transform,background-color] duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
            variant === "label" && agencyTimeTrackerDateTriggerClass,
            variant === "icon" && agencyTimeEntryIconButtonClass,
            clearable && "relative pr-8",
            agencyFocusRingClass,
            className,
          )}
        >
          {variant === "label" && label ? (
            label
          ) : variant === "icon" && !label ? (
            <CalendarDays className="size-4" aria-hidden />
          ) : (
            <>
              <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate text-sm text-foreground">
                {selected ? formatAgencyDisplayDay(value, displayStyle) : placeholder}
              </span>
            </>
          )}
          {clearable ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-muted hover:text-foreground"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClear?.();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onClear?.();
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <X className="size-3.5" aria-hidden />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0" sideOffset={8}>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected ?? new Date()}
          onSelect={(next) => {
            if (!next) return;
            onChange(formatAgencyDateKey(next));
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
