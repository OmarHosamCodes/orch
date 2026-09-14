import { create } from "zustand";

import type { AgencyProjectTask } from "@orch/api/schemas/agency-ops";
import {
  createEmptyListOverlay,
  pruneListOverlay,
  type AgencyListOverlay,
} from "@/features/shared/agency-optimistic-merge";
import { taskMatchesQueryInput } from "@/features/shared/agency-query-cache";

export type AgencyOptimisticClient = {
  id: string;
  teamId: string;
  name: string;
  category: "internal" | "external";
  billableRateAmount: number | null;
  sourceBillableRateAmount: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type AgencyOptimisticProject = {
  id: string;
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AgencyOptimisticTask = AgencyProjectTask;

type AgencyOptimisticTag = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AgencyOptimisticTimeEntry = {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  projectName: string;
  clientId: string;
  clientName: string;
  source: "timer" | "manual";
  description: string;
  tags: AgencyOptimisticTag[];
  links: Array<{ id: string; url: string }>;
  isBillable: boolean;
  isWaste: boolean;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type AgencyOptimisticActiveTimer = {
  id: string;
  teamId: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  projectName: string;
  description: string;
  tags: AgencyOptimisticTag[];
  links: Array<{ id: string; url: string }>;
  isBillable: boolean;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyOptimisticContact = {
  id: string;
  teamId: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

type CapacityCellKey = string;

type AgencyOptimisticState = {
  clients: Record<string, AgencyListOverlay<AgencyOptimisticClient>>;
  projects: Record<string, AgencyListOverlay<AgencyOptimisticProject>>;
  tasks: Record<string, AgencyListOverlay<AgencyOptimisticTask>>;
  timeEntries: Record<string, AgencyListOverlay<AgencyOptimisticTimeEntry>>;
  activeTimers: Record<string, AgencyOptimisticActiveTimer | null | undefined>;
  contacts: Record<string, AgencyOptimisticContact>;
  capacityCells: Record<CapacityCellKey, number>;

  upsertClient: (teamId: string, client: AgencyOptimisticClient) => void;
  updateClient: (teamId: string, clientId: string, patch: Partial<AgencyOptimisticClient>) => void;
  deleteClient: (teamId: string, clientId: string) => void;
  reconcileClient: (teamId: string, optimisticId: string, created: AgencyOptimisticClient) => void;
  pruneClients: (teamId: string, serverItems: AgencyOptimisticClient[]) => void;
  snapshotClients: (teamId: string) => AgencyListOverlay<AgencyOptimisticClient>;
  restoreClients: (teamId: string, snapshot: AgencyListOverlay<AgencyOptimisticClient>) => void;

  upsertProject: (teamId: string, project: AgencyOptimisticProject) => void;
  deleteProject: (teamId: string, projectId: string) => void;
  reconcileProject: (
    teamId: string,
    optimisticId: string,
    created: AgencyOptimisticProject,
  ) => void;
  pruneProjects: (teamId: string, serverItems: AgencyOptimisticProject[]) => void;
  snapshotProjects: (teamId: string) => AgencyListOverlay<AgencyOptimisticProject>;
  restoreProjects: (teamId: string, snapshot: AgencyListOverlay<AgencyOptimisticProject>) => void;

  upsertTask: (teamId: string, task: AgencyOptimisticTask) => void;
  deleteTask: (teamId: string, taskId: string) => void;
  reconcileTask: (teamId: string, optimisticId: string, created: AgencyOptimisticTask) => void;
  pruneTasks: (teamId: string, serverItems: AgencyOptimisticTask[]) => void;
  snapshotTasks: (teamId: string) => AgencyListOverlay<AgencyOptimisticTask>;
  restoreTasks: (teamId: string, snapshot: AgencyListOverlay<AgencyOptimisticTask>) => void;
  findTask: (teamId: string, taskId: string) => AgencyOptimisticTask | null;

  upsertTimeEntry: (teamId: string, entry: AgencyOptimisticTimeEntry) => void;
  deleteTimeEntries: (teamId: string, entryIds: string[]) => void;
  reconcileTimeEntry: (
    teamId: string,
    optimisticId: string,
    created: AgencyOptimisticTimeEntry,
  ) => void;
  pruneTimeEntries: (teamId: string, serverItems: AgencyOptimisticTimeEntry[]) => void;
  snapshotTimeEntries: (teamId: string) => AgencyListOverlay<AgencyOptimisticTimeEntry>;
  restoreTimeEntries: (
    teamId: string,
    snapshot: AgencyListOverlay<AgencyOptimisticTimeEntry>,
  ) => void;

  setActiveTimer: (teamId: string, timer: AgencyOptimisticActiveTimer | null) => void;
  clearActiveTimer: (teamId: string) => void;
  snapshotActiveTimer: (teamId: string) => AgencyOptimisticActiveTimer | null | undefined;
  restoreActiveTimer: (
    teamId: string,
    timer: AgencyOptimisticActiveTimer | null | undefined,
  ) => void;

  setContact: (teamId: string, clientId: string, contact: AgencyOptimisticContact) => void;
  clearContact: (teamId: string, clientId: string) => void;

  setCapacityCell: (
    teamId: string,
    weekStart: string,
    userId: string,
    capacitySeconds: number,
  ) => void;
  clearCapacityCell: (teamId: string, weekStart: string, userId: string) => void;

  resetTeam: (teamId: string) => void;
};

function contactKey(teamId: string, clientId: string) {
  return `${teamId}:${clientId}`;
}

function capacityKey(teamId: string, weekStart: string, userId: string) {
  return `${teamId}:${weekStart}:${userId}`;
}

function getListOverlay<T extends { id: string }>(
  bucket: Record<string, AgencyListOverlay<T>>,
  teamId: string,
): AgencyListOverlay<T> {
  return bucket[teamId] ?? createEmptyListOverlay<T>();
}

function setListOverlay<T extends { id: string }>(
  bucket: Record<string, AgencyListOverlay<T>>,
  teamId: string,
  overlay: AgencyListOverlay<T>,
): Record<string, AgencyListOverlay<T>> {
  const isEmpty =
    Object.keys(overlay.upserts).length === 0 &&
    Object.keys(overlay.deletedIds).length === 0 &&
    Object.keys(overlay.idMap).length === 0;

  if (isEmpty) {
    if (!(teamId in bucket)) {
      return bucket;
    }
    const next = { ...bucket };
    delete next[teamId];
    return next;
  }

  return { ...bucket, [teamId]: overlay };
}

function upsertListItem<T extends { id: string }>(
  overlay: AgencyListOverlay<T>,
  item: T,
): AgencyListOverlay<T> {
  return {
    ...overlay,
    upserts: { ...overlay.upserts, [item.id]: item },
    deletedIds: Object.fromEntries(
      Object.entries(overlay.deletedIds).filter(([id]) => id !== item.id),
    ),
  };
}

function deleteListItem<T extends { id: string }>(
  overlay: AgencyListOverlay<T>,
  id: string,
): AgencyListOverlay<T> {
  const nextUpserts = { ...overlay.upserts };
  delete nextUpserts[id];

  const nextIdMap = { ...overlay.idMap };
  delete nextIdMap[id];
  for (const [optimisticId, realId] of Object.entries(nextIdMap)) {
    if (realId === id) {
      delete nextIdMap[optimisticId];
    }
  }

  return {
    upserts: nextUpserts,
    deletedIds: { ...overlay.deletedIds, [id]: true },
    idMap: nextIdMap,
  };
}

function reconcileListItem<T extends { id: string }>(
  overlay: AgencyListOverlay<T>,
  optimisticId: string,
  created: T,
): AgencyListOverlay<T> {
  if (!created?.id) {
    return overlay;
  }

  const nextUpserts = { ...overlay.upserts };
  delete nextUpserts[optimisticId];
  nextUpserts[created.id] = created;

  return {
    upserts: nextUpserts,
    deletedIds: overlay.deletedIds,
    idMap: { ...overlay.idMap, [optimisticId]: created.id },
  };
}

function updateListItem<T extends { id: string }>(
  overlay: AgencyListOverlay<T>,
  id: string,
  patch: Partial<T>,
  fallback?: T,
): AgencyListOverlay<T> {
  const current = overlay.upserts[id] ?? fallback;
  if (!current) {
    return overlay;
  }

  return upsertListItem(overlay, { ...current, ...patch });
}

export const useAgencyOptimisticStore = create<AgencyOptimisticState>((set, get) => ({
  clients: {},
  projects: {},
  tasks: {},
  timeEntries: {},
  activeTimers: {},
  contacts: {},
  capacityCells: {},

  upsertClient: (teamId, client) =>
    set((state) => ({
      clients: setListOverlay(
        state.clients,
        teamId,
        upsertListItem(getListOverlay(state.clients, teamId), client),
      ),
    })),

  updateClient: (teamId, clientId, patch) =>
    set((state) => {
      const overlay = getListOverlay(state.clients, teamId);
      const current = overlay.upserts[clientId];
      if (!current) {
        return {
          clients: setListOverlay(
            state.clients,
            teamId,
            upsertListItem(overlay, {
              id: clientId,
              teamId,
              name: patch.name ?? "",
              category: patch.category ?? "external",
              billableRateAmount: patch.billableRateAmount ?? null,
              sourceBillableRateAmount:
                patch.sourceBillableRateAmount ?? patch.billableRateAmount ?? null,
              currency: patch.currency ?? "USD",
              createdAt: patch.createdAt ?? new Date().toISOString(),
              updatedAt: patch.updatedAt ?? new Date().toISOString(),
            }),
          ),
        };
      }
      return {
        clients: setListOverlay(
          state.clients,
          teamId,
          updateListItem(overlay, clientId, patch, current),
        ),
      };
    }),

  deleteClient: (teamId, clientId) =>
    set((state) => ({
      clients: setListOverlay(
        state.clients,
        teamId,
        deleteListItem(getListOverlay(state.clients, teamId), clientId),
      ),
    })),

  reconcileClient: (teamId, optimisticId, created) =>
    set((state) => ({
      clients: setListOverlay(
        state.clients,
        teamId,
        reconcileListItem(getListOverlay(state.clients, teamId), optimisticId, created),
      ),
    })),

  pruneClients: (teamId, serverItems) =>
    set((state) => {
      const pruned = pruneListOverlay(getListOverlay(state.clients, teamId), serverItems);
      return { clients: setListOverlay(state.clients, teamId, pruned) };
    }),

  snapshotClients: (teamId) => structuredClone(getListOverlay(get().clients, teamId)),
  restoreClients: (teamId, snapshot) =>
    set((state) => ({ clients: setListOverlay(state.clients, teamId, snapshot) })),

  upsertProject: (teamId, project) =>
    set((state) => ({
      projects: setListOverlay(
        state.projects,
        teamId,
        upsertListItem(getListOverlay(state.projects, teamId), project),
      ),
    })),

  deleteProject: (teamId, projectId) =>
    set((state) => ({
      projects: setListOverlay(
        state.projects,
        teamId,
        deleteListItem(getListOverlay(state.projects, teamId), projectId),
      ),
    })),

  reconcileProject: (teamId, optimisticId, created) =>
    set((state) => ({
      projects: setListOverlay(
        state.projects,
        teamId,
        reconcileListItem(getListOverlay(state.projects, teamId), optimisticId, created),
      ),
    })),

  pruneProjects: (teamId, serverItems) =>
    set((state) => {
      const pruned = pruneListOverlay(getListOverlay(state.projects, teamId), serverItems);
      return { projects: setListOverlay(state.projects, teamId, pruned) };
    }),

  snapshotProjects: (teamId) => structuredClone(getListOverlay(get().projects, teamId)),
  restoreProjects: (teamId, snapshot) =>
    set((state) => ({ projects: setListOverlay(state.projects, teamId, snapshot) })),

  upsertTask: (teamId, task) =>
    set((state) => ({
      tasks: setListOverlay(
        state.tasks,
        teamId,
        upsertListItem(getListOverlay(state.tasks, teamId), task),
      ),
    })),

  deleteTask: (teamId, taskId) =>
    set((state) => ({
      tasks: setListOverlay(
        state.tasks,
        teamId,
        deleteListItem(getListOverlay(state.tasks, teamId), taskId),
      ),
    })),

  reconcileTask: (teamId, optimisticId, created) =>
    set((state) => ({
      tasks: setListOverlay(
        state.tasks,
        teamId,
        reconcileListItem(getListOverlay(state.tasks, teamId), optimisticId, created),
      ),
    })),

  pruneTasks: (teamId, serverItems) =>
    set((state) => {
      const pruned = pruneListOverlay(
        getListOverlay(state.tasks, teamId),
        serverItems,
        (server, optimistic) => {
          // Keep local completion / status until the server catches up.
          if ((server.viewerCompletionCount ?? 0) < (optimistic.viewerCompletionCount ?? 0)) {
            return false;
          }
          if (optimistic.status === "in_progress" && server.status === "open") {
            return false;
          }
          if (
            optimistic.viewerStatus === "in_progress" &&
            server.viewerStatus !== "in_progress" &&
            server.status !== "in_progress"
          ) {
            return false;
          }
          if (optimistic.viewerStatus === "done" && server.viewerStatus !== "done") {
            return false;
          }
          if (optimistic.updatedAt && server.updatedAt && server.updatedAt < optimistic.updatedAt) {
            return false;
          }
          return true;
        },
      );
      return { tasks: setListOverlay(state.tasks, teamId, pruned) };
    }),

  snapshotTasks: (teamId) => structuredClone(getListOverlay(get().tasks, teamId)),
  restoreTasks: (teamId, snapshot) =>
    set((state) => ({ tasks: setListOverlay(state.tasks, teamId, snapshot) })),

  findTask: (teamId, taskId) => {
    const overlay = getListOverlay(get().tasks, teamId);
    if (overlay.upserts[taskId]) {
      return overlay.upserts[taskId];
    }
    for (const [optimisticId, realId] of Object.entries(overlay.idMap)) {
      if (realId === taskId && overlay.upserts[optimisticId]) {
        return overlay.upserts[optimisticId];
      }
    }
    return null;
  },

  upsertTimeEntry: (teamId, entry) =>
    set((state) => ({
      timeEntries: setListOverlay(
        state.timeEntries,
        teamId,
        upsertListItem(getListOverlay(state.timeEntries, teamId), entry),
      ),
    })),

  deleteTimeEntries: (teamId, entryIds) =>
    set((state) => {
      let overlay = getListOverlay(state.timeEntries, teamId);
      for (const entryId of entryIds) {
        overlay = deleteListItem(overlay, entryId);
      }
      return { timeEntries: setListOverlay(state.timeEntries, teamId, overlay) };
    }),

  reconcileTimeEntry: (teamId, optimisticId, created) =>
    set((state) => ({
      timeEntries: setListOverlay(
        state.timeEntries,
        teamId,
        reconcileListItem(getListOverlay(state.timeEntries, teamId), optimisticId, created),
      ),
    })),

  pruneTimeEntries: (teamId, serverItems) =>
    set((state) => {
      const pruned = pruneListOverlay(getListOverlay(state.timeEntries, teamId), serverItems);
      return { timeEntries: setListOverlay(state.timeEntries, teamId, pruned) };
    }),

  snapshotTimeEntries: (teamId) => structuredClone(getListOverlay(get().timeEntries, teamId)),
  restoreTimeEntries: (teamId, snapshot) =>
    set((state) => ({ timeEntries: setListOverlay(state.timeEntries, teamId, snapshot) })),

  setActiveTimer: (teamId, timer) =>
    set((state) => ({
      activeTimers: { ...state.activeTimers, [teamId]: timer },
    })),

  clearActiveTimer: (teamId) =>
    set((state) => {
      const next = { ...state.activeTimers };
      delete next[teamId];
      return { activeTimers: next };
    }),

  snapshotActiveTimer: (teamId) => get().activeTimers[teamId],
  restoreActiveTimer: (teamId, timer) =>
    set((state) => {
      const next = { ...state.activeTimers };
      if (timer === undefined) {
        delete next[teamId];
      } else {
        next[teamId] = timer;
      }
      return { activeTimers: next };
    }),

  setContact: (teamId, clientId, contact) =>
    set((state) => ({
      contacts: { ...state.contacts, [contactKey(teamId, clientId)]: contact },
    })),

  clearContact: (teamId, clientId) =>
    set((state) => {
      const key = contactKey(teamId, clientId);
      if (!(key in state.contacts)) return state;
      const next = { ...state.contacts };
      delete next[key];
      return { contacts: next };
    }),

  setCapacityCell: (teamId, weekStart, userId, capacitySeconds) =>
    set((state) => ({
      capacityCells: {
        ...state.capacityCells,
        [capacityKey(teamId, weekStart, userId)]: capacitySeconds,
      },
    })),

  clearCapacityCell: (teamId, weekStart, userId) =>
    set((state) => {
      const key = capacityKey(teamId, weekStart, userId);
      if (!(key in state.capacityCells)) return state;
      const next = { ...state.capacityCells };
      delete next[key];
      return { capacityCells: next };
    }),

  resetTeam: (teamId) =>
    set((state) => {
      const nextClients = { ...state.clients };
      const nextProjects = { ...state.projects };
      const nextTasks = { ...state.tasks };
      const nextEntries = { ...state.timeEntries };
      const nextTimers = { ...state.activeTimers };
      delete nextClients[teamId];
      delete nextProjects[teamId];
      delete nextTasks[teamId];
      delete nextEntries[teamId];
      delete nextTimers[teamId];

      const nextContacts = { ...state.contacts };
      for (const key of Object.keys(nextContacts)) {
        if (key.startsWith(`${teamId}:`)) {
          delete nextContacts[key];
        }
      }

      const nextCapacity = { ...state.capacityCells };
      for (const key of Object.keys(nextCapacity)) {
        if (key.startsWith(`${teamId}:`)) {
          delete nextCapacity[key];
        }
      }

      return {
        clients: nextClients,
        projects: nextProjects,
        tasks: nextTasks,
        timeEntries: nextEntries,
        activeTimers: nextTimers,
        contacts: nextContacts,
        capacityCells: nextCapacity,
      };
    }),
}));

export function projectMatchesClientFilter(project: AgencyOptimisticProject, clientId?: string) {
  if (!clientId) return true;
  return project.clientId === clientId;
}

export function taskMatchesAgencyFilters(
  task: AgencyOptimisticTask,
  filters: {
    projectId?: string;
    assigneeUserId?: string;
    delegatedByUserId?: string;
    journeyDiscoveryForUserId?: string;
    statuses?: AgencyOptimisticTask["status"][];
  },
) {
  return taskMatchesQueryInput(task, {
    projectId: filters.projectId,
    assigneeUserId: filters.assigneeUserId,
    delegatedByUserId: filters.delegatedByUserId,
    journeyDiscoveryForUserId: filters.journeyDiscoveryForUserId,
    statuses: filters.statuses,
  });
}
