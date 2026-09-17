import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { AgencyPickerSearch } from "@/features/shared/pickers/agency-picker-shell";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { agencyCommandBarFilterTriggerClass } from "@/features/shared/command-bar/agency-command-bar-ui";
import {
  agencyFilterMatchingNoun,
  agencyFilterOptionAccessibleName,
  agencyFilterTriggerAccessibleName,
  agencyFilterTriggerLabel,
  filterFlatFilterOptions,
  filterGroupedFilterOptions,
  flattenFilterOptions,
  flattenMatchingFilterOptions,
  parseAgencyFilterSearchTokens,
  sortFilterOptionsByRecents,
  type AgencyFilterOption,
  type AgencyFilterOptionGroup,
} from "@/features/shared/filters/agency-filter-option-match";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { AgencyFilterOptions, type AgencyFilterRow } from "./agency-filter-options";

export type {
  AgencyFilterOption,
  AgencyFilterOptionGroup,
} from "@/features/shared/filters/agency-filter-option-match";

export type AgencyMultiSelectStatusFilter = {
  label?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
};

type AgencyMultiSelectFilterProps = {
  label: string;
  values: string[];
  options?: AgencyFilterOption[];
  groups?: AgencyFilterOptionGroup[];
  onValuesChange: (values: string[]) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
  statusFilter?: AgencyMultiSelectStatusFilter;
  /** default multiple — dashboard command bar. single closes on pick (no Select all). */
  selectionMode?: "multiple" | "single";
  triggerClassName?: string;
  contentClassName?: string;
};

const RECENT_LIMIT = 8;

function FilterRowLabel({ option, query }: { option: AgencyFilterOption; query: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      {option.avatar ? (
        <AgencyMemberAvatar
          name={option.avatar.name}
          userId={option.avatar.userId}
          avatarUrl={option.avatar.avatarUrl}
          size="sm"
          className="size-6 rounded-md"
        />
      ) : null}
      <span className="min-w-0 flex-1" aria-hidden>
        <span className="block truncate text-xs font-semibold text-highlighted">
          <AgencySearchHighlight text={option.label} query={query} />
        </span>
        {option.secondary ? (
          <span className="block truncate text-[11px] font-medium text-muted">
            <AgencySearchHighlight text={option.secondary} query={query} />
          </span>
        ) : null}
      </span>
    </span>
  );
}

function FilterCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
  accessibleName,
  onDismiss,
  dismissLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  accessibleName: string;
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  return (
    <div className="flex w-full min-w-0 items-center gap-1">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent">
        <Checkbox
          checked={indeterminate ? "indeterminate" : checked}
          onCheckedChange={(value) => onChange(value === true)}
          aria-label={accessibleName}
          className="size-3.5 [&_svg]:size-2.5"
        />
        <span className="min-w-0 flex-1" aria-hidden>
          {label}
        </span>
      </label>
      {onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel ?? `Remove ${accessibleName}`}
          className={cn(
            "mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-default hover:text-highlighted",
            agencyFocusRingClass,
          )}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDismiss();
          }}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function FilterSingleOption({
  selected,
  onSelect,
  label,
  accessibleName,
}: {
  selected: boolean;
  onSelect: () => void;
  label: ReactNode;
  accessibleName: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      role="option"
      aria-selected={selected}
      aria-label={accessibleName}
    className={cn(
      "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent",
      selected && "bg-accent",
      agencyFocusRingClass,
    )}
    >
      <Check
        className={cn("size-3.5 shrink-0", selected ? "text-highlighted" : "text-transparent")}
        aria-hidden
      />
      <span className="min-w-0 flex-1" aria-hidden>
        {label}
      </span>
    </button>
  );
}

