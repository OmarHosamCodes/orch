import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { agencyCommandBarFilterTriggerClass } from "@/features/shared/command-bar/agency-command-bar-ui";
import { cn } from "@/lib/utils";

export type AgencyFilterOption = {
  value: string;
  label: string;
  searchText?: string;
};

type AgencyFilterOptionSection = {
  sectionLabel: string;
  options: AgencyFilterOption[];
};

export type AgencyFilterOptionGroup = {
  groupLabel: string;
  options?: AgencyFilterOption[];
  sections?: AgencyFilterOptionSection[];
};

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

function optionMatchesQuery(option: AgencyFilterOption, query: string): boolean {
  const haystack = cn(option.label, option.searchText ?? "").toLowerCase();
  return haystack.includes(query);
}

function filterFlatOptions(options: AgencyFilterOption[], query: string): AgencyFilterOption[] {
  if (!query) return options;
  return options.filter((option) => optionMatchesQuery(option, query));
}

function filterGroupedOptions(
  groups: AgencyFilterOptionGroup[],
  query: string,
): AgencyFilterOptionGroup[] {
  if (!query) return groups;

  return groups
    .map((group) => {
      if (group.groupLabel.toLowerCase().includes(query)) {
        return group;
      }

      if (group.sections) {
        const sections = group.sections
          .map((section) => {
            if (section.sectionLabel.toLowerCase().includes(query)) {
              return section;
            }
            const options = section.options.filter((option) => optionMatchesQuery(option, query));
            return options.length > 0 ? { ...section, options } : null;
          })
          .filter((section): section is AgencyFilterOptionSection => Boolean(section));

        return sections.length > 0 ? { ...group, sections } : null;
      }

      const options = (group.options ?? []).filter((option) => optionMatchesQuery(option, query));
      return options.length > 0 ? { ...group, options } : null;
    })
    .filter((group): group is AgencyFilterOptionGroup => Boolean(group));
}

function FilterCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors hover:bg-default/80",
        agencyFocusRingClass,
      )}
    >
      <Checkbox
        checked={indeterminate ? "indeterminate" : checked}
        onCheckedChange={(value) => onChange(value === true)}
        className="size-3.5 [&_svg]:size-2.5"
      />
      <span className={cn("min-w-0 flex-1 truncate", checked ? "text-highlighted" : "text-muted")}>
        {label}
      </span>
    </label>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <p className="min-w-0 truncate px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
      {children}
    </p>
  );
}

function FilterSingleOption({
  selected,
  onSelect,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  label: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      role="option"
      aria-selected={selected}
      className={cn(
        "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors hover:bg-default/80",
        agencyFocusRingClass,
      )}
    >
      <Check
        className={cn("size-3.5 shrink-0", selected ? "text-highlighted" : "text-transparent")}
        aria-hidden
      />
      <span className={cn("min-w-0 flex-1 truncate", selected ? "text-highlighted" : "text-muted")}>
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
  const selected = new Set(values);
  const query = searchTerm.trim().toLowerCase();
  const isSingle = selectionMode === "single";

  const flatOptions = useMemo(() => {
    if (groups) {
      return groups.flatMap((group) => [
        ...(group.options ?? []),
        ...(group.sections?.flatMap((section) => section.options) ?? []),
      ]);
    }
    return options;
  }, [groups, options]);

  const filteredFlatOptions = useMemo(
    () => filterFlatOptions(flatOptions, query),
    [flatOptions, query],
  );
  const filteredGroups = useMemo(
    () => (groups ? filterGroupedOptions(groups, query) : []),
    [groups, query],
  );

  const visibleOptions = groups
    ? filteredGroups.flatMap((group) => [
        ...(group.options ?? []),
        ...(group.sections?.flatMap((section) => section.options) ?? []),
      ])
    : filteredFlatOptions;

  const selectedOptions = flatOptions.filter((option) => selected.has(option.value));
  const buttonLabel =
    selectedOptions.length === 0
      ? label
      : selectedOptions.length === 1
        ? selectedOptions[0]!.label
        : `${selectedOptions.length} selected`;

  const allVisibleSelected =
    visibleOptions.length > 0 && visibleOptions.every((option) => selected.has(option.value));
  const someVisibleSelected = visibleOptions.some((option) => selected.has(option.value));

  function toggleValue(value: string) {
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

  function handleSelectAll(checked: boolean) {
    const visibleIds = new Set(visibleOptions.map((option) => option.value));
    if (!checked) {
      onValuesChange(values.filter((value) => !visibleIds.has(value)));
      return;
    }
    const next = new Set(values);
    for (const id of visibleIds) {
      next.add(id);
    }
    onValuesChange([...next]);
  }

  function renderOption(option: AgencyFilterOption) {
    if (isSingle) {
      return (
        <FilterSingleOption
          key={option.value}
          selected={selected.has(option.value)}
          onSelect={() => toggleValue(option.value)}
          label={option.label}
        />
      );
    }
    return (
      <FilterCheckbox
        key={option.value}
        checked={selected.has(option.value)}
        onChange={() => toggleValue(option.value)}
        label={option.label}
      />
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchTerm("");
    }
  }

  const hasResults = visibleOptions.length > 0;
  const statusLabel =
    statusFilter?.options.find((option) => option.value === statusFilter.value)?.label ?? "Active";

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
          aria-label={label}
        >
          <span className="min-w-0 flex-1 truncate">{buttonLabel}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0", contentClassName)}
      >
        <div className="border-b border-default p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              aria-label={`Search ${label.toLowerCase()} options`}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder ?? `Search ${label.toLowerCase()}`}
              className={cn(
                "h-9 rounded-lg border-default bg-default pl-8 text-sm",
                agencyInputPlaceholderClass,
              )}
            />
          </div>
        </div>

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

        <div
          className="max-h-72 overflow-x-hidden overflow-y-auto px-1 py-1"
          role={isSingle ? "listbox" : undefined}
          aria-label={isSingle ? label : undefined}
        >
          {!isSingle ? (
            <FilterCheckbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected && !allVisibleSelected}
              onChange={handleSelectAll}
              label="Select all"
            />
          ) : null}

          {!hasResults ? (
            <p className="px-4 py-4 text-center text-xs text-muted">
              {query ? "No matching options." : "No options."}
            </p>
          ) : groups ? (
            filteredGroups.map((group) => (
              <div key={group.groupLabel} className="min-w-0">
                <SectionHeader>{group.groupLabel}</SectionHeader>

                {group.sections
                  ? group.sections.map((section) => (
                      <div key={`${group.groupLabel}-${section.sectionLabel}`}>
                        <SectionHeader>{section.sectionLabel}</SectionHeader>
                        {section.options.map((option) => renderOption(option))}
                      </div>
                    ))
                  : (group.options ?? []).map((option) => renderOption(option))}
              </div>
            ))
          ) : (
            filteredFlatOptions.map((option) => renderOption(option))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
