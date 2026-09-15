import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

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
  "aria-label": ariaLabel,
}: AgencySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedLabel = useMemo(() => {
    if (!value) {
      return emptyOption?.label ?? placeholder;
    }
    return options.find((option) => option.value === value)?.label ?? placeholder;
  }, [value, options, emptyOption, placeholder]);

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
          className={cn(
            "flex h-9 w-full min-w-0 items-center gap-2 rounded-xl border border-default bg-default px-2.5 text-sm font-sans",
            "transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
            value || emptyOption ? "text-foreground" : "text-muted",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" size="chooser" className="z-[60] overflow-hidden">
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
        <div className="min-h-0 max-h-48 overflow-y-auto p-1">
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
                    "flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-start transition-colors hover:bg-accent",
                    selected && "bg-accent text-accent-foreground",
                    agencyFocusRingClass,
                    "motion-reduce:transition-none",
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-sm font-medium break-words",
                      selected ? "text-primary" : "text-highlighted",
                    )}
                  >
                    <AgencySearchHighlight text={option.label} query={searchTerm} />
                  </span>
                  {option.description ? (
                    <span className="min-w-0 max-w-[45%] text-xs text-muted-foreground break-words">
                      {option.description}
                    </span>
                  ) : null}
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
