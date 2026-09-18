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
import { catalogRateAmount } from "@/features/shared/format-rate";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { agencyTeamCapabilities } from "@/features/shared/agency-team-capabilities";
import { teamDetailQueryOptions } from "@/features/team/team-queries";
import {
  groupProjectsByCorridor,
  projectBookCorridor,
  projectBookNeeds,
  projectBudgetUsagePct,
  type ProjectBookCorridorId,
  type ProjectBookNeedId,
} from "@/features/projects/projects-book-corridors";

export type AgencyProjectsTableProject = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  colorHueId: number | null;
  iconKey: string | null;
  deletedAt: string | null;
  billableRateAmount: number | null;
  sourceBillableRateAmount: number | null;
};

type AgencyProjectsTableBudget = {
  projectId: string;
  hoursBudget: number | null;
  hoursLogged: number;
  costBudgetAmount: number | null;
  costLoggedAmount: number;
};

export type AgencyProjectsBookRow = AgencyProjectsTableProject & {
  corridor: ProjectBookCorridorId;
  weekDurationSeconds: number;
  weekShare: number;
  budgetPct: number;
  needs: ProjectBookNeedId[];
  clientArchivedAt: string | null;
};

type AgencyProjectsBookCorridor = {
  id: ProjectBookCorridorId;
  label: string;
  items: AgencyProjectsBookRow[];
};

export type AgencyProjectsTableViewModel = {
  openNewProject: () => void;
  openNewClient: () => void;
  isOwner: boolean;
  canEditRecords: boolean;
  canEditRates: boolean;
  corridors: AgencyProjectsBookCorridor[];
  filteredProjects: AgencyProjectsBookRow[];
  hoursThisWeekByProject: Map<string, number>;
  budgetsByProject: Map<string, AgencyProjectsTableBudget>;
  budgetPctFor: (projectId: string) => number;
  budgetToneFor: (projectId: string) => string;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  clients: Array<{ id: string; name: string }>;
  projects: AgencyProjectsTableProject[];
  refetchProjects: () => void;
  isProjectMutationPending: boolean;
  pendingDeleteProject: AgencyProjectsBookRow | null;
  requestDeleteProject: (project: AgencyProjectsBookRow) => void;
  cancelDeleteProject: () => void;
  confirmDeleteProject: () => void;
  restoreProject: (project: AgencyProjectsBookRow) => void;
};

type UseAgencyProjectsTableOptions = {
  teamId: string;
  filters: AgencyListFiltersApplied;
};

