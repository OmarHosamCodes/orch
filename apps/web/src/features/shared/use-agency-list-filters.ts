import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type {
  AgencyFilterOption,
  AgencyFilterOptionGroup,
  AgencyMultiSelectStatusFilter,
} from "@/features/shared/filters/agency-multi-select-filter";
import { orpc } from "@/lib/orpc";
import {
  useAgencyClientsQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
} from "@/features/shared/agency-queries";
import {
  groupTasksByClient,
  groupTasksByProjectTitle,
} from "@/features/task-management/agency-task-utils";
import type { AgencyClientArchiveFilter } from "@/features/shared/agency-client-archive-filter";
import type { AgencyProjectTrashFilter } from "@/features/shared/agency-project-trash-filter";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";

export type { AgencyClientArchiveFilter } from "@/features/shared/agency-client-archive-filter";
export type { AgencyProjectTrashFilter } from "@/features/shared/agency-project-trash-filter";

export type AgencyListFiltersApplied = {
  filterTerm: string;
  archiveFilter: AgencyClientArchiveFilter;
  trashFilter: AgencyProjectTrashFilter;
  selectedPeopleIds: string[];
  selectedClientIds: string[];
  selectedProjectIds: string[];
  selectedTaskIds: string[];
  peopleSet: Set<string>;
  clientsSet: Set<string>;
  projectsSet: Set<string>;
  tasksSet: Set<string>;
};

const DEFAULT_ARCHIVE_FILTER: AgencyClientArchiveFilter = "nonarchived";
const DEFAULT_TRASH_FILTER: AgencyProjectTrashFilter = "active";

const ARCHIVE_STATUS_OPTIONS: AgencyMultiSelectStatusFilter["options"] = [
  { value: "all", label: "All" },
  { value: "nonarchived", label: "Active" },
  { value: "archived", label: "Archived" },
];

const TRASH_STATUS_OPTIONS: AgencyMultiSelectStatusFilter["options"] = [
  { value: "active", label: "Active" },
  { value: "trashed", label: "In trash" },
  { value: "all", label: "All" },
];

type UseAgencyListFiltersOptions = {
  teamId: string;
};

function sameIdList(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return right.every((value) => leftSet.has(value));
}

function buildApplied(input: {
  filterTerm: string;
  archiveFilter: AgencyClientArchiveFilter;
  trashFilter: AgencyProjectTrashFilter;
  selectedPeopleIds: string[];
  selectedClientIds: string[];
  selectedProjectIds: string[];
  selectedTaskIds: string[];
}): AgencyListFiltersApplied {
  return {
    filterTerm: input.filterTerm,
    archiveFilter: input.archiveFilter,
    trashFilter: input.trashFilter,
    selectedPeopleIds: input.selectedPeopleIds,
    selectedClientIds: input.selectedClientIds,
    selectedProjectIds: input.selectedProjectIds,
    selectedTaskIds: input.selectedTaskIds,
    peopleSet: new Set(input.selectedPeopleIds),
    clientsSet: new Set(input.selectedClientIds),
    projectsSet: new Set(input.selectedProjectIds),
    tasksSet: new Set(input.selectedTaskIds),
  };
}

