/** Collapse same task titles within a project on the Reports studio preview and export. */
export const DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES = true;

export const AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL = "Merge same task names";

/** URL param name for the merge option (`0` = off; absent = default on). */
export const AGENCY_REPORT_MERGE_TASKS_PARAM = "mergeTasks";

export function parseMergeSameTaskNamesParam(value: string | null): boolean {
  if (value === null || value === "") return DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "0" || trimmed === "false" || trimmed === "off") return false;
  if (trimmed === "1" || trimmed === "true" || trimmed === "on") return true;
  return DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES;
}

/** Empty when default (on) so callers can omit the URL param; `"0"` when off. */
export function serializeMergeSameTaskNamesParam(mergeSameTaskNames: boolean): string {
  return mergeSameTaskNames === DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES
    ? ""
    : mergeSameTaskNames
      ? "1"
      : "0";
}
