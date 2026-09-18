import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import type { TenureQuarterMonth } from "@/features/resourcing/tenure-utils";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { agencyCommandBarFilterTriggerClass } from "@/features/shared/command-bar/agency-command-bar-ui";
import { Checkbox } from "@/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import { cn } from "@/lib/utils";

export type RangePreset = "tenure" | "today" | "week" | "month" | "last30" | "custom";

const RANGE_LABEL: Record<RangePreset, string> = {
  tenure: "Tenure",
  today: "Today",
  week: "This week",
  month: "This month",
  last30: "Last 30 days",
  custom: "Custom",
};

export function rangePresetLabel(preset: RangePreset, tenurePeriodLabel?: string | null): string {
  if (preset === "tenure") {
    return tenurePeriodLabel?.trim() || RANGE_LABEL.tenure;
  }
  return RANGE_LABEL[preset];
}

export function rangePresets(tenureAvailable: boolean): RangePreset[] {
  // Tenure supersedes "This month" — never offer both.
  return tenureAvailable
    ? ["tenure", "today", "week", "last30", "custom"]
    : ["today", "week", "month", "last30", "custom"];
}

const filterTriggerClass = agencyCommandBarFilterTriggerClass;

const filterOptionButtonClass = cn(
  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors hover:bg-accent",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

function normalizeTenureMonthIndexes(next: number[]): number[] {
  const unique = [...new Set(next)]
    .filter((index): index is 0 | 1 | 2 => index === 0 || index === 1 || index === 2)
    .sort((left, right) => left - right);
  return unique.length === 3 ? [] : unique;
}

export function RangePresetChooser({
  value,
  onChange,
  tenureAvailable,
  tenurePeriodLabel,
  tenureQuarterLabel,
  tenureQuarterMonths,
  tenureMonthIndexes,
  onTenureMonthIndexesChange,
}: {
  value: RangePreset;
  onChange: (preset: RangePreset) => void;
  tenureAvailable: boolean;
  tenurePeriodLabel?: string | null;
  tenureQuarterLabel?: string | null;
  tenureQuarterMonths: TenureQuarterMonth[];
  tenureMonthIndexes: number[];
  onTenureMonthIndexesChange: (monthIndexes: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const presets = rangePresets(tenureAvailable);
  const allQuarterSelected = tenureMonthIndexes.length === 0;

  function selectTenureMonths(next: number[]) {
    onTenureMonthIndexesChange(normalizeTenureMonthIndexes(next));
    onChange("tenure");
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(filterTriggerClass, "text-highlighted")}
          aria-label="Time range"
        >
          <span className="min-w-0 flex-1 truncate">
            {rangePresetLabel(value, tenurePeriodLabel)}
          </span>
          <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 p-1">
        {presets.map((preset) => {
          const selected = preset === value;

          if (preset === "tenure") {
            return (
              <DropdownMenuSub key={preset}>
                <DropdownMenuSubTrigger
                  className={cn(
                    filterOptionButtonClass,
                    "data-open:bg-accent",
                    selected && "bg-accent text-accent-foreground data-open:bg-accent",
                  )}
                  onClick={() => {
                    selectTenureMonths([]);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {rangePresetLabel(preset, tenureQuarterLabel ?? tenurePeriodLabel)}
                  </span>
                  {selected ? (
                    <Check className="size-3.5 shrink-0" aria-hidden />
                  ) : (
                    <span className="size-3.5 shrink-0" aria-hidden />
                  )}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44 p-1" sideOffset={6}>
                  <div
                    className="flex flex-col gap-0.5"
                    onPointerDown={(event) => event.preventDefault()}
                  >
                    <RadioGroup
                      value={allQuarterSelected ? "all" : ""}
                      onValueChange={(next) => {
                        if (next === "all") selectTenureMonths([]);
                      }}
                      className="gap-0.5"
                    >
                      <label
                        className={cn(
                          filterOptionButtonClass,
                          "justify-start gap-2.5",
                          allQuarterSelected && "bg-accent text-accent-foreground",
                        )}
                      >
                        <RadioGroupItem value="all" className="size-3.5" aria-label="All Quarter" />
                        <span className="min-w-0 flex-1 truncate">All Quarter</span>
                      </label>
                    </RadioGroup>

                    {tenureQuarterMonths.map((month) => {
                      const checked = tenureMonthIndexes.includes(month.index);
                      return (
                        <label
                          key={month.index}
                          className={cn(
                            filterOptionButtonClass,
                            "justify-start gap-2.5",
                            checked && "bg-accent text-accent-foreground",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            className="size-3.5"
                            aria-label={month.label}
                            onCheckedChange={(next) => {
                              const enabled = next === true;
                              selectTenureMonths(
                                enabled
                                  ? [...tenureMonthIndexes, month.index]
                                  : tenureMonthIndexes.filter((index) => index !== month.index),
                              );
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate">{month.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          }

          return (
            <button
              key={preset}
              type="button"
              className={cn(
                filterOptionButtonClass,
                selected && "bg-accent text-accent-foreground",
              )}
              onClick={() => {
                onChange(preset);
                setOpen(false);
              }}
            >
              <span className="truncate">{rangePresetLabel(preset, tenurePeriodLabel)}</span>
              {selected ? (
                <Check className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <span className="size-3.5 shrink-0" aria-hidden />
              )}
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
