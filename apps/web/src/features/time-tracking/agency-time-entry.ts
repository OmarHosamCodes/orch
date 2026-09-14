import { z } from "zod";

import { draftToIsoRange as draftToIsoRangeUtil } from "@/features/time-tracking/time-entry-draft";

const timeEntryDraftSchema = z.object({
  projectId: z.string(),
  taskId: z.string(),
  tagIds: z.array(z.string()),
  isBillable: z.boolean(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  durationInput: z.string(),
  description: z.string(),
});

export type TimeEntryDraft = z.infer<typeof timeEntryDraftSchema>;

export function validateTimeEntryDraft(
  draft: TimeEntryDraft,
  options: { requireTask?: boolean } = {},
): string | null {
  if (options.requireTask !== false && !draft.taskId) {
    return "Select a task.";
  }

  const range = draftToIsoRangeUtil(draft);
  if ("error" in range) return range.error;
  if (range.durationSeconds <= 0) {
    return "End time must be after start time.";
  }

  return null;
}

export type TimeEntryClockInvalid = {
  start: boolean;
  end: boolean;
  duration: boolean;
};

/** Map a draft save error to which clock fields should show aria-invalid. */
export function classifyTimeEntryEditError(error: string | null): TimeEntryClockInvalid {
  const none = { start: false, end: false, duration: false };
  if (!error || error === "Select a task.") return none;
  if (error === "Invalid start time." || error === "Start time can't be in the future.") {
    return { ...none, start: true };
  }
  if (error === "Invalid end time.") return { ...none, end: true };
  if (error === "End time must be after start time.") return { ...none, start: true, end: true };
  if (error === "Invalid duration.") return { ...none, duration: true };
  return none;
}

export { draftToIsoRangeUtil as draftToIsoRange };
