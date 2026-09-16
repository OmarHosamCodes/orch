import {
  groupItemsByClient,
  sortProjectsByClientThenName,
} from "@/features/shared/choosers/agency-chooser-shell";
import {
  chooserFieldHits,
  chooserPathMatches,
  chooserSearchExpand,
  tokenizeChooserQuery,
} from "@/features/time-tracking/agency-task-chooser-search";

export type ChooserProject = {
  id: string;
  name: string;
  clientName: string;
  clientId?: string;
  colorHueId?: number | null;
  iconKey?: string | null;
};

export type ChooserTask = {
  id: string;
  projectId: string;
  title: string;
  status: string;
  iconKey?: string | null;
};

export type ChooserProjectGroup = {
  project: ChooserProject;
  tasks: ChooserTask[];
  isFavorite: boolean;
  searchExpandProject: boolean;
};

export type ChooserClientGroup = {
  clientName: string;
  projects: ChooserProjectGroup[];
  searchExpandClient: boolean;
};

export type ChooserSections = {
  favorites: ChooserProjectGroup[];
  clientGroups: ChooserClientGroup[];
};

function sortTasksByTitle(left: ChooserTask, right: ChooserTask) {
  return left.title.localeCompare(right.title);
}

export function buildAgencyTaskChooserSections(input: {
  projects: ChooserProject[];
  tasks: ChooserTask[];
  favoriteProjectIds: string[];
  favoriteTaskIds: string[];
  searchTerm: string;
}): ChooserSections {
  const tokens = tokenizeChooserQuery(input.searchTerm);
  const searching = tokens.length > 0;
  const projectsById = new Map(input.projects.map((project) => [project.id, project]));
  const favoriteProjectIdSet = new Set(input.favoriteProjectIds);

  const tasksByProjectId = new Map<string, ChooserTask[]>();
  for (const task of input.tasks) {
    const existing = tasksByProjectId.get(task.projectId) ?? [];
    existing.push(task);
    tasksByProjectId.set(task.projectId, existing);
  }
  for (const [projectId, projectTasks] of tasksByProjectId) {
    tasksByProjectId.set(projectId, [...projectTasks].sort(sortTasksByTitle));
  }

  function tasksForProject(
    project: ChooserProject,
    projectTasks: ChooserTask[],
  ): { tasks: ChooserTask[]; searchExpandProject: boolean } | null {
    if (!searching) return { tasks: projectTasks, searchExpandProject: false };
    const matchingTasks = projectTasks.filter(
      (task) =>
        chooserPathMatches(
          { clientName: project.clientName, projectName: project.name, taskTitle: task.title },
          tokens,
        ) && chooserFieldHits(task.title, tokens),
    );
    const projectPathMatches = chooserPathMatches(
      { clientName: project.clientName, projectName: project.name },
      tokens,
    );
    if (!projectPathMatches && matchingTasks.length === 0) {
      return null;
    }
    const { expandProject } = chooserSearchExpand({
      client: chooserFieldHits(project.clientName, tokens),
      project: chooserFieldHits(project.name, tokens),
      task: matchingTasks.length > 0,
    });
    // Task-title hits: show only those tasks and auto-expand.
    // Client/project-only hits: keep all tasks so expanding the row still lists them.
    return {
      tasks: matchingTasks.length > 0 ? matchingTasks : projectTasks,
      searchExpandProject: expandProject,
    };
  }

  function toProjectGroup(
    project: ChooserProject,
    isFavorite: boolean,
  ): ChooserProjectGroup | null {
    const allTasks = tasksByProjectId.get(project.id) ?? [];
    const filtered = tasksForProject(project, allTasks);
    if (!filtered) return null;
    return {
      project,
      tasks: filtered.tasks,
      isFavorite,
      searchExpandProject: filtered.searchExpandProject,
    };
  }

  const favoriteProjects: ChooserProjectGroup[] = [];
  const seenFavoriteProjectIds = new Set<string>();

  for (const projectId of input.favoriteProjectIds) {
    const project = projectsById.get(projectId);
    if (!project || seenFavoriteProjectIds.has(project.id)) continue;
    const group = toProjectGroup(project, true);
    if (!group) continue;
    seenFavoriteProjectIds.add(project.id);
    favoriteProjects.push(group);
  }

  // Favorited tasks pull their project into favorites when the project itself isn't favorited.
  for (const taskId of input.favoriteTaskIds) {
    const task = input.tasks.find((entry) => entry.id === taskId);
    if (!task) continue;
    const project = projectsById.get(task.projectId);
    if (!project || seenFavoriteProjectIds.has(project.id)) continue;
    const group = toProjectGroup(project, favoriteProjectIdSet.has(project.id));
    if (!group) continue;
    seenFavoriteProjectIds.add(project.id);
    favoriteProjects.push(group);
  }

  const remainingProjects = input.projects
    .filter((project) => !seenFavoriteProjectIds.has(project.id))
    .sort(sortProjectsByClientThenName);

  const remainingGroupsByProjectId = new Map<string, ChooserProjectGroup>();
  for (const project of remainingProjects) {
    const group = toProjectGroup(project, favoriteProjectIdSet.has(project.id));
    if (group) remainingGroupsByProjectId.set(project.id, group);
  }

  const clientGroups = groupItemsByClient(
    remainingProjects.filter((project) => remainingGroupsByProjectId.has(project.id)),
  ).map((group) => {
    const projects = group.projects
      .map((project) => remainingGroupsByProjectId.get(project.id))
      .filter((entry): entry is ChooserProjectGroup => entry != null);
    return {
      clientName: group.clientName || "No client",
      projects,
      searchExpandClient: chooserSearchExpand({
        client: chooserFieldHits(group.clientName || "No client", tokens),
        project: projects.some((entry) => chooserFieldHits(entry.project.name, tokens)),
        task: projects.some((entry) => entry.searchExpandProject),
      }).expandClient,
    };
  });

  return {
    favorites: favoriteProjects,
    clientGroups,
  };
}
