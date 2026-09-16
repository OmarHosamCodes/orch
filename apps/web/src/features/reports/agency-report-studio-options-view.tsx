import type { ReactNode } from "react";

import { AgencyMultiSelectFilter } from "@/features/shared/filters/agency-multi-select-filter";
import { agencyCommandBarCustomRangeTriggerClass } from "@/features/shared/command-bar/agency-command-bar";
import { RangePresetChooser } from "@/features/shared/command-bar/range-preset-chooser";
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
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import type {
  AgencyFilterOption,
  AgencyFilterOptionGroup,
} from "@/features/shared/filters/agency-filter-option-match";
import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";
import type { TenureQuarterMonth } from "@/features/resourcing/tenure-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

const optionRowClass = cn(
  "flex w-full items-center justify-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-default/80",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

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
    <div className="flex flex-col gap-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-highlighted">Scope</h2>
        <div className="flex flex-col gap-2">
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
          {scope.canReset ? (
            <Button type="button" variant="secondary" size="sm" onClick={scope.onReset}>
              Reset scope
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-highlighted">Shape</h2>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted">Columns</p>
          <label className={optionRowClass}>
            <Checkbox
              checked={someFieldsSelected ? "indeterminate" : allFieldsSelected}
              className="size-3.5"
              aria-label="Select all columns"
              onCheckedChange={(next) => onFieldIdsChange(next === true ? defaultFieldIds : [])}
            />
            Select all
          </label>
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
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted">Show waste</p>
          <label className={optionRowClass}>
            <Checkbox
              checked={someWasteSelected ? "indeterminate" : allWasteSelected}
              className="size-3.5"
              aria-label="Select all waste sources"
              onCheckedChange={(next) =>
                onShowWasteChange({
                  projects: next === true,
                  tasks: next === true,
                  entries: next === true,
                })
              }
            />
            Select all
          </label>
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
        </div>
        <label className={optionRowClass}>
          <Checkbox
            checked={mergeSameTaskNames}
            className="size-3.5"
            aria-label={AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL}
            onCheckedChange={(next) => onMergeSameTaskNamesChange(next === true)}
          />
          {AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL}
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-highlighted">Recipes</h2>
          {activityMenu}
        </div>
        <div className="space-y-2">
          <Label htmlFor="agency-report-recipe-name" className="text-xs">
            Name
          </Label>
          <Input
            id="agency-report-recipe-name"
            value={recipeName}
            onChange={(event) => onRecipeNameChange(event.target.value)}
            placeholder="Untitled report"
            className="h-9 rounded-xl border-default bg-default text-sm"
          />
          {autosaveLabel ? <p className="text-xs text-muted">{autosaveLabel}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onSaveRecipe} disabled={savingRecipe}>
              Save recipe
            </Button>
          </div>
        </div>
        {recipes.loading ? (
          <p className="text-xs text-muted">Loading recipes…</p>
        ) : recipes.error ? (
          <p className="text-xs text-muted">{recipes.error}</p>
        ) : (
          <SavedReportsListBodyView
            items={recipes.items}
            onSelect={recipes.onSelect}
            activeReportId={recipeId}
            vm={recipes.vm}
            compact
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-highlighted">Export</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" disabled={exportDisabled}>
              {exportPhase === "idle" ? "Export Excel" : "Exporting…"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onExport("combined")}>Combined file</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("per-client")}>
              One file per client
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>
    </div>
  );
}
