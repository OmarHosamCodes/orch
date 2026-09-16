import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { AgencyMultiSelectFilter } from "@/features/shared/filters/agency-multi-select-filter";
import { agencyCommandBarCustomRangeTriggerClass } from "@/features/shared/command-bar/agency-command-bar";
import {
  RangePresetChooser,
  rangePresetLabel,
} from "@/features/shared/command-bar/range-preset-chooser";
import { MemberProfileLeaveRangePicker } from "@/features/shared/date/member-profile-leave-range-picker";
import {
  AGENCY_REPORT_FIELD_LABELS,
  AGENCY_REPORT_FIELDS,
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import {
  AGENCY_REPORT_SHOW_WASTE_LABELS,
  AGENCY_REPORT_SHOW_WASTE_SOURCES,
  type AgencyReportShowWaste,
  type AgencyReportShowWasteSource,
} from "@/features/reports/agency-report-show-waste";
import { AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL } from "@/features/reports/agency-report-merge-tasks";
import { SavedReportsListBodyView } from "@/features/reports/agency-saved-reports-list-view";
import type { SavedReportsListBodyViewModel } from "@/features/reports/hooks/use-agency-saved-reports-list";
import type { SavedReportListItem } from "@/features/reports/agency-report-naming";
import { agencyFocusRingClass, agencyLabelClass } from "@/features/shared/agency-ui";
import type {
  AgencyFilterOption,
  AgencyFilterOptionGroup,
} from "@/features/shared/filters/agency-filter-option-match";
import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";
import type { TenureQuarterMonth } from "@/features/resourcing/tenure-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

const optionRowClass = cn(
  "flex w-full items-center justify-start gap-2.5 rounded-dense px-2 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-default/80",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

const shapeGroupClass = "overflow-hidden rounded-surface border border-default bg-default";

function scopeFilterLabel(count: number, allLabel: string, noun: string): string {
  if (count === 0) {
    return allLabel;
  }
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
}

function StudioOptionsSection({
  title,
  meta,
  action,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2.5", className)}>
      <header className="flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          <p className={agencyLabelClass}>{title}</p>
          {meta ? <div className="mt-1.5 text-[11px] leading-snug text-muted">{meta}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

function ShapeOptionGroup({
  title,
  summary,
  defaultOpen,
  selectAllLabel,
  selectAllChecked,
  onSelectAll,
  children,
}: {
  title: string;
  summary: string;
  defaultOpen: boolean;
  selectAllLabel: string;
  selectAllChecked: boolean | "indeterminate";
  onSelectAll: (enabled: boolean) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={shapeGroupClass}>
        <CollapsibleTrigger
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-2 border-b border-default px-3 py-2.5 text-left transition-colors hover:bg-elevated/60",
            !open && "border-b-0",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted transition-transform motion-reduce:transition-none",
                open ? "" : "-rotate-90",
              )}
              aria-hidden
            />
            <span className="truncate text-xs font-bold text-highlighted">{title}</span>
          </span>
          <span className="shrink-0 font-mono text-[10px] font-bold tabular-nums text-muted">
            {summary}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-1 py-1">
            <label className={optionRowClass}>
              <Checkbox
                checked={selectAllChecked}
                className="size-3.5"
                aria-label={selectAllLabel}
                onCheckedChange={(next) => onSelectAll(next === true)}
              />
              Select all
            </label>
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export type AgencyReportStudioOptionsViewProps = {
  scope: {
    clientIds: string[];
    clientOptions: AgencyFilterOption[];
    clientsLoading: boolean;
    onClientIdsChange: (ids: string[]) => void;
    projectIds: string[];
    projectFilterGroups: AgencyFilterOptionGroup[];
    projectsLoading: boolean;
    onProjectIdsChange: (ids: string[]) => void;
    memberUserIds: string[];
    memberOptions: AgencyFilterOption[];
    onMemberUserIdsChange: (ids: string[]) => void;
    rangePreset: RangePreset;
    onRangePresetChange: (preset: RangePreset) => void;
    tenureAvailable: boolean;
    tenurePeriodLabel: string | null;
    tenureQuarterLabel: string | null;
    tenureQuarterMonths: TenureQuarterMonth[];
    tenureMonthIndexes: number[];
    onTenureMonthIndexesChange: (indexes: number[]) => void;
    customFromDate: string;
    customToDate: string;
    onCustomFromChange: (value: string) => void;
    onCustomToChange: (value: string) => void;
    canReset: boolean;
    onReset: () => void;
  };
  fieldIds: AgencyReportFieldId[];
  onFieldIdsChange: (fieldIds: AgencyReportFieldId[]) => void;
  showWaste: AgencyReportShowWaste;
  onShowWasteChange: (showWaste: AgencyReportShowWaste) => void;
  mergeSameTaskNames: boolean;
  onMergeSameTaskNamesChange: (mergeSameTaskNames: boolean) => void;
  recipeName: string;
  onRecipeNameChange: (name: string) => void;
  recipeId: string | null;
  autosaveLabel: string | null;
  onSaveRecipe: () => void;
  savingRecipe: boolean;
  recipes: {
    items: SavedReportListItem[];
    vm: SavedReportsListBodyViewModel;
    onSelect: (reportId: string) => void;
    loading: boolean;
    error: string | null;
  };
  exportDisabled: boolean;
  exportPhase: "idle" | "building" | "downloading";
  onExport: (mode: "combined" | "per-client") => void;
  activityMenu: ReactNode;
};

export function AgencyReportStudioOptionsView({
  scope,
  fieldIds,
  onFieldIdsChange,
  showWaste,
  onShowWasteChange,
  mergeSameTaskNames,
  onMergeSameTaskNamesChange,
  recipeName,
  onRecipeNameChange,
  recipeId,
  autosaveLabel,
  onSaveRecipe,
  savingRecipe,
  recipes,
  exportDisabled,
  exportPhase,
  onExport,
  activityMenu,
}: AgencyReportStudioOptionsViewProps) {
  const defaultFieldIds = allAgencyReportFieldIds();
  const allFieldsSelected = areSameReportFieldSets(fieldIds, defaultFieldIds);
  const someFieldsSelected = fieldIds.length > 0 && !allFieldsSelected;
  const allWasteSelected = AGENCY_REPORT_SHOW_WASTE_SOURCES.every((source) => showWaste[source]);
  const someWasteSelected =
    !allWasteSelected && AGENCY_REPORT_SHOW_WASTE_SOURCES.some((source) => showWaste[source]);
  const wasteEnabledCount = AGENCY_REPORT_SHOW_WASTE_SOURCES.filter(
    (source) => showWaste[source],
  ).length;

  const scopeSummary = [
    scopeFilterLabel(scope.clientIds.length, "All clients", "client"),
    scopeFilterLabel(scope.projectIds.length, "All projects", "project"),
    scopeFilterLabel(scope.memberUserIds.length, "Team", "person"),
    rangePresetLabel(scope.rangePreset, scope.tenurePeriodLabel),
  ].join(" · ");

  const shapeSummary = [
    `${fieldIds.length}/${AGENCY_REPORT_FIELDS.length} columns`,
    wasteEnabledCount === 0 ? "waste hidden" : `${wasteEnabledCount} waste source${wasteEnabledCount === 1 ? "" : "s"}`,
    mergeSameTaskNames ? "merged tasks" : "split tasks",
  ].join(" · ");

  function toggleField(field: AgencyReportFieldId, enabled: boolean) {
    const next = enabled
      ? [...new Set([...fieldIds, field])]
      : fieldIds.filter((id) => id !== field);
    onFieldIdsChange(next);
  }

  function toggleShowWaste(source: AgencyReportShowWasteSource, enabled: boolean) {
    onShowWasteChange({ ...showWaste, [source]: enabled });
  }

  return (
    <div className="flex flex-col gap-8">
      <StudioOptionsSection
        title="Scope"
        meta={scopeSummary}
        action={
          scope.canReset ? (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={scope.onReset}>
              Reset
            </Button>
          ) : null
        }
      >
        <div className="flex flex-col gap-2 rounded-surface border border-default bg-default p-2">
          <AgencyMultiSelectFilter
            label="All Clients"
            values={scope.clientIds}
            options={scope.clientOptions}
            onValuesChange={scope.onClientIdsChange}
            disabled={scope.clientsLoading}
            searchPlaceholder="Search clients"
          />
          <AgencyMultiSelectFilter
            label="All Projects"
            values={scope.projectIds}
            groups={scope.projectFilterGroups}
            onValuesChange={scope.onProjectIdsChange}
            disabled={scope.projectsLoading}
            searchPlaceholder="Search projects or clients"
          />
          <AgencyMultiSelectFilter
            label="Team"
            values={scope.memberUserIds}
            options={scope.memberOptions}
            onValuesChange={scope.onMemberUserIdsChange}
            searchPlaceholder="Search people"
          />
          <RangePresetChooser
            value={scope.rangePreset}
            onChange={scope.onRangePresetChange}
            tenureAvailable={scope.tenureAvailable}
            tenurePeriodLabel={scope.tenurePeriodLabel}
            tenureQuarterLabel={scope.tenureQuarterLabel}
            tenureQuarterMonths={scope.tenureQuarterMonths}
            tenureMonthIndexes={scope.tenureMonthIndexes}
            onTenureMonthIndexesChange={scope.onTenureMonthIndexesChange}
          />
          {scope.rangePreset === "custom" ? (
            <MemberProfileLeaveRangePicker
              triggerId="agency-reports-studio-custom-range"
              startDate={scope.customFromDate}
              endDate={scope.customToDate}
              emptyLabel="Select dates"
              ariaLabel="Custom date range"
              triggerClassName={agencyCommandBarCustomRangeTriggerClass}
              onRangeChange={(next) => {
                scope.onCustomFromChange(next.startDate);
                scope.onCustomToChange(next.endDate);
              }}
            />
          ) : null}
        </div>
      </StudioOptionsSection>

      <StudioOptionsSection title="Shape" meta={shapeSummary}>
        <div className="flex flex-col gap-2">
          <ShapeOptionGroup
            title="Columns"
            summary={`${fieldIds.length}/${AGENCY_REPORT_FIELDS.length}`}
            defaultOpen
            selectAllLabel="Select all columns"
            selectAllChecked={someFieldsSelected ? "indeterminate" : allFieldsSelected}
            onSelectAll={(enabled) => onFieldIdsChange(enabled ? defaultFieldIds : [])}
          >
            {AGENCY_REPORT_FIELDS.map((field) => (
              <label key={field} className={optionRowClass}>
                <Checkbox
                  checked={fieldIds.includes(field)}
                  className="size-3.5"
                  aria-label={AGENCY_REPORT_FIELD_LABELS[field]}
                  onCheckedChange={(next) => toggleField(field, next === true)}
                />
                {AGENCY_REPORT_FIELD_LABELS[field]}
              </label>
            ))}
          </ShapeOptionGroup>

          <ShapeOptionGroup
            title="Show waste"
            summary={
              wasteEnabledCount === 0 ? "Off" : `${wasteEnabledCount}/${AGENCY_REPORT_SHOW_WASTE_SOURCES.length}`
            }
            defaultOpen={wasteEnabledCount > 0 || someWasteSelected}
            selectAllLabel="Select all waste sources"
            selectAllChecked={someWasteSelected ? "indeterminate" : allWasteSelected}
            onSelectAll={(enabled) =>
              onShowWasteChange({
                projects: enabled,
                tasks: enabled,
                entries: enabled,
              })
            }
          >
            {AGENCY_REPORT_SHOW_WASTE_SOURCES.map((source) => (
              <label key={source} className={optionRowClass}>
                <Checkbox
                  checked={showWaste[source]}
                  className="size-3.5"
                  aria-label={AGENCY_REPORT_SHOW_WASTE_LABELS[source]}
                  onCheckedChange={(next) => toggleShowWaste(source, next === true)}
                />
                {AGENCY_REPORT_SHOW_WASTE_LABELS[source]}
              </label>
            ))}
          </ShapeOptionGroup>

          <div className={shapeGroupClass}>
            <label className={cn(optionRowClass, "px-3 py-2.5")}>
              <Checkbox
                checked={mergeSameTaskNames}
                className="size-3.5"
                aria-label={AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL}
                onCheckedChange={(next) => onMergeSameTaskNamesChange(next === true)}
              />
              {AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL}
            </label>
          </div>
        </div>
      </StudioOptionsSection>

      <StudioOptionsSection
        title="Recipes"
        action={activityMenu}
      >
        <div className="space-y-2">
          <Label htmlFor="agency-report-recipe-name" className="sr-only">
            Recipe name
          </Label>
          <div className="flex gap-2">
            <Input
              id="agency-report-recipe-name"
              value={recipeName}
              onChange={(event) => onRecipeNameChange(event.target.value)}
              placeholder="Untitled report"
              className="h-9 min-w-0 flex-1 rounded-xl border-default bg-default text-sm"
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={onSaveRecipe}
              disabled={savingRecipe}
            >
              Save
            </Button>
          </div>
          {autosaveLabel ? <p className="px-0.5 text-[11px] text-muted">{autosaveLabel}</p> : null}
        </div>
        <div className={cn(shapeGroupClass, "overflow-hidden")}>
          {recipes.loading ? (
            <p className="px-3 py-4 text-xs text-muted">Loading recipes…</p>
          ) : recipes.error ? (
            <p className="px-3 py-4 text-xs text-muted">{recipes.error}</p>
          ) : (
            <SavedReportsListBodyView
              items={recipes.items}
              onSelect={recipes.onSelect}
              activeReportId={recipeId}
              vm={recipes.vm}
              compact
            />
          )}
        </div>
      </StudioOptionsSection>

      <StudioOptionsSection title="Export">
        <div className="flex flex-col gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" className="w-full" disabled={exportDisabled}>
                {exportPhase === "idle" ? "Export Excel" : "Exporting…"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuItem onClick={() => onExport("combined")}>Combined file</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("per-client")}>
                One file per client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="px-0.5 text-[11px] leading-snug text-muted">
            Combined workbook or one file per client. Preview updates as you change Scope and Shape.
          </p>
        </div>
      </StudioOptionsSection>
    </div>
  );
}