export function useAgencyProjectsTable({
  teamId,
  filters,
}: UseAgencyProjectsTableOptions): AgencyProjectsTableViewModel {
  const { openNewProject, openNewClient } = useAgencyProjectsActions();
  const agencyOps = useAgencyOpsStore();
  const isProjectMutationPending = useAgencyOpsStore(selectIsProjectMutationPending);
  const workSchedule = useTeamWorkSchedule(teamId);
  const [pendingDeleteProject, setPendingDeleteProject] = useState<AgencyProjectsBookRow | null>(
    null,
  );

  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });
  const { isOwner, canEditRecords, canEditRates } = agencyTeamCapabilities(teamQuery.data?.role);

  const projectsQuery = useAgencyProjectsQuery(teamId, {
    archiveFilter: filters.archiveFilter,
    trashFilter: filters.trashFilter,
  });
  const clientsQuery = useAgencyClientsQuery(teamId, { archiveFilter: "all" });
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
    const map = new Map<string, AgencyProjectsTableBudget>();
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
    billableRateAmount: project.billableRateAmount,
    sourceBillableRateAmount: project.sourceBillableRateAmount,
  }));
  const clients = clientsQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];

  const clientArchivedAtById = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client.archivedAt ?? null]));
  }, [clients]);

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

  const lastActivityByProject = useMemo(() => {
    const latest = new Map<string, number>();
    for (const entry of entries) {
      const startedAtMs = new Date(entry.startedAt).getTime();
      const current = latest.get(entry.projectId) ?? 0;
      if (startedAtMs > current) latest.set(entry.projectId, startedAtMs);
    }
    return latest;
  }, [entries]);

  function budgetPctFor(projectId: string): number {
    return projectBudgetUsagePct(budgetsByProject.get(projectId) ?? null);
  }

  function budgetToneFor(projectId: string): string {
    const pct = budgetPctFor(projectId);
    if (pct >= 100) return "bg-error";
    if (pct >= 85) return "bg-warning";
    return "bg-primary";
  }

  const filteredProjects = useMemo(() => {
    const term = filters.filterTerm;
    const { peopleSet, clientsSet, projectsSet, tasksSet } = filters;
    const matching = projects.filter((project) => {
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

    const maxWeek = matching.reduce((highest, project) => {
      const week = hoursThisWeekByProject.get(project.id) ?? 0;
      return Math.max(highest, week);
    }, 0);

    const nowMs = Date.now();

    const rows: AgencyProjectsBookRow[] = matching.map((project) => {
      const budget = budgetsByProject.get(project.id) ?? null;
      const weekDurationSeconds = hoursThisWeekByProject.get(project.id) ?? 0;
      const clientArchivedAt = clientArchivedAtById.get(project.clientId) ?? null;
      const lastActivityMs = lastActivityByProject.get(project.id);
      const daysSinceLastActivity =
        lastActivityMs == null
          ? null
          : Math.floor((nowMs - lastActivityMs) / (24 * 60 * 60 * 1000));
      const inheritsClientRate =
        catalogRateAmount(project.sourceBillableRateAmount, project.billableRateAmount) === null;
      const needs = projectBookNeeds({
        deletedAt: project.deletedAt,
        budget,
        clientArchivedAt,
        inheritsClientRate,
        journeyIncomplete: false,
        daysSinceLastActivity,
      });

      return {
        ...project,
        corridor: projectBookCorridor({
          deletedAt: project.deletedAt,
          weekDurationSeconds,
          budget,
        }),
        weekDurationSeconds,
        weekShare: maxWeek > 0 ? weekDurationSeconds / maxWeek : 0,
        budgetPct: projectBudgetUsagePct(budget),
        needs,
        clientArchivedAt,
      };
    });

    rows.sort((left, right) => {
      if (right.weekDurationSeconds !== left.weekDurationSeconds) {
        return right.weekDurationSeconds - left.weekDurationSeconds;
      }
      if (right.budgetPct !== left.budgetPct) {
        return right.budgetPct - left.budgetPct;
      }
      return left.name.localeCompare(right.name);
    });

    return rows;
  }, [
    budgetsByProject,
    clientArchivedAtById,
    entries,
    filters,
    hoursThisWeekByProject,
    lastActivityByProject,
    projects,
    tasks,
  ]);

  const corridors = useMemo(() => groupProjectsByCorridor(filteredProjects), [filteredProjects]);

  const isLoading = projectsQuery.isPending || clientsQuery.isPending || budgetsQuery.isPending;
  const isError = projectsQuery.isError || clientsQuery.isError || budgetsQuery.isError;
  const errorMessage = getErrorMessage(
    projectsQuery.error ?? clientsQuery.error ?? budgetsQuery.error,
    "Try refreshing.",
  );

  function refetchProjects() {
    void projectsQuery.refetch();
    void clientsQuery.refetch();
    void budgetsQuery.refetch();
  }

  function requestDeleteProject(project: AgencyProjectsBookRow) {
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

  function restoreProject(project: AgencyProjectsBookRow) {
    if (!teamId) return;
    void agencyOps.restoreProject({
      teamId,
      projectId: project.id,
      projectName: project.name,
    });
  }

  return {
    openNewProject,
    openNewClient,
    isOwner,
    canEditRecords,
    canEditRates,
    corridors,
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
