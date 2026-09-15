import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";

export type AgencyTimeRangeCanResetInput = {
  rangePreset: RangePreset;
  defaultRangePreset: RangePreset;
  tenureMonthIndexes: number[];
  defaultTenureMonthIndexes: number[];
  clientIds: string[];
  projectIds: string[];
  memberUserIds: string[];
  customFromDate: string;
  customToDate: string;
  defaultCustomFromDate: string;
  defaultCustomToDate: string;
};

function sameNumberList(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function agencyTimeRangeCanReset(input: AgencyTimeRangeCanResetInput): boolean {
  if (input.rangePreset !== input.defaultRangePreset) return true;
  if (input.clientIds.length > 0) return true;
  if (input.projectIds.length > 0) return true;
  if (input.memberUserIds.length > 0) return true;
  if (!sameNumberList(input.tenureMonthIndexes, input.defaultTenureMonthIndexes)) return true;
  return (
    input.rangePreset === "custom" &&
    (input.customFromDate !== input.defaultCustomFromDate ||
      input.customToDate !== input.defaultCustomToDate)
  );
}