export function AgencyMultiSelectFilter({
  label,
  values,
  options = [],
  groups,
  onValuesChange,
  disabled,
  searchPlaceholder,
  statusFilter,
  selectionMode = "multiple",
  triggerClassName,
  contentClassName,
}: AgencyMultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const selected = useMemo(() => new Set(values), [values]);
  const tokens = useMemo(() => parseAgencyFilterSearchTokens(searchTerm), [searchTerm]);
  const isSearching = tokens.length > 0;
  const isSingle = selectionMode === "single";

  const flatOptions = useMemo(() => {
    if (groups) return flattenFilterOptions(groups);
    return options;
  }, [groups, options]);

  const optionByValue = useMemo(() => {
    const map = new Map<string, AgencyFilterOption>();
    for (const option of flatOptions) {
      map.set(option.value, option);
    }
    return map;
  }, [flatOptions]);

  const matchingOptions = useMemo(() => {
    if (groups) {
      return isSearching
        ? flattenMatchingFilterOptions(groups, tokens)
        : flattenFilterOptions(groups);
    }
    return filterFlatFilterOptions(options, tokens);
  }, [groups, isSearching, options, tokens]);

  const selectedOptions = useMemo(
    () => values.map((value) => optionByValue.get(value)).filter(Boolean) as AgencyFilterOption[],
    [optionByValue, values],
  );

  const unselectedMatches = useMemo(() => {
    const remaining = matchingOptions.filter((option) => !selected.has(option.value));
    return sortFilterOptionsByRecents(remaining, recentIds);
  }, [matchingOptions, recentIds, selected]);

  const filteredGroups = useMemo(() => {
    if (!groups || isSearching) return [];
    return filterGroupedFilterOptions(groups, tokens)
      .map((group) => {
        if (group.sections) {
          return {
            ...group,
            sections: group.sections
              .map((section) => ({
                ...section,
                options: section.options.filter((option) => !selected.has(option.value)),
              }))
              .filter((section) => section.options.length > 0),
          };
        }
        return {
          ...group,
          options: (group.options ?? []).filter((option) => !selected.has(option.value)),
        };
      })
      .filter((group) => (group.sections?.length ?? 0) > 0 || (group.options?.length ?? 0) > 0);
  }, [groups, isSearching, selected, tokens]);

  const rows = useMemo(() => {
    const result: AgencyFilterRow[] = [];
    const appendOptions = (entries: AgencyFilterOption[], prefix: string) => {
      for (const option of entries) {
        result.push({ kind: "option", key: `${prefix}/${option.value}`, option });
      }
    };

    if (selectedOptions.length > 0) {
      result.push({ kind: "heading", key: "selected", label: "Selected" });
      appendOptions(selectedOptions, "selected");
    }

    if (groups && !isSearching) {
      filteredGroups.forEach((group, groupIndex) => {
        const key = `group/${groupIndex}`;
        result.push({ kind: "heading", key, label: group.groupLabel });
        if (group.sections) {
          group.sections.forEach((section, sectionIndex) => {
            const sectionKey = `${key}/${sectionIndex}`;
            result.push({ kind: "heading", key: sectionKey, label: section.sectionLabel });
            appendOptions(section.options, sectionKey);
          });
        } else appendOptions(group.options ?? [], key);
      });
      return result;
    }

    if (unselectedMatches.length > 0 && selectedOptions.length > 0) {
      result.push({ kind: "heading", key: "matches", label: isSearching ? "Matching" : "All" });
    }
    appendOptions(unselectedMatches, "matches");
    return result;
  }, [filteredGroups, groups, isSearching, selectedOptions, unselectedMatches]);

  const buttonLabel = agencyFilterTriggerLabel(label, selectedOptions);
  const triggerAccessibleName = agencyFilterTriggerAccessibleName(label, selectedOptions);
  const matchingCount = matchingOptions.length;
  const allMatchingSelected =
    matchingCount > 0 && matchingOptions.every((option) => selected.has(option.value));
  const someMatchingSelected = matchingOptions.some((option) => selected.has(option.value));
  const hasResults = selectedOptions.length > 0 || unselectedMatches.length > 0;
  const matchingNoun = agencyFilterMatchingNoun(label);
  const statusLabel =
    statusFilter?.options.find((option) => option.value === statusFilter.value)?.label ?? "Active";

  function remember(value: string) {
    setRecentIds((prev) => [value, ...prev.filter((id) => id !== value)].slice(0, RECENT_LIMIT));
  }

  function toggleValue(value: string) {
    remember(value);
    if (isSingle) {
      onValuesChange([value]);
      setOpen(false);
      setSearchTerm("");
      return;
    }
    if (selected.has(value)) {
      onValuesChange(values.filter((entry) => entry !== value));
      return;
    }
    onValuesChange([...values, value]);
  }

  function handleSelectMatching(checked: boolean) {
    const matchingIds = matchingOptions.map((option) => option.value);
    const matchingSet = new Set(matchingIds);
    if (!checked) {
      onValuesChange(values.filter((value) => !matchingSet.has(value)));
      return;
    }
    const next = new Set(values);
    for (const id of matchingIds) next.add(id);
    setRecentIds((prev) =>
      [...matchingIds, ...prev.filter((id) => !matchingSet.has(id))].slice(0, RECENT_LIMIT),
    );
    onValuesChange([...next]);
  }

  function renderOption(option: AgencyFilterOption) {
    const accessibleName = agencyFilterOptionAccessibleName(option);
    const rowLabel = <FilterRowLabel option={option} query={searchTerm} />;
    if (isSingle) {
      return (
        <FilterSingleOption
          key={option.value}
          selected={selected.has(option.value)}
          onSelect={() => toggleValue(option.value)}
          label={rowLabel}
          accessibleName={accessibleName}
        />
      );
    }
    const isPinnedSelected = selected.has(option.value);
    return (
      <FilterCheckbox
        key={option.value}
        checked={isPinnedSelected}
        onChange={() => toggleValue(option.value)}
        label={rowLabel}
        accessibleName={accessibleName}
        onDismiss={isPinnedSelected ? () => toggleValue(option.value) : undefined}
        dismissLabel={`Remove ${option.label}`}
      />
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchTerm("");
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            agencyCommandBarFilterTriggerClass,
            values.length > 0 ? "text-highlighted" : "text-muted",
            triggerClassName,
          )}
          aria-label={triggerAccessibleName}
        >
          <span className="min-w-0 flex-1 truncate">{buttonLabel}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        onEscapeKeyDown={(event) => {
          if (searchTerm) {
            event.preventDefault();
            setSearchTerm("");
          }
        }}
        className={cn(
          "min-w-72 w-md max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0",
          contentClassName,
        )}
      >
        <AgencyPickerSearch
          autoFocus
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={searchPlaceholder ?? `Search ${label.toLowerCase()}`}
          ariaLabel={`Search ${label.toLowerCase()} options`}
          inputProps={{
            type: "search",
            className: "text-sm [&::-webkit-search-cancel-button]:hidden",
          }}
        />

        {statusFilter ? (
          <div className="flex items-center justify-between gap-2 border-b border-default px-3 py-2">
            <span className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
              {statusFilter.label ?? "Show"}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-highlighted transition-colors hover:bg-default/80",
                    agencyFocusRingClass,
                  )}
                >
                  {statusLabel}
                  <ChevronDown className="size-3 text-muted" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-36">
                {statusFilter.options.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => statusFilter.onChange(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        <div className="px-1 py-1">
          {!isSingle ? (
            <div className="flex items-center gap-1">
              {matchingCount > 0 ? (
                <div className="min-w-0 flex-1">
                  <FilterCheckbox
                    checked={allMatchingSelected}
                    indeterminate={someMatchingSelected && !allMatchingSelected}
                    onChange={handleSelectMatching}
                    accessibleName={`Select ${matchingCount} matching`}
                    label={
                      <span className="truncate text-xs font-semibold text-highlighted">
                        Select {matchingCount} matching
                      </span>
                    }
                  />
                </div>
              ) : (
                <span className="flex-1" />
              )}
              {values.length > 0 ? (
                <button
                  type="button"
                  className={cn(
                    "mr-1 min-h-8 shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:bg-default hover:text-highlighted",
                    agencyFocusRingClass,
                  )}
                  onClick={() => onValuesChange([])}
                >
                  Clear
                </button>
              ) : null}
            </div>
          ) : null}

          {!hasResults ? (
            <p className="px-4 py-4 text-center text-xs text-muted">
              {isSearching ? `No matching ${matchingNoun}.` : "No options."}
            </p>
          ) : (
            <div className={cn(!isSingle && "border-t border-default")}>
              <AgencyFilterOptions
                rows={rows}
                single={isSingle}
                label={label}
                renderOption={renderOption}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
