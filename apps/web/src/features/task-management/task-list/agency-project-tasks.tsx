import { AlertTriangle, ListChecks, ListPlus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AgencyTaskGroupRow } from "@/features/task-management/task-list/agency-task-group-row";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { SurfaceShimmer } from "@/ui/skeleton";
import { useAgencyProjectTasksQuery } from "@/features/shared/agency-queries";
import { groupTasksByProjectTitle } from "@/features/task-management/agency-task-utils";
import { teamDetailQueryOptions } from "@/features/team/team-queries";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { selectIsCreatingTask, useAgencyOpsStore } from "@/features/shared/stores/agency-ops";

type AgencyProjectTasksProps = {
  teamId: string;
  projectId: string;
  projectName: string;
  focusTaskId?: string;
  isTrashed?: boolean;
};

export function AgencyProjectTasks({
  teamId,
  projectId,
  projectName,
  focusTaskId,
  isTrashed = false,
}: AgencyProjectTasksProps) {
  const agencyOps = useAgencyOpsStore();
  const isCreatingTask = useAgencyOpsStore(selectIsCreatingTask);
  const deletingTaskIds = useAgencyOpsStore((s) => s.deletingTaskIds);
  const pendingTaskIds = useAgencyOpsStore((s) => s.pendingTaskIds);
  const [titleDraft, setTitleDraft] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(focusTaskId ?? "");

  const tasksQuery = useAgencyProjectTasksQuery(teamId, { projectId });
  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });
  const canEditTaskRate = teamQuery.data?.role === "owner" && !isTrashed;

  const tasks = tasksQuery.data?.items ?? [];
  const taskGroups = groupTasksByProjectTitle(tasks);

  useEffect(() => {
    if (focusTaskId) setSelectedTaskId(focusTaskId);
  }, [focusTaskId]);

  useEffect(() => {
    if (!focusTaskId || tasksQuery.isPending) return;
    const row = document.querySelector<HTMLElement>(`[data-task-id='${CSS.escape(focusTaskId)}']`);
    row?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusTaskId, tasksQuery.isPending, tasks.length]);

  async function createTask() {
    const title = titleDraft.trim();
    if (!title || !teamId || !projectId) return;
    setTitleDraft("");
    await agencyOps.createProjectTask({ teamId, projectId, title });
  }

  async function deleteTask(task: { id: string; title: string }) {
    if (!teamId) return;
    await agencyOps.deleteProjectTask({
      teamId,
      taskId: task.id,
      taskTitle: task.title,
    });
  }

  return (
    <section
      className="rounded-surface border border-default bg-default"
      aria-label={`Tasks for ${projectName}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Tasks</p>
          {tasks.length > 0 ? (
            <span className="font-mono text-[11px] tabular-nums text-dimmed">{tasks.length}</span>
          ) : null}
        </div>

        <form
          className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            void createTask();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <ListPlus className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="Add a task"
              className="pl-9"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            aria-label="Add task"
            disabled={!titleDraft.trim() || isCreatingTask}
          >
            <Plus />
          </Button>
        </form>
      </header>

      {tasksQuery.isPending ? (
        <SurfaceShimmer className="min-h-48 rounded-none" label="Loading tasks" />
      ) : tasksQuery.isError ? (
        <div className="px-4 py-8 text-center">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load tasks.</p>
          <p className="mt-1 text-xs text-muted">
            {getErrorMessage(tasksQuery.error, "Try refreshing.")}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => void tasksQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <ListChecks className="mx-auto size-5 text-muted" />
          <p className="mt-3 text-xs text-muted">No tasks yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-default">
          {taskGroups.map((group) => (
            <AgencyTaskGroupRow
              key={group.groupKey}
              group={group}
              mode="project"
              teamId={teamId}
              selectedTaskId={selectedTaskId}
              highlightTaskId={focusTaskId}
              deletingTaskIds={deletingTaskIds}
              isRowPending={(taskId) => pendingTaskIds.includes(taskId)}
              canEditTaskRate={canEditTaskRate}
              onSelect={setSelectedTaskId}
              onDeleteInstance={(task) => void deleteTask(task)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