export function useAgencyListFilters({ teamId }: UseAgencyListFiltersOptions) {
  const [draftFilterTerm, setDraftFilterTerm] = useState("");
  const [draftArchiveFilter, setDraftArchiveFilter] =
    useState<AgencyClientArchiveFilter>(DEFAULT_ARCHIVE_FILTER);
  const [draftTrashFilter, setDraftTrashFilter] =
    useState<AgencyProjectTrashFilter>(DEFAULT_TRASH_FILTER);
  const [draftPeopleIds, setDraftPeopleIds] = useState<string[]>([]);
  const [draftClientIds, setDraftClientIds] = useState<string[]>([]);
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>([]);
  const [draftTaskIds, setDraftTaskIds] = useState<string[]>([]);

  const [appliedFilterTerm, setAppliedFilterTerm] = useState("");
  const [appliedArchiveFilter, setAppliedArchiveFilter] =
    useState<AgencyClientArchiveFilter>(DEFAULT_ARCHIVE_FILTER);
  const [appliedTrashFilter, setAppliedTrashFilter] =
    useState<AgencyProjectTrashFilter>(DEFAULT_TRASH_FILTER);
  const [appliedPeopleIds, setAppliedPeopleIds] = useState<string[]>([]);
  const [appliedClientIds, setAppliedClientIds] = useState<string[]>([]);
  const [appliedProjectIds, setAppliedProjectIds] = useState<string[]>([]);
  const [appliedTaskIds, setAppliedTaskIds] = useState<string[]>([]);

  const clientsQuery = useAgencyClientsQuery(teamId, { archiveFilter: draftArchiveFilter });
  const projectsQuery = useAgencyProjectsQuery(teamId, {
    archiveFilter: draftArchiveFilter,
    trashFilter: draftTrashFilter,
  });
  const appliedClientsQuery = useAgencyClientsQuery(teamId, {
    archiveFilter: appliedArchiveFilter,
  });
  const appliedProjectsQuery = useAgencyProjectsQuery(teamId, {
    archiveFilter: appliedArchiveFilter,
    trashFilter: appliedTrashFilter,
  });
  const entriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 100);
  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.team.members.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId),
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );
  const tasksQuery = useAgencyProjectTasksQuery(teamId, {
    search: draftFilterTerm.trim() || undefined,
    pageSize: 100,
  });

  const clients = clientsQuery.data?.items ?? [];
  const projects = projectsQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];

  const peopleOptions = useMemo(() => {
    const people = new Map<string, AgencyFilterOption>();
    for (const member of membersQuery.data?.items ?? []) {
      people.set(member.userId, {
        value: member.userId,
        label: member.userName,
        avatar: {
          userId: member.userId,
          name: member.userName,
          avatarUrl: member.userAvatar,
        },
      });
    }
    for (const entry of entries) {
      if (people.has(entry.userId)) continue;
      people.set(entry.userId, {
        value: entry.userId,
        label: entry.userName,
        avatar: { userId: entry.userId, name: entry.userName },
      });
    }
    return Array.from(people.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [entries, membersQuery.data?.items]);

  const clientOptions = useMemo(
    () => clients.map((client) => ({ value: client.id, label: client.name })),
    [clients],
  );

  const projectFilterGroups = useMemo((): AgencyFilterOptionGroup[] => {
    const sortedProjects = [...projects].sort(
      (left, right) =>
        left.clientName.localeCompare(right.clientName) || left.name.localeCompare(right.name),
    );
    const groups: AgencyFilterOptionGroup[] = [];
    let currentGroup: AgencyFilterOptionGroup | null = null;

    for (const project of sortedProjects) {
      if (!currentGroup || currentGroup.groupLabel !== project.clientName) {
        currentGroup = { groupLabel: project.clientName, options: [] };
        groups.push(currentGroup);
      }
      currentGroup.options!.push({
        value: project.id,
        label: project.name,
        secondary: project.clientName,
        searchText: project.clientName,
      });
    }

    return groups;
  }, [projects]);

  const taskFilterGroups = useMemo((): AgencyFilterOptionGroup[] => {
    return groupTasksByClient(tasks, projects).map((clientGroup) => {
      const tasksByProject = new Map<string, typeof tasks>();
      for (const task of clientGroup.tasks) {
        const list = tasksByProject.get(task.projectId) ?? [];
        list.push(task);
        tasksByProject.set(task.projectId, list);
      }

      return {
        groupLabel: clientGroup.clientName,
        sections: projects
          .filter(
            (project) =>
              project.clientId === clientGroup.clientId && tasksByProject.has(project.id),
          )
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((project) => ({
            sectionLabel: project.name,
            options: groupTasksByProjectTitle(tasksByProject.get(project.id) ?? []).map(
              (group) => ({
                value: group.groupKey,
                label: group.title,
                secondary: `${project.name} · ${clientGroup.clientName}`,
                searchText: `${project.name} ${clientGroup.clientName}`,
              }),
            ),
          })),
      };
    });
  }, [projects, tasks]);

  const applied = useMemo(
    () =>
      buildApplied({
        filterTerm: appliedFilterTerm,
        archiveFilter: appliedArchiveFilter,
        trashFilter: appliedTrashFilter,
        selectedPeopleIds: appliedPeopleIds,
        selectedClientIds: appliedClientIds,
        selectedProjectIds: appliedProjectIds,
        selectedTaskIds: appliedTaskIds,
      }),
    [
      appliedArchiveFilter,
      appliedClientIds,
      appliedFilterTerm,
      appliedPeopleIds,
      appliedProjectIds,
      appliedTaskIds,
      appliedTrashFilter,
    ],
  );

  const hasPendingChanges =
    draftFilterTerm !== appliedFilterTerm ||
    draftArchiveFilter !== appliedArchiveFilter ||
    draftTrashFilter !== appliedTrashFilter ||
    !sameIdList(draftPeopleIds, appliedPeopleIds) ||
    !sameIdList(draftClientIds, appliedClientIds) ||
    !sameIdList(draftProjectIds, appliedProjectIds) ||
    !sameIdList(draftTaskIds, appliedTaskIds);

  const canReset =
    draftFilterTerm.trim() !== "" ||
    draftArchiveFilter !== DEFAULT_ARCHIVE_FILTER ||
    draftTrashFilter !== DEFAULT_TRASH_FILTER ||
    draftPeopleIds.length > 0 ||
    draftClientIds.length > 0 ||
    draftProjectIds.length > 0 ||
    draftTaskIds.length > 0;

  function handleApply() {
    setAppliedFilterTerm(draftFilterTerm);
    setAppliedArchiveFilter(draftArchiveFilter);
    setAppliedTrashFilter(draftTrashFilter);
    setAppliedPeopleIds(draftPeopleIds);
    setAppliedClientIds(draftClientIds);
    setAppliedProjectIds(draftProjectIds);
    setAppliedTaskIds(draftTaskIds);
  }

  function handleReset() {
    setDraftFilterTerm("");
    setDraftArchiveFilter(DEFAULT_ARCHIVE_FILTER);
    setDraftTrashFilter(DEFAULT_TRASH_FILTER);
    setDraftPeopleIds([]);
    setDraftClientIds([]);
    setDraftProjectIds([]);
    setDraftTaskIds([]);
    setAppliedFilterTerm("");
    setAppliedArchiveFilter(DEFAULT_ARCHIVE_FILTER);
    setAppliedTrashFilter(DEFAULT_TRASH_FILTER);
    setAppliedPeopleIds([]);
    setAppliedClientIds([]);
    setAppliedProjectIds([]);
    setAppliedTaskIds([]);
  }

  const archiveStatusFilter: AgencyMultiSelectStatusFilter = {
    label: "Show",
    value: draftArchiveFilter,
    options: ARCHIVE_STATUS_OPTIONS,
    onChange: (value) => setDraftArchiveFilter(value as AgencyClientArchiveFilter),
  };
  const trashStatusFilter: AgencyMultiSelectStatusFilter = {
    label: "Show",
    value: draftTrashFilter,
    options: TRASH_STATUS_OPTIONS,
    onChange: (value) => setDraftTrashFilter(value as AgencyProjectTrashFilter),
  };

  const isRefreshing =
    (appliedClientsQuery.isFetching && Boolean(appliedClientsQuery.data)) ||
    (appliedProjectsQuery.isFetching && Boolean(appliedProjectsQuery.data));

  return {
    applied,
    clients,
    projects,
    entries,
    tasks,
    isLoading: clientsQuery.isPending || projectsQuery.isPending,
    isRefreshing,
    filterTerm: draftFilterTerm,
    onFilterTermChange: setDraftFilterTerm,
    selectedPeopleIds: draftPeopleIds,
    onSelectedPeopleIdsChange: setDraftPeopleIds,
    selectedClientIds: draftClientIds,
    onSelectedClientIdsChange: setDraftClientIds,
    selectedProjectIds: draftProjectIds,
    onSelectedProjectIdsChange: setDraftProjectIds,
    selectedTaskIds: draftTaskIds,
    onSelectedTaskIdsChange: setDraftTaskIds,
    peopleOptions,
    clientOptions,
    projectFilterGroups,
    taskFilterGroups,
    peopleLoading: tasksQuery.isPending,
    clientsLoading: clientsQuery.isPending,
    projectsLoading: projectsQuery.isPending,
    tasksLoading: tasksQuery.isPending,
    archiveStatusFilter,
    trashStatusFilter,
    hasPendingChanges,
    onApply: handleApply,
    canReset,
    onReset: handleReset,
  };
}
