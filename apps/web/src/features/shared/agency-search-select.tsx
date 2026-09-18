import { useMemo, useState, type ReactNode } from "react";

import { agencyListSearchMatches } from "@/features/shared/agency-list-search";
import {
  AgencyPickerEmpty,
  AgencyPickerRow,
  AgencyPickerSearch,
  AgencyPickerTrigger,
} from "@/features/shared/pickers/agency-picker-shell";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

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
        <AgencyPickerTrigger
          id={id}
          variant={variant}
          glyph={selectedGlyph}
          label={selectedLabel}
          open={open}
          filled={Boolean(value || emptyOption)}
          disabled={disabled}
          aria-label={ariaLabel}
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent align="start" size="chooser" className="z-[60] overflow-hidden p-0">
        <AgencyPickerSearch
          autoFocus
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={searchPlaceholder}
        />
        <div className="min-h-0 max-h-64 overflow-y-auto p-1">
          {filteredOptions.length === 0 ? (
            <AgencyPickerEmpty>No matches.</AgencyPickerEmpty>
          ) : (
            filteredOptions.map((option) => (
              <AgencyPickerRow
                key={option.value || "__empty"}
                glyph={option.glyph}
                label={option.label}
                query={searchTerm}
                description={option.description}
                selected={option.value === value}
                onSelect={() => handleSelect(option.value)}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
