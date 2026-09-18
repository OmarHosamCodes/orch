import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { agencyTeamCapabilities } from "@/features/shared/agency-team-capabilities";
import type {
  AgencyProject,
  AgencyProjectTask,
  TaskStatus,
} from "@/features/task-management/agency-work";
import {
  useAgencyChooserExpandedClients,
  useAgencyChooserExpandedProjects,
  useAgencyChooserOpenState,
  useAgencyChooserScrollReveal,
} from "@/features/shared/choosers/agency-chooser-shell";
import {
  useAgencyFavoritesQuery,
  useAgencyProjectTemplatesQuery,
} from "@/features/shared/agency-queries";
import { useAgencyProjectTasksForChooserQuery } from "@/features/shared/agency-task-chooser-catalog";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import { statusLabel } from "@/features/task-management/agency-task-status";
import { teamDetailQueryOptions } from "@/features/team/team-queries";
import {
  buildAgencyTaskChooserSections,
  type ChooserClientGroup,
  type ChooserProjectGroup,
} from "@/features/time-tracking/agency-task-chooser-groups";
import {
  buildTaskChooserKeyboardItems,
  clampTaskChooserActiveIndex,
  indexOfTaskChooserItem,
  taskChooserCreatePriority,
  taskChooserOptionDomId,
  type TaskChooserKeyboardItem,
} from "@/features/time-tracking/agency-task-chooser-keyboard";

type Project = Pick<
  AgencyProject,
  "id" | "clientId" | "clientName" | "name" | "colorHueId" | "iconKey"
>;
type AgencyTask = Pick<
  AgencyProjectTask,
  "id" | "projectId" | "title" | "status" | "assignedToTeam" | "assignees" | "iconKey"
>;

type AgencyTaskChooserClientOption = {
  id: string;
  name: string;
};

type AgencyTaskChooserTriggerFormat = "task-only" | "project-client" | "task-client";

