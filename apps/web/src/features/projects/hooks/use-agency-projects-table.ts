import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAgencyProjectsActions } from "@/features/shared/agency-segment-filters";
import type { AgencyListFiltersApplied } from "@/features/shared/use-agency-list-filters";
import {
  useAgencyClientsQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
} from "@/features/shared/agency-queries";
import {
  selectIsProjectMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";
import { startOfWeekUtc } from "@/features/shared/use-agency-time-range-filters";
import { useTeamWorkSchedule } from "@/features/shared/use-team-work-schedule";
import { orpc } from "@/lib/orpc";
import { getTaskGroupKey } from "@/features/task-management/agency-task-utils";
import { agencyListSearchMatches } from "@/features/shared/agency-list-search";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { teamDetailQueryOptions } from "@/features/team/team-queries";

export type AgencyProjectsTableProject = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  colorHueId: number | null;
  iconKey: string | null;
  deletedAt: string | null;
};

export type AgencyProjectsTableViewModel = {
  openNewProject: () => void;
  isOwner: boolean;
  filteredProjects: AgencyProjectsTableProject[];
  hoursThisWeekByProject: Map<string, number>;
  budgetsByProject: Map<
    string,
    {
      projectId: string;
      hoursBudget: number | null;
      hoursLogged: number;
      costBudgetAmount: number | null;
      costLoggedAmount: number;
    }
  >;
  budgetPctFor: (projectId: string) => number;
  budgetToneFor: (projectId: string) => string;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  clients: Array<{ id: string; name: string }>;
  projects: AgencyProjectsTableProject[];
  refetchProjects: () => void;
  isProjectMutationPending: boolean;
  pendingDeleteProject: AgencyProjectsTableProject | null;
  requestDeleteProject: (project: AgencyProjectsTableProject) => void;
  cancelDeleteProject: () => void;
  confirmDeleteProject: () => void;
  restoreProject: (project: AgencyProjectsTableProject) => void;
};

type UseAgencyProjectsTableOptions = {
  teamId: string;
  filters: AgencyListFiltersApplied;
};

export function useAgencyProjectsTable({
  teamId,
  filters,
}: UseAgencyProjectsTableOptions): AgencyProjectsTableViewModel {
  const { openNewProject } = useAgencyProjectsActions();
  const agencyOps = useAgencyOpsStore();
  const isProjectMutationPending = useAgencyOpsStore(selectIsProjectMutationPending);
  const workSchedule = useTeamWorkSchedule(teamId);
  const [pendingDeleteProject, setPendingDeleteProject] =
    useState<AgencyProjectsTableProject | null>(null);

  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });
  const isOwner = teamQuery.data?.role === "owner";

  const projectsQuery = useAgencyProjectsQuery(teamId, {
    archiveFilter: filters.archiveFilter,
    trashFilter: filters.trashFilter,
  });
  const clientsQuery = useAgencyClientsQuery(teamId, { archiveFilter: filters.archiveFilter });
  const entriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 100);
  const tasksQuery = useAgencyProjectTasksQuery(teamId, {
    search: filters.filterTerm.trim() || undefined,
    pageSize: 100,
  });

  const budgetsQuery = useQuery({
    ...orpc.agencyOps.budgets.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const budgetsByProject = useMemo(() => {
    const map = new Map<string, NonNullable<typeof budgetsQuery.data>["items"][number]>();
    for (const entry of budgetsQuery.data?.items ?? []) {
      map.set(entry.projectId, entry);
    }
    return map;
  }, [budgetsQuery.data?.items]);

  const projects = (projectsQuery.data?.items ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    clientId: project.clientId,
    clientName: project.clientName,
    colorHueId: project.colorHueId ?? null,
    iconKey: project.iconKey ?? null,
    deletedAt: project.deletedAt ?? null,
  }));
  const clients = clientsQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];

  const hoursThisWeekByProject = useMemo(() => {
    const weekStartMs = startOfWeekUtc(workSchedule.weekStartsOn).getTime();
    const totals = new Map<string, number>();
    for (const entry of entries) {
      const startedAtMs = new Date(entry.startedAt).getTime();
      if (startedAtMs < weekStartMs) continue;
      totals.set(entry.projectId, (totals.get(entry.projectId) ?? 0) + entry.durationSeconds);
    }
    return totals;
  }, [entries, workSchedule.weekStartsOn]);

  const filteredProjects = useMemo(() => {
    const term = filters.filterTerm;
    const { peopleSet, clientsSet, projectsSet, tasksSet } = filters;
    return projects.filter((project) => {
      if (term && !agencyListSearchMatches(term, project.name, project.clientName)) {
        return false;
      }
      if (clientsSet.size > 0 && !clientsSet.has(project.clientId)) return false;
      if (projectsSet.size > 0 && !projectsSet.has(project.id)) return false;
      if (
        peopleSet.size > 0 &&
        !entries.some((entry) => entry.projectId === project.id && peopleSet.has(entry.userId))
      ) {
        return false;
      }
      if (
        tasksSet.size > 0 &&
        !tasks.some((task) => task.projectId === project.id && tasksSet.has(getTaskGroupKey(task)))
      ) {
        return false;
      }
      return true;
    });
  }, [entries, filters, projects, tasks]);

  function budgetPctFor(projectId: string): number {
    const budget = budgetsByProject.get(projectId);
    if (!budget) return 0;
    if (budget.hoursBudget && budget.hoursBudget > 0) {
      return Math.min(100, Math.round((budget.hoursLogged / budget.hoursBudget) * 100));
    }
    if (budget.costBudgetAmount && budget.costBudgetAmount > 0) {
      return Math.min(100, Math.round((budget.costLoggedAmount / budget.costBudgetAmount) * 100));
    }
    return 0;
  }

  function budgetToneFor(projectId: string): string {
    const pct = budgetPctFor(projectId);
    if (pct >= 100) return "bg-error";
    if (pct >= 85) return "bg-warning";
    return "bg-primary";
  }

  const isLoading = projectsQuery.isPending || clientsQuery.isPending;
  const isError = projectsQuery.isError;
  const errorMessage = getErrorMessage(projectsQuery.error, "Try refreshing.");

  function refetchProjects() {
    void projectsQuery.refetch();
  }

  function requestDeleteProject(project: AgencyProjectsTableProject) {
    setPendingDeleteProject(project);
  }

  function cancelDeleteProject() {
    if (isProjectMutationPending) return;
    setPendingDeleteProject(null);
  }

  function confirmDeleteProject() {
    if (!pendingDeleteProject || !teamId) return;
    const project = pendingDeleteProject;
    setPendingDeleteProject(null);
    void agencyOps.deleteProject({
      teamId,
      projectId: project.id,
      projectName: project.name,
    });
  }

  function restoreProject(project: AgencyProjectsTableProject) {
    if (!teamId) return;
    void agencyOps.restoreProject({
      teamId,
      projectId: project.id,
      projectName: project.name,
    });
  }

  return {
    openNewProject,
    isOwner,
    filteredProjects,
    hoursThisWeekByProject,
    budgetsByProject,
    budgetPctFor,
    budgetToneFor,
    isLoading,
    isError,
    errorMessage,
    clients,
    projects,
    refetchProjects,
    isProjectMutationPending,
    pendingDeleteProject,
    requestDeleteProject,
    cancelDeleteProject,
    confirmDeleteProject,
    restoreProject,
  };
}
