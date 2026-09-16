import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { agencyListSearchMatches } from "@/features/shared/agency-list-search";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencySearchSelectOption = {
  value: string;
  label: string;
  description?: string;
  glyph?: ReactNode;
};

type AgencySearchSelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: AgencySearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyOption?: AgencySearchSelectOption;
  disabled?: boolean;
  className?: string;
  variant?: "field" | "chip";
  "aria-label"?: string;
};

export function AgencySearchSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyOption,
  disabled = false,
  className,
  variant = "field",
  "aria-label": ariaLabel,
}: AgencySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const isChip = variant === "chip";

  const selectedOption = useMemo(() => {
    if (!value) return emptyOption ?? null;
    return options.find((option) => option.value === value) ?? emptyOption ?? null;
  }, [value, options, emptyOption]);

  const selectedLabel = selectedOption?.label ?? placeholder;
  const selectedGlyph = selectedOption?.glyph;

  const filteredOptions = useMemo(() => {
    const list = emptyOption ? [emptyOption, ...options] : options;
    if (!searchTerm.trim()) return list;
    return list.filter((option) =>
      agencyListSearchMatches(searchTerm, option.label, option.description ?? ""),
    );
  }, [options, emptyOption, searchTerm]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setSearchTerm("");
  }

  function handleSelect(nextValue: string) {
    onValueChange(nextValue);
    setOpen(false);
    setSearchTerm("");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            "flex min-w-0 items-center gap-1.5 font-sans",
            "transition-[color,background-color,transform] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
            "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
            isChip
              ? "h-8 w-fit max-w-full rounded-full border border-default bg-elevated px-2 text-xs font-semibold"
              : "h-9 w-full rounded-xl border border-default bg-default px-2.5 text-sm",
            value || emptyOption ? "text-foreground" : "text-muted",
            className,
          )}
        >
          {selectedGlyph ? (
            <span className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
              {selectedGlyph}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
          <ChevronDown
            className={cn(
              "shrink-0 opacity-70 transition-transform duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
              open && "rotate-180",
              isChip ? "size-3" : "size-3.5",
              "motion-reduce:transition-none",
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" size="chooser" className="z-[60] overflow-hidden p-0">
        <div className="shrink-0 border-b border-border p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className={cn(
                "h-9 rounded-lg border-default bg-default pl-8 font-sans text-base md:text-sm",
                agencyInputPlaceholderClass,
              )}
            />
          </div>
        </div>
        <div className="min-h-0 max-h-64 overflow-y-auto p-1">
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted">No matches.</p>
          ) : (
            filteredOptions.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value || "__empty"}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-start",
                    "transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] hover:bg-accent",
                    selected && "bg-accent text-accent-foreground",
                    agencyFocusRingClass,
                    "motion-reduce:transition-none",
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.glyph ? (
                    <span className="inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full">
                      {option.glyph}
                    </span>
                  ) : null}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={cn(
                        "min-w-0 text-sm font-medium break-words",
                        selected ? "text-primary" : "text-highlighted",
                      )}
                    >
                      <AgencySearchHighlight text={option.label} query={searchTerm} />
                    </span>
                    {option.description ? (
                      <span className="text-[11px] text-muted-foreground break-words">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {selected ? (
                    <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
