import type { AgencyProjectTask, TaskStatus } from "@/features/task-management/agency-work";

export function statusLabel(status: TaskStatus | undefined): string {
  if (!status) return "Open";
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    case "archived":
      return "Archived";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

type ResolveTaskDisplayStatusInput = {
  task: Pick<AgencyProjectTask, "status" | "viewerStatus">;
  readOnly?: boolean;
};

function resolveTaskDisplayStatus({
  task,
  readOnly = false,
}: ResolveTaskDisplayStatusInput): TaskStatus {
  if (readOnly) return "done";
  if (task.status === "in_progress" || task.viewerStatus === "in_progress") {
    return "in_progress";
  }
  if (task.status === "archived") return "archived";
  return "open";
}

if (import.meta.env.DEV) {
  console.assert(
    resolveTaskDisplayStatus({
      task: { status: "open", viewerStatus: "in_progress" },
    }) === "in_progress",
  );
  console.assert(
    resolveTaskDisplayStatus({
      task: { status: "open", viewerStatus: "in_progress" },
      readOnly: true,
    }) === "done",
  );
}