export type UseAgencyTaskChooserOptions = {
  teamId: string;
  value: string;
  onValueChange: (value: string, projectId?: string) => void;
  projects: Project[];
  tasks: AgencyTask[];
  clients?: AgencyTaskChooserClientOption[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
  triggerFormat?: AgencyTaskChooserTriggerFormat;
  fallbackTaskTitle?: string;
  fallbackProjectId?: string;
  fallbackProjectName?: string;
  fallbackClientName?: string;
  filterProjectId?: string;
  highlightSearch?: boolean;
  required?: boolean;
  /** Ranked suggestion best-match — highlighted when chooser opens. */
  bestMatchTaskId?: string | null;
  /**
   * When true, picking a project under a client sets the value (project id).
   * Task rows and inline create-task are hidden.
   */
  pickProject?: boolean;
};

export type AgencyTaskChooserViewModel = {
  value: string;
  teamId: string;
  disabled: boolean;
  loading: boolean;
  placeholder: string;
  required: boolean;
  searchPlaceholder: string;
  className?: string;
  contentAlign: "start" | "center" | "end";
  triggerFormat: AgencyTaskChooserTriggerFormat;
  open: boolean;
  searchTerm: string;
  selectedProject: Project | null;
  triggerProject: Project | null;
  selectedTask: AgencyTask | null;
  triggerTaskTitle: string | null;
  favorites: ChooserProjectGroup[];
  clientGroups: ChooserClientGroup[];
  favoriteProjectIds: Set<string>;
  favoriteTaskIds: Set<string>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  isProjectExpanded: (projectId: string) => boolean;
  isClientExpanded: (clientName: string) => boolean;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSelectTask: (taskId: string, projectId?: string) => void;
  onSelectProject: (projectId: string) => void;
  pickProject: boolean;
  onToggleProject: (projectId: string) => void;
  onToggleClient: (clientName: string) => void;
  onToggleProjectFavorite: (projectId: string) => void;
  onToggleTaskFavorite: (taskId: string) => void;
  highlightSearch: boolean;
  bestMatchTaskId: string | null;
  activeOptionKey: string | null;
  activeOptionDomId: string | undefined;
  createPriority: "default" | "demoted" | "elevated";
  canEditRecords: boolean;
  statusLabel: (status: TaskStatus | undefined) => string;
  createTaskOpen: boolean;
  createTaskProjectId: string;
  createProjectOpen: boolean;
  clients: AgencyTaskChooserClientOption[];
  templates: Array<{ id: string; name: string; milestoneCount: number }>;
  onOpenCreateTask: (projectId: string) => void;
  onCreateTaskOpenChange: (open: boolean) => void;
  onOpenCreateProject: () => void;
  onCreateProjectOpenChange: (open: boolean) => void;
  onTaskCreated: (taskId: string) => void;
  onProjectCreated: (projectId: string) => void;
};

export function useAgencyTaskChooser(
  options: UseAgencyTaskChooserOptions,
): AgencyTaskChooserViewModel {
  const {
    teamId,
    value,
    onValueChange,
    projects,
    tasks,
    clients: clientsProp = [],
    disabled = false,
    loading = false,
    placeholder = "Task",
    searchPlaceholder = "Search client, project, or task",
    className,
    open: controlledOpen,
    onOpenChange,
    contentAlign = "start",
    triggerFormat = "task-only",
    fallbackTaskTitle,
    fallbackProjectId,
    fallbackProjectName,
    fallbackClientName,
    highlightSearch = false,
    required = false,
    filterProjectId,
    bestMatchTaskId = null,
    pickProject = false,
  } = options;

  const { open, searchTerm, setSearchTerm, setOpen } = useAgencyChooserOpenState({
    controlledOpen,
    onOpenChange,
  });
  const deferredSearch = useDeferredValue(searchTerm.trim());
  const chooserTasksQuery = useAgencyProjectTasksForChooserQuery(
    teamId,
    { search: deferredSearch || undefined, enabled: !pickProject },
    { selectedTaskIds: !pickProject && value && !fallbackTaskTitle ? [value] : [] },
  );
  const taskCatalog = useMemo(() => {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    for (const task of chooserTasksQuery.items) byId.set(task.id, task);
    return [...byId.values()];
  }, [chooserTasksQuery.items, tasks]);

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState("");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });
  const { canEditRecords } = agencyTeamCapabilities(teamQuery.data?.role);
  const favoritesQuery = useAgencyFavoritesQuery(teamId);
  const templatesQuery = useAgencyProjectTemplatesQuery(teamId);
  const toggleFavorite = useAgencyOpsStore((state) => state.toggleFavorite);

  const favoriteProjectIds = useMemo(
    () => new Set(favoritesQuery.data?.projectIds ?? []),
    [favoritesQuery.data?.projectIds],
  );
  const favoriteTaskIds = useMemo(
    () => new Set(favoritesQuery.data?.taskIds ?? []),
    [favoritesQuery.data?.taskIds],
  );

  const chooserTasks = useMemo(() => {
    if (pickProject) return [];
    const seen = new Set<string>();
    return taskCatalog.filter((task) => {
      if (task.status === "archived") return false;
      if (filterProjectId && task.projectId !== filterProjectId) return false;
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
  }, [filterProjectId, pickProject, taskCatalog]);

  const chooserProjects = useMemo(() => {
    if (!filterProjectId) return projects;
    return projects.filter((project) => project.id === filterProjectId);
  }, [projects, filterProjectId]);

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const selectedTask = useMemo(
    () => (pickProject ? null : (taskCatalog.find((task) => task.id === value) ?? null)),
    [pickProject, taskCatalog, value],
  );

  const selectedProject = useMemo(() => {
    if (pickProject && value) return projectsById.get(value) ?? null;
    return selectedTask ? (projectsById.get(selectedTask.projectId) ?? null) : null;
  }, [pickProject, projectsById, selectedTask, value]);

  const triggerProject = useMemo((): Project | null => {
    if (selectedProject) return selectedProject;
    if (!fallbackProjectId || !fallbackProjectName) return null;
    const cached = projectsById.get(fallbackProjectId);
    return {
      id: fallbackProjectId,
      name: fallbackProjectName,
      clientId: cached?.clientId ?? "",
      clientName: fallbackClientName ?? cached?.clientName ?? "",
      colorHueId: cached?.colorHueId ?? null,
      iconKey: cached?.iconKey ?? null,
    };
  }, [fallbackClientName, fallbackProjectId, fallbackProjectName, projectsById, selectedProject]);

  const triggerTaskTitle = selectedTask?.title ?? fallbackTaskTitle ?? null;

  const { isProjectExpanded, toggleProject, expandProject } = useAgencyChooserExpandedProjects(
    selectedTask?.projectId ?? null,
    open,
  );
  const { isClientExpanded, toggleClient, expandClient } = useAgencyChooserExpandedClients(
    triggerProject?.clientName || null,
    open,
  );

  const bestMatchTask = useMemo(
    () =>
      bestMatchTaskId ? (taskCatalog.find((task) => task.id === bestMatchTaskId) ?? null) : null,
    [bestMatchTaskId, taskCatalog],
  );

  useEffect(() => {
    if (!open || !bestMatchTask) return;
    expandProject(bestMatchTask.projectId);
    const clientName = projectsById.get(bestMatchTask.projectId)?.clientName;
    if (clientName) expandClient(clientName);
  }, [bestMatchTask, expandClient, expandProject, open, projectsById]);

  const sections = useMemo(
    () =>
      buildAgencyTaskChooserSections({
        projects: chooserProjects,
        tasks: chooserTasks,
        favoriteProjectIds: [...favoriteProjectIds],
        favoriteTaskIds: [...favoriteTaskIds],
        searchTerm,
      }),
    [chooserProjects, chooserTasks, favoriteProjectIds, favoriteTaskIds, searchTerm],
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [expandEpoch, setExpandEpoch] = useState(0);

  const searchExpandProjectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of sections.favorites) {
      if (entry.searchExpandProject) ids.add(entry.project.id);
    }
    for (const group of sections.clientGroups) {
      for (const entry of group.projects) {
        if (entry.searchExpandProject) ids.add(entry.project.id);
      }
    }
    return ids;
  }, [sections]);

  const searchExpandClientNames = useMemo(() => {
    const names = new Set<string>();
    for (const group of sections.clientGroups) {
      if (group.searchExpandClient) names.add(group.clientName);
    }
    return names;
  }, [sections]);

  const isProjectExpandedForList = (projectId: string) =>
    searchExpandProjectIds.has(projectId) || isProjectExpanded(projectId);
  const isClientExpandedForList = (clientName: string) =>
    searchExpandClientNames.has(clientName) || isClientExpanded(clientName);

  const includeProjects =
    pickProject ||
    !searchTerm.trim() ||
    sections.favorites.some((entry) => !isProjectExpandedForList(entry.project.id)) ||
    sections.clientGroups.some((group) =>
      group.projects.some((entry) => !isProjectExpandedForList(entry.project.id)),
    );

  const keyboardItems = useMemo(
    () =>
      buildTaskChooserKeyboardItems({
        favorites: sections.favorites,
        clientGroups: sections.clientGroups,
        isProjectExpanded: isProjectExpandedForList,
        isClientExpanded: isClientExpandedForList,
        includeProjects,
      }),
    // expandEpoch invalidates after project/client toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- expand helpers close over render state
    [
      sections.favorites,
      sections.clientGroups,
      searchTerm,
      expandEpoch,
      includeProjects,
      selectedTask?.projectId,
      bestMatchTask?.projectId,
    ],
  );

  const [activeIndex, setActiveIndex] = useState(-1);
  const followActiveOptionRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      followActiveOptionRef.current = false;
      return;
    }
    setActiveIndex(
      indexOfTaskChooserItem(keyboardItems, {
        taskId: bestMatchTaskId || value || null,
        projectId: selectedTask?.projectId ?? bestMatchTask?.projectId ?? null,
      }),
    );
    // Re-seek on open/search/value only. Expand/collapse must not reset to row 0.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid reset on every arrow move
  }, [open, searchTerm, bestMatchTaskId, value]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex((current) => clampTaskChooserActiveIndex(current, keyboardItems.length));
  }, [keyboardItems.length, open]);

  useEffect(() => {
    if (!open || activeIndex < 0 || !followActiveOptionRef.current) return;
    const item = keyboardItems[activeIndex];
    if (!item) return;
    followActiveOptionRef.current = false;
    const frame = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`#${CSS.escape(taskChooserOptionDomId(item.key))}`)
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, keyboardItems, open]);

  useAgencyChooserScrollReveal({
    open,
    searchInputRef,
    listRef,
    selectedSelector: '[data-selected-task="true"], [data-best-match-task="true"]',
    revealDeps: [selectedTask?.projectId, value, bestMatchTaskId],
  });

  const clients = useMemo(() => {
    if (clientsProp.length > 0) return clientsProp;
    const byId = new Map<string, AgencyTaskChooserClientOption>();
    for (const project of projects) {
      if (!project.clientId || byId.has(project.clientId)) continue;
      byId.set(project.clientId, { id: project.clientId, name: project.clientName || "Client" });
    }
    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [clientsProp, projects]);

  const templates = useMemo(
    () =>
      (templatesQuery.data?.items ?? []).map((template) => ({
        id: template.id,
        name: template.name,
        milestoneCount: template.milestoneCount,
      })),
    [templatesQuery.data?.items],
  );

  const hasVisibleResults = sections.favorites.length > 0 || sections.clientGroups.length > 0;
  const createPriority = taskChooserCreatePriority({
    searchTerm,
    hasVisibleResults,
  });

  const activeItem: TaskChooserKeyboardItem | null =
    activeIndex >= 0 ? (keyboardItems[activeIndex] ?? null) : null;
  const activeOptionKey = activeItem?.key ?? null;
  const activeOptionDomId = activeOptionKey ? taskChooserOptionDomId(activeOptionKey) : undefined;

  function selectTask(taskId: string, projectId?: string) {
    const resolvedProjectId =
      projectId ?? taskCatalog.find((task) => task.id === taskId)?.projectId;
    onValueChange(taskId, resolvedProjectId);
    setOpen(false);
  }

  function selectProject(projectId: string) {
    onValueChange(projectId, projectId);
    setOpen(false);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;

    if (event.key === "ArrowDown") {
      if (keyboardItems.length === 0) return;
      event.preventDefault();
      followActiveOptionRef.current = true;
      setActiveIndex((current) => {
        if (current < 0) return 0;
        return Math.min(current + 1, keyboardItems.length - 1);
      });
      return;
    }

    if (event.key === "ArrowUp") {
      if (keyboardItems.length === 0) return;
      event.preventDefault();
      followActiveOptionRef.current = true;
      setActiveIndex((current) => {
        if (current < 0) return keyboardItems.length - 1;
        return Math.max(current - 1, 0);
      });
      return;
    }

    if (event.key === "Enter") {
      const item = activeIndex >= 0 ? keyboardItems[activeIndex] : null;
      if (!item) return;
      event.preventDefault();
      if (item.kind === "task") {
        selectTask(item.taskId, item.projectId);
        return;
      }
      if (pickProject) {
        selectProject(item.projectId);
        return;
      }
      toggleProject(item.projectId);
      setExpandEpoch((epoch) => epoch + 1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  function handleToggleProject(projectId: string) {
    toggleProject(projectId);
    setExpandEpoch((epoch) => epoch + 1);
  }

  function handleToggleClient(clientName: string) {
    toggleClient(clientName);
    setExpandEpoch((epoch) => epoch + 1);
  }

  function handleToggleProjectFavorite(projectId: string) {
    void toggleFavorite({ teamId, kind: "project", projectId });
  }

  function handleToggleTaskFavorite(taskId: string) {
    void toggleFavorite({ teamId, kind: "task", taskId });
  }

  function onOpenCreateTask(projectId: string) {
    if (!canEditRecords) return;
    setOpen(false);
    setCreateTaskProjectId(projectId);
    setCreateTaskOpen(true);
  }

  function onOpenCreateProject() {
    if (!canEditRecords) return;
    setOpen(false);
    setCreateProjectOpen(true);
  }

  function onTaskCreated(taskId: string) {
    const createdProjectId = createTaskProjectId;
    setCreateTaskOpen(false);
    setCreateTaskProjectId("");
    onValueChange(taskId, createdProjectId || undefined);
    setOpen(false);
  }

  function onProjectCreated(projectId: string) {
    setCreateProjectOpen(false);
    if (pickProject) {
      selectProject(projectId);
      return;
    }
    expandProject(projectId);
    onOpenCreateTask(projectId);
  }

  return {
    value,
    teamId,
    disabled,
    loading: loading || (!pickProject && chooserTasksQuery.isPending && taskCatalog.length === 0),
    placeholder,
    required,
    searchPlaceholder,
    className,
    contentAlign,
    triggerFormat,
    open,
    searchTerm,
    selectedProject,
    triggerProject,
    selectedTask,
    triggerTaskTitle,
    favorites: sections.favorites,
    clientGroups: sections.clientGroups,
    favoriteProjectIds,
    favoriteTaskIds,
    searchInputRef,
    listRef,
    isProjectExpanded: isProjectExpandedForList,
    isClientExpanded: isClientExpandedForList,
    onOpenChange: setOpen,
    onSearchChange: setSearchTerm,
    onSearchKeyDown: handleSearchKeyDown,
    onSelectTask: selectTask,
    onSelectProject: selectProject,
    pickProject,
    onToggleProject: handleToggleProject,
    onToggleClient: handleToggleClient,
    onToggleProjectFavorite: handleToggleProjectFavorite,
    onToggleTaskFavorite: handleToggleTaskFavorite,
    highlightSearch,
    bestMatchTaskId: bestMatchTaskId || null,
    activeOptionKey,
    activeOptionDomId,
    createPriority,
    canEditRecords,
    statusLabel,
    createTaskOpen,
    createTaskProjectId,
    createProjectOpen,
    clients,
    templates,
    onOpenCreateTask,
    onCreateTaskOpenChange: setCreateTaskOpen,
    onOpenCreateProject,
    onCreateProjectOpenChange: setCreateProjectOpen,
    onTaskCreated,
    onProjectCreated,
  };
}
