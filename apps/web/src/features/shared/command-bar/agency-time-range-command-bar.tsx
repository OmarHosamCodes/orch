import { useEffect, useState, type ReactNode } from "react";

import {
  AgencyCommandBarActions,
  AgencyCommandBarResetButton,
  agencyCommandBarShellClass,
} from "@/features/shared/command-bar/agency-command-bar-ui";
import {
  AgencyMultiSelectFilter,
  type AgencyFilterOptionGroup,
} from "@/features/shared/filters/agency-multi-select-filter";
import { MemberProfileLeaveRangePicker } from "@/features/shared/date/member-profile-leave-range-picker";
import {
  RangePresetChooser,
  type RangePreset,
} from "@/features/shared/command-bar/range-preset-chooser";
import { Button } from "@/ui/button";
import type { TenureQuarterMonth } from "@/features/resourcing/tenure-utils";
import { cn } from "@/lib/utils";
export { rangePresetLabel, rangePresets } from "@/features/shared/command-bar/range-preset-chooser";

type AgencyTimeRangeCommandBarProps = {
  rangePreset: RangePreset;
  onRangePresetChange: (preset: RangePreset) => void;
  customFromDate: string;
  onCustomFromChange: (value: string) => void;
  customToDate: string;
  onCustomToChange: (value: string) => void;
  clients?: Array<{ id: string; name: string }>;
  clientsLoading?: boolean;
  clientIds?: string[];
  onClientIdsChange?: (clientIds: string[]) => void;
  projectIds: string[];
  onProjectIdsChange: (projectIds: string[]) => void;
  memberUserIds: string[];
  onMemberUserIdsChange: (memberUserIds: string[]) => void;
  projectFilterGroups: AgencyFilterOptionGroup[];
  onApply: () => void;
  hasPendingChanges: boolean;
  onReset: () => void;
  defaultRangePreset: RangePreset;
  tenureAvailable: boolean;
  tenurePeriodLabel?: string | null;
  tenureQuarterLabel?: string | null;
  tenureQuarterMonths?: TenureQuarterMonth[];
  tenureMonthIndexes?: number[];
  onTenureMonthIndexesChange?: (monthIndexes: number[]) => void;
  members: Array<{ userId: string; userName: string; avatar?: string | null }>;
  projectsLoading?: boolean;
  trailingActions?: ReactNode;
  shellClassName?: string;
};

export function AgencyTimeRangeCommandBar({
  rangePreset,
  onRangePresetChange,
  customFromDate,
  onCustomFromChange,
  customToDate,
  onCustomToChange,
  clients,
  clientsLoading,
  clientIds = [],
  onClientIdsChange,
  projectIds,
  onProjectIdsChange,
  memberUserIds,
  onMemberUserIdsChange,
  projectFilterGroups,
  onApply,
  hasPendingChanges,
  onReset,
  defaultRangePreset,
  tenureAvailable,
  tenurePeriodLabel = null,
  tenureQuarterLabel = null,
  tenureQuarterMonths = [],
  tenureMonthIndexes = [],
  onTenureMonthIndexesChange,
  members,
  projectsLoading,
  trailingActions,
  shellClassName,
}: AgencyTimeRangeCommandBarProps) {
  const showClientFilter = Boolean(clients && onClientIdsChange);
  const [applyPulse, setApplyPulse] = useState(false);

  useEffect(() => {
    if (!applyPulse) return;
    const timer = window.setTimeout(() => setApplyPulse(false), 220);
    return () => window.clearTimeout(timer);
  }, [applyPulse]);

  function handleApplyClick() {
    onApply();
    setApplyPulse(true);
  }

  const hasActiveFilters = Boolean(
    rangePreset !== defaultRangePreset ||
    tenureMonthIndexes.length > 0 ||
    clientIds.length > 0 ||
    projectIds.length > 0 ||
    memberUserIds.length > 0,
  );

  const clientOptions = clients?.map((client) => ({ value: client.id, label: client.name })) ?? [];
  const memberSelectOptions = members.map((member) => ({
    value: member.userId,
    label: member.userName,
  }));

  return (
    <div className={cn(agencyCommandBarShellClass, shellClassName)}>
      {showClientFilter ? (
        <AgencyMultiSelectFilter
          label="All Clients"
          values={clientIds}
          options={clientOptions}
          onValuesChange={onClientIdsChange!}
          disabled={clientsLoading}
          searchPlaceholder="Search clients"
        />
      ) : null}
      <AgencyMultiSelectFilter
        label="All Projects"
        values={projectIds}
        groups={projectFilterGroups}
        onValuesChange={onProjectIdsChange}
        disabled={projectsLoading}
        searchPlaceholder="Search projects or clients"
      />
      <AgencyMultiSelectFilter
        label="Team"
        values={memberUserIds}
        options={memberSelectOptions}
        onValuesChange={onMemberUserIdsChange}
        searchPlaceholder="Search users or groups"
      />
      <RangePresetChooser
        value={rangePreset}
        onChange={onRangePresetChange}
        tenureAvailable={tenureAvailable}
        tenurePeriodLabel={tenurePeriodLabel}
        tenureQuarterLabel={tenureQuarterLabel}
        tenureQuarterMonths={tenureQuarterMonths}
        tenureMonthIndexes={tenureMonthIndexes}
        onTenureMonthIndexesChange={onTenureMonthIndexesChange ?? (() => undefined)}
      />

      {rangePreset === "custom" ? (
        <MemberProfileLeaveRangePicker
          triggerId="agency-dashboard-custom-range"
          startDate={customFromDate}
          endDate={customToDate}
          emptyLabel="Select dates"
          ariaLabel="Custom date range"
          triggerClassName="h-9 min-h-9 w-auto max-w-[22rem] py-1.5 text-xs font-semibold"
          onRangeChange={(next) => {
            onCustomFromChange(next.startDate);
            onCustomToChange(next.endDate);
          }}
        />
      ) : null}

      <AgencyCommandBarActions>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasPendingChanges}
          onClick={handleApplyClick}
          className={cn(
            "transition-[box-shadow,transform] duration-200 ease-out motion-reduce:transition-none",
            applyPulse && "shadow-[0_0_0_3px_oklch(0.488_0.243_264.376_/_0.22)]",
          )}
        >
          Apply
        </Button>
        {hasActiveFilters ? <AgencyCommandBarResetButton onClick={onReset} /> : null}
        {trailingActions}
      </AgencyCommandBarActions>
    </div>
  );
}
