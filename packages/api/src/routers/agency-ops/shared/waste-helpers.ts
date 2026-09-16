import { sql } from "drizzle-orm";
import { agencyOpsProject, agencyOpsProjectTask, agencyOpsTimeEntry } from "@orch/db/schema";

/** True when a label contains "waste" as a word, any casing/format. */
export function isWasteLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return /\bwaste\b/i.test(label);
}

/** Waste = entry isWaste flag, task isWaste flag, or task/project name contains "waste". */
export function isReportEntryWaste(
  taskIsWaste: boolean | null | undefined,
  taskTitle: string | null | undefined,
  projectName: string | null | undefined,
  entryIsWaste?: boolean | null,
): boolean {
  if (entryIsWaste === true) return true;
  if (taskIsWaste === true) return true;
  return isWasteLabel(taskTitle) || isWasteLabel(projectName);
}

export function resolveEntryWaste(row: {
  isWaste?: boolean | null;
  taskIsWaste?: boolean | null;
  taskTitle?: string | null;
  projectName?: string | null;
}): boolean {
  return isReportEntryWaste(row.taskIsWaste, row.taskTitle, row.projectName, row.isWaste);
}

/** SQL equivalent of `isReportEntryWaste` (flags + word-boundary "waste"). */
export const reportEntryIsWasteSql = sql<boolean>`(
  ${agencyOpsTimeEntry.isWaste} = true
  OR COALESCE(${agencyOpsProjectTask.isWaste}, false) = true
  OR COALESCE(${agencyOpsProjectTask.title}, '') ~* '\\ywaste\\y'
  OR ${agencyOpsProject.name} ~* '\\ywaste\\y'
)`;
