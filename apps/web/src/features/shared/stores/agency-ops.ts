/**
 * Agency Ops Store — optimistic updates for clients and projects.
 */
import { create } from "zustand";
import { toast } from "sonner";

import { getQueryClient } from "@/lib/query-client";
import { authClient } from "@/lib/auth-client";
import { orpc, orpcClient } from "@/lib/orpc";
import {
  cancelAgencyProjectTaskListQueries,
  findProjectTaskInCache,
  findProjectTaskInCacheByTitle,
  patchDeletedProjectTaskInCache,
  patchInsertedProjectTaskInCache,
  patchProjectTaskBlueprintDescriptionInCache,
  patchUpdatedProjectTaskInCache,
  reconcileCreatedProjectTaskInCache,
  refetchAgencyProjectTaskListQueries,
} from "@/features/shared/agency-query-cache";
import {
  toggleAgencyFavorite,
  type ToggleFavoritePayload,
} from "@/features/shared/stores/agency-favorites";
import { restoreQuerySnapshots, snapshotQueries } from "@/features/shared/query-snapshots";
import { useAgencyOptimisticStore } from "@/features/shared/stores/agency-optimistic";
import type { AgencyProjectJourney, AgencyProjectTask } from "@orch/api/schemas/agency-ops";
import { getErrorMessage } from "@/lib/utils/get-error-message";

async function invalidateAgencyPayoutQueries(options?: { scoreboard?: boolean }) {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.agencyOps.payouts.list.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.agencyOps.payouts.summary.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.agencyOps.payouts.getRun.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.agencyOps.periodObligations.list.key() }),
    ...(options?.scoreboard
      ? [queryClient.invalidateQueries({ queryKey: orpc.agencyOps.money.periodScoreboard.key() })]
      : []),
  ]);
}

// Shared types (mirrored from API shapes — keep in sync with oRPC output)
// ---------------------------------------------------------------------------

type AgencyClient = {
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

type AgencyProject = {
  id: string;
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  colorHueId: number | null;
  billableRateAmount: number | null;
  sourceBillableRateAmount: number | null;
  currency: string;
  clientBillableRateAmount: number | null;
  clientSourceBillableRateAmount: number | null;
  clientCurrency: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AgencyClientsListQueryData = {
  items: AgencyClient[];
  page: number;
  pageSize: number;
  total: number;
};

type AgencyProjectsListQueryData = {
  items: AgencyProject[];
  page: number;
  pageSize: number;
  total: number;
};

type QueryKey = readonly unknown[];

type RegisteredClientsQuery = {
  queryKey: QueryKey;
  teamId: string;
};

type RegisteredProjectsQuery = {
  queryKey: QueryKey;
  teamId: string;
  /** When set, only patches for matching clientId are applied. */
  clientId?: string;
};

type RegisteredProjectTasksQuery = {
  queryKey: QueryKey;
  teamId: string;
  projectId?: string;
  assigneeUserId?: string;
  statuses?: AgencyProjectTask["status"][];
};

type RegisteredCapacityQuery = {
  queryKey: QueryKey;
  teamId: string;
};

type AgencyContact = {
  id: string;
  teamId: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyCapacityListQueryData = {
  weeks: Array<{
    weekStart: string;
    members: Array<{
      userId: string;
      userName: string;
      capacitySeconds: number;
      bookedSeconds: number;
      loggedSeconds: number;
    }>;
  }>;
};

type RegisteredContactQuery = {
  queryKey: QueryKey;
  teamId: string;
  clientId: string;
};

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

type CreateClientPayload = {
  teamId: string;
  name: string;
  category?: "internal" | "external";
  billableRateAmount?: number | null;
  currency?: string;
};

type UpdateClientPayload = {
  teamId: string;
  clientId: string;
  name?: string;
  category?: "internal" | "external";
  billableRateAmount?: number | null;
  currency?: string;
};

type CreateProjectPayload = {
  teamId: string;
  clientId: string;
  /** Used to fill the optimistic row's clientName field. */
  clientName: string;
  name: string;
  colorHueId?: number | null;
  templateId?: string;
};

type CreateProjectWithJourneyMilestonePayload = {
  title: string;
  assigneeUserIds: string[];
};

type CreateProjectWithJourneyPayload = {
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  milestones: CreateProjectWithJourneyMilestonePayload[];
};

type CreateProjectTaskPayload = {
  teamId: string;
  projectId: string;
  title: string;
  status?: "open" | "in_progress" | "done" | "archived";
  assignedToTeam?: boolean;
  assigneeUserIds?: string[];
  dueDate?: string;
  estimateMinutes?: number | null;
  description?: string;
  /** True when an open/in-progress task with this title already exists on the project. */
  reusesExistingTitle?: boolean;
  /** Skip the default success toast (caller announces instead). */
  successToast?: false;
  /** Fires with the row id as soon as the optimistic Active row is written. */
  onOptimisticId?: (taskId: string) => void;
  /** Fires with the persisted task after the API succeeds. */
  onCreated?: (task: AgencyProjectTask) => void;
};

type UpdateProjectTaskBlueprintPayload = {
  teamId: string;
  blueprintId: string;
  description: string;
};

type DeleteProjectTaskPayload = {
  teamId: string;
  taskId: string;
  taskTitle: string;
};

type UpdateProjectTaskPayload = {
  teamId: string;
  taskId: string;
  title?: string;
  status?: AgencyProjectTask["status"];
  assignedToTeam?: boolean;
  assigneeUserIds?: string[];
  dueDate?: string | null;
  estimateMinutes?: number | null;
  billableRateAmount?: number | null;
  currency?: string;
};

type ArchiveClientPayload = {
  teamId: string;
  clientId: string;
  clientName: string;
};

type DeleteProjectPayload = {
  teamId: string;
  projectId: string;
  projectName: string;
};

type RestoreProjectPayload = {
  teamId: string;
  projectId: string;
  projectName: string;
};

type UpdateProjectPayload = {
  teamId: string;
  projectId: string;
  billableRateAmount?: number | null;
  currency?: string;
};

type UpsertContactPayload = {
  teamId: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
};

type UpsertRatePayload = {
  teamId: string;
  userId: string;
  costRateAmount: number | null;
  billableRateAmount: number | null;
  currency?: string;
  effectiveFrom?: string;
};

type SetCapacityPayload = {
  teamId: string;
  userId: string;
  weekStart: string;
  capacitySeconds: number;
};

type CreateInvoicePayload = {
  teamId: string;
  clientId: string;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  currency?: string;
};

type CreatePayoutFromMemberPayload = {
  teamId: string;
  userId: string;
  userName: string;
  periodStart: string;
  periodEnd: string;
  currency?: string;
};

type CreateExpensePayload = {
  teamId: string;
  name: string;
  kind: "one_time" | "subscription";
  period?: "weekly" | "monthly" | "quarterly" | "yearly" | null;
  note?: string;
  amount: number;
  amountMode?: "fixed" | "variable";
  currency?: string;
  fxRate?: string;
  startsAt?: string | null;
  occurredAt?: string | null;
};

type UpdateExpensePayload = {
  teamId: string;
  expenseId: string;
  name?: string;
  kind?: "one_time" | "subscription";
  note?: string;
  amount?: number;
  amountMode?: "fixed" | "variable";
  currency?: string;
  fxRate?: string;
  period?: "weekly" | "monthly" | "quarterly" | "yearly" | null;
  startsAt?: string | null;
  occurredAt?: string | null;
};

type CreatePayoutLinePayload = {
  teamId: string;
  periodStart: string;
  periodEnd: string;
  sectionKey:
    | "salaries"
    | "team_loss"
    | "device_comp"
    | "paid_vacation"
    | "debt_discount"
    | "charity"
    | "pbc"
    | "extra";
  label: string;
  amount: number;
  payeeUserId?: string | null;
  currency?: string;
  cohortKey?: string | null;
};

type AgencyOpsActions = ReturnType<typeof createAgencyOpsActions>;

export type AgencyOpsState = {
  clientMutationCount: number;
  projectMutationCount: number;
  isCreatingTask: boolean;
  pendingTaskIds: string[];
  deletingTaskIds: string[];
  contactMutationCount: number;
  rateMutationCount: number;
  capacityMutationCount: number;
  invoiceMutationCount: number;
} & AgencyOpsActions;

function createAgencyOpsActions(
  set: (
    partial: Partial<AgencyOpsState> | ((state: AgencyOpsState) => Partial<AgencyOpsState>),
  ) => void,
  _get: () => AgencyOpsState,
) {
  // Pending-mutation counters exposed so components can disable buttons.

  // Query registries (Map key = JSON.stringify(queryKey)).
  // Refcounted so concurrently-mounted components sharing the same query key
  // don't evict one another's registration on unmount.
  type RefCounted<T> = { payload: T; count: number };
  const clientsQueryRegistry = new Map<string, RefCounted<RegisteredClientsQuery>>();
  const projectsQueryRegistry = new Map<string, RefCounted<RegisteredProjectsQuery>>();
  const projectTasksQueryRegistry = new Map<string, RefCounted<RegisteredProjectTasksQuery>>();
  const contactsQueryRegistry = new Map<string, RefCounted<RegisteredContactQuery>>();
  const capacityQueryRegistry = new Map<string, RefCounted<RegisteredCapacityQuery>>();

  function optimistic() {
    return useAgencyOptimisticStore.getState();
  }

  // ---------------------------------------------------------------------------
  // Registry helpers
  // ---------------------------------------------------------------------------

  function registryKey(queryKey: QueryKey) {
    return JSON.stringify(queryKey);
  }

  function registerInto<T>(registry: Map<string, RefCounted<T>>, key: string, payload: T) {
    const existing = registry.get(key);
    if (existing) {
      existing.count += 1;
      // Refresh payload in case anything but the queryKey content varies.
      existing.payload = payload;
    } else {
      registry.set(key, { payload, count: 1 });
    }
  }

  function unregisterFrom<T>(registry: Map<string, RefCounted<T>>, key: string) {
    const existing = registry.get(key);
    if (!existing) return;
    existing.count -= 1;
    if (existing.count <= 0) registry.delete(key);
  }

  function registryPayloads<T>(registry: Map<string, RefCounted<T>>): T[] {
    return [...registry.values()].map((entry) => entry.payload);
  }

  function registerClientsQuery(payload: RegisteredClientsQuery) {
    registerInto(clientsQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterClientsQuery(queryKey: QueryKey) {
    unregisterFrom(clientsQueryRegistry, registryKey(queryKey));
  }

  function registerProjectsQuery(payload: RegisteredProjectsQuery) {
    registerInto(projectsQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterProjectsQuery(queryKey: QueryKey) {
    unregisterFrom(projectsQueryRegistry, registryKey(queryKey));
  }

  function registerProjectTasksQuery(payload: RegisteredProjectTasksQuery) {
    registerInto(projectTasksQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterProjectTasksQuery(queryKey: QueryKey) {
    unregisterFrom(projectTasksQueryRegistry, registryKey(queryKey));
  }

  function registerContactQuery(payload: RegisteredContactQuery) {
    registerInto(contactsQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterContactQuery(queryKey: QueryKey) {
    unregisterFrom(contactsQueryRegistry, registryKey(queryKey));
  }

  function registerCapacityQuery(payload: RegisteredCapacityQuery) {
    registerInto(capacityQueryRegistry, registryKey(payload.queryKey), payload);
  }

  function unregisterCapacityQuery(queryKey: QueryKey) {
    unregisterFrom(capacityQueryRegistry, registryKey(queryKey));
  }

  // ---------------------------------------------------------------------------
  // Optimistic ID generator
  // ---------------------------------------------------------------------------

  function optimisticId(prefix: string) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // ---------------------------------------------------------------------------
  // Clients cache patchers
  // ---------------------------------------------------------------------------

  function patchInsertedClient(teamId: string, client: AgencyClient) {
    optimistic().upsertClient(teamId, client);
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyClientsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          const exists = current.items.some((item) => item.id === client.id);
          if (exists) {
            return {
              ...current,
              items: current.items.map((item) =>
                item.id === client.id ? { ...item, ...client } : item,
              ),
            };
          }
          return {
            ...current,
            items: [client, ...current.items],
            total: current.total + 1,
          };
        },
      );
    });
  }

  function patchUpdatedClient(teamId: string, clientId: string, patch: Partial<AgencyClient>) {
    optimistic().updateClient(teamId, clientId, patch);
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyClientsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((c) => (c.id === clientId ? { ...c, ...patch } : c)),
          };
        },
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Projects cache patchers
  // ---------------------------------------------------------------------------

  function patchInsertedProject(teamId: string, project: AgencyProject) {
    optimistic().upsertProject(teamId, project);
    projectsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      // If the registry entry is scoped to a specific clientId, only patch
      // if it matches (or if it's a catch-all listing all clients).
      if (reg.clientId && reg.clientId !== project.clientId) return;
      getQueryClient().setQueryData<AgencyProjectsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: [project, ...current.items],
            total: current.total + 1,
          };
        },
      );
    });
  }

  function patchRemovedProject(teamId: string, projectId: string) {
    optimistic().deleteProject(teamId, projectId);
    projectsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyProjectsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          const nextItems = current.items.filter((project) => project.id !== projectId);
          if (nextItems.length === current.items.length) return current;
          return {
            ...current,
            items: nextItems,
            total: Math.max(0, current.total - 1),
          };
        },
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Project tasks cache patchers
  // ---------------------------------------------------------------------------

  function patchInsertedProjectTask(teamId: string, task: AgencyProjectTask) {
    optimistic().upsertTask(teamId, task);
    patchInsertedProjectTaskInCache(teamId, task);
  }

  function patchUpdatedProjectTask(teamId: string, task: AgencyProjectTask) {
    optimistic().upsertTask(teamId, task);
    patchUpdatedProjectTaskInCache(teamId, task);
  }

  function patchDeletedProjectTask(teamId: string, taskId: string) {
    optimistic().deleteTask(teamId, taskId);
    patchDeletedProjectTaskInCache(teamId, taskId);
  }

  function syncProjectTaskQueriesAfterMutation(_teamId: string) {
    // Intentionally no-op. Refetching task lists after mutations overwrites
    // optimistic/server-patched completion counts with stale pages (see debug
    // session d9b705: counts roll back 8→7 / 2→1 after background refetch).
    // Mutations already write the authoritative task into the cache + overlay.
  }

  function patchUpsertedContact(teamId: string, clientId: string, contact: AgencyContact) {
    optimistic().setContact(teamId, clientId, contact);
    contactsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId || reg.clientId !== clientId) return;
      getQueryClient().setQueryData(reg.queryKey, contact);
    });
  }

  function patchCapacityCell(
    teamId: string,
    userId: string,
    weekStart: string,
    capacitySeconds: number,
  ) {
    optimistic().setCapacityCell(teamId, weekStart, userId, capacitySeconds);
    capacityQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyCapacityListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            weeks: current.weeks.map((week) => {
              if (week.weekStart !== weekStart) return week;
              return {
                ...week,
                members: week.members.map((member) =>
                  member.userId === userId ? { ...member, capacitySeconds } : member,
                ),
              };
            }),
          };
        },
      );
    });
  }

  function reconcileCreatedClient(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyClient,
  ) {
    optimistic().reconcileClient(teamId, optimisticIdValue, created);
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyClientsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((client) =>
              client.id === optimisticIdValue ? created : client,
            ),
          };
        },
      );
    });
  }

  function reconcileCreatedProject(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyProject,
  ) {
    optimistic().reconcileProject(teamId, optimisticIdValue, created);
    projectsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      if (reg.clientId && reg.clientId !== created.clientId) return;
      getQueryClient().setQueryData<AgencyProjectsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((project) =>
              project.id === optimisticIdValue ? created : project,
            ),
          };
        },
      );
    });
  }

  function reconcileCreatedTask(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyProjectTask,
  ) {
    optimistic().reconcileTask(teamId, optimisticIdValue, created);
    reconcileCreatedProjectTaskInCache(teamId, optimisticIdValue, created);
  }

  // ---------------------------------------------------------------------------
  // Public actions
  // ---------------------------------------------------------------------------

  async function createClient(
    payload: CreateClientPayload,
    callbacks?: {
      onSuccess?: (clientId: string) => void;
    },
  ) {
    if (!payload.teamId || !payload.name.trim()) return;

    const snapshots = snapshotQueries(registryPayloads(clientsQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotClients(payload.teamId);
    const nowIso = new Date().toISOString();
    const optimisticClient: AgencyClient = {
      id: optimisticId("client"),
      teamId: payload.teamId,
      name: payload.name.trim(),
      category: payload.category ?? "external",
      billableRateAmount: payload.billableRateAmount ?? null,
      sourceBillableRateAmount: payload.billableRateAmount ?? null,
      currency: payload.currency ?? "USD",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    set((state) => ({ ...state, clientMutationCount: state.clientMutationCount + 1 }));

    try {
      patchInsertedClient(payload.teamId, optimisticClient);

      const created = (await orpcClient.agencyOps.clients.create({
        teamId: payload.teamId,
        name: payload.name.trim(),
        category: payload.category,
        billableRateAmount: payload.billableRateAmount,
        currency: payload.currency,
      })) as AgencyClient;

      reconcileCreatedClient(payload.teamId, optimisticClient.id, created);
      callbacks?.onSuccess?.(created.id);

      toast.success("Client created", { description: payload.name.trim() });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreClients(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't create client", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        clientMutationCount: Math.max(0, state.clientMutationCount - 1),
      }));
    }
  }

  async function updateClient(payload: UpdateClientPayload) {
    if (!payload.teamId || !payload.clientId) return;

    const hasPatch =
      payload.name !== undefined ||
      payload.category !== undefined ||
      payload.billableRateAmount !== undefined ||
      payload.currency !== undefined;

    if (!hasPatch) return;

    const snapshots = snapshotQueries(registryPayloads(clientsQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotClients(payload.teamId);
    const nowIso = new Date().toISOString();
    const optimisticPatch: Partial<AgencyClient> = { updatedAt: nowIso };

    if (payload.name !== undefined) {
      optimisticPatch.name = payload.name.trim();
    }
    if (payload.category !== undefined) {
      optimisticPatch.category = payload.category;
    }
    if (payload.billableRateAmount !== undefined) {
      optimisticPatch.billableRateAmount = payload.billableRateAmount;
      optimisticPatch.sourceBillableRateAmount = payload.billableRateAmount;
    }
    if (payload.currency !== undefined) {
      optimisticPatch.currency = payload.currency;
    }

    set((state) => ({ ...state, clientMutationCount: state.clientMutationCount + 1 }));

    try {
      patchUpdatedClient(payload.teamId, payload.clientId, optimisticPatch);

      const updated = (await orpcClient.agencyOps.clients.update({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name: payload.name?.trim(),
        category: payload.category,
        billableRateAmount: payload.billableRateAmount,
        currency: payload.currency,
      })) as AgencyClient;

      patchUpdatedClient(payload.teamId, payload.clientId, updated);

      toast.success("Client updated", {
        description: updated.name,
      });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreClients(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't update client", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        clientMutationCount: Math.max(0, state.clientMutationCount - 1),
      }));
    }
  }

  async function createProject(payload: CreateProjectPayload): Promise<string | null> {
    if (!payload.teamId || !payload.clientId || !payload.name.trim()) return null;

    const snapshots = snapshotQueries(registryPayloads(projectsQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotProjects(payload.teamId);
    const nowIso = new Date().toISOString();
    const optimisticProject: AgencyProject = {
      id: optimisticId("project"),
      teamId: payload.teamId,
      clientId: payload.clientId,
      clientName: payload.clientName,
      name: payload.name.trim(),
      colorHueId: payload.colorHueId ?? null,
      billableRateAmount: null,
      sourceBillableRateAmount: null,
      currency: "USD",
      clientBillableRateAmount: null,
      clientSourceBillableRateAmount: null,
      clientCurrency: "USD",
      deletedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    set((state) => ({ ...state, projectMutationCount: state.projectMutationCount + 1 }));

    try {
      patchInsertedProject(payload.teamId, optimisticProject);

      const created = (await orpcClient.agencyOps.projects.create({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name: payload.name.trim(),
        colorHueId: payload.colorHueId,
        templateId: payload.templateId,
      })) as AgencyProject;

      reconcileCreatedProject(payload.teamId, optimisticProject.id, created);

      toast.success("Project added", { description: payload.name.trim() });
      return created.id;
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreProjects(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't add project", { description: getErrorMessage(error, "Try again.") });
      return null;
    } finally {
      set((state) => ({
        ...state,
        projectMutationCount: Math.max(0, state.projectMutationCount - 1),
      }));
    }
  }

  async function toggleFavorite(payload: ToggleFavoritePayload): Promise<boolean> {
    return toggleAgencyFavorite(payload);
  }

  function buildOptimisticJourneyTask(
    teamId: string,
    projectId: string,
    title: string,
    taskKind: AgencyProjectTask["taskKind"],
    assigneeUserIds: string[],
    createdByUserId: string,
    nowIso: string,
  ): AgencyProjectTask {
    const assigneeIds = [...new Set(assigneeUserIds)];
    return {
      id: optimisticId("agency-project-task"),
      teamId,
      projectId,
      title,
      status: "open",
      taskKind,
      assignedToTeam: false,
      isWaste: false,
      estimateMinutes: null,
      billableRateAmount: null,
      sourceBillableRateAmount: null,
      currency: "USD",
      projectBillableRateAmount: null,
      projectSourceBillableRateAmount: null,
      projectCurrency: "USD",
      clientBillableRateAmount: null,
      clientSourceBillableRateAmount: null,
      clientCurrency: "USD",
      createdByUserId,
      assignees: assigneeIds.map((userId) => ({
        userId,
        userName: "",
        userAvatar: null,
        status: "open" as const,
      })),
      viewerStatus: "open",
      viewerCompletionCount: 0,
      dueDate: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  function journeyMilestoneTasks(journey: AgencyProjectJourney): AgencyProjectTask[] {
    return journey.steps
      .map((step) => step.task)
      .filter((task): task is AgencyProjectTask => Boolean(task));
  }

  async function createProjectWithJourney(
    payload: CreateProjectWithJourneyPayload,
  ): Promise<string | null> {
    const name = payload.name.trim();
    const milestones = payload.milestones
      .map((milestone) => ({
        title: milestone.title.trim(),
        assigneeUserIds: [...new Set(milestone.assigneeUserIds)],
      }))
      .filter((milestone) => milestone.title.length > 0);

    if (!payload.teamId || !payload.clientId || !name || milestones.length === 0) {
      return null;
    }

    const snapshots = snapshotQueries([
      ...registryPayloads(projectsQueryRegistry),
      ...registryPayloads(projectTasksQueryRegistry),
    ]);
    const optimisticProjectSnapshot = optimistic().snapshotProjects(payload.teamId);
    const optimisticTaskSnapshot = optimistic().snapshotTasks(payload.teamId);
    const nowIso = new Date().toISOString();
    const createdByUserId = (await authClient.getSession()).data?.user?.id ?? "";
    const optimisticProject: AgencyProject = {
      id: optimisticId("project"),
      teamId: payload.teamId,
      clientId: payload.clientId,
      clientName: payload.clientName,
      name,
      colorHueId: null,
      billableRateAmount: null,
      sourceBillableRateAmount: null,
      currency: "USD",
      clientBillableRateAmount: null,
      clientSourceBillableRateAmount: null,
      clientCurrency: "USD",
      deletedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const allAssigneeIds = new Set<string>();
    for (const milestone of milestones) {
      for (const userId of milestone.assigneeUserIds) {
        allAssigneeIds.add(userId);
      }
    }

    const optimisticMilestoneTasks = milestones.map((milestone) =>
      buildOptimisticJourneyTask(
        payload.teamId,
        optimisticProject.id,
        milestone.title,
        "journey_milestone",
        milestone.assigneeUserIds,
        createdByUserId,
        nowIso,
      ),
    );
    const optimisticAnchorTask = buildOptimisticJourneyTask(
      payload.teamId,
      optimisticProject.id,
      name,
      "journey_anchor",
      [...allAssigneeIds],
      createdByUserId,
      nowIso,
    );
    const optimisticTasks = [...optimisticMilestoneTasks, optimisticAnchorTask];

    set((state) => ({ ...state, projectMutationCount: state.projectMutationCount + 1 }));

    try {
      await cancelAgencyProjectTaskListQueries(payload.teamId);
      patchInsertedProject(payload.teamId, optimisticProject);
      for (const task of optimisticTasks) {
        patchInsertedProjectTask(payload.teamId, task);
      }

      const result = await orpcClient.agencyOps.projects.createWithJourney({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name,
        milestones,
      });

      reconcileCreatedProject(payload.teamId, optimisticProject.id, result.project);

      const serverMilestoneTasks = journeyMilestoneTasks(result.journey);
      for (let index = 0; index < optimisticMilestoneTasks.length; index += 1) {
        const optimisticTask = optimisticMilestoneTasks[index];
        const createdTask = serverMilestoneTasks[index];
        if (optimisticTask && createdTask) {
          reconcileCreatedTask(payload.teamId, optimisticTask.id, createdTask);
        }
      }

      // Journey anchor is not linked to a step; refetch picks up the persisted row.
      optimistic().deleteTask(payload.teamId, optimisticAnchorTask.id);
      await refetchAgencyProjectTaskListQueries(payload.teamId);

      toast.success("Project added", { description: name });
      return result.project.id;
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreProjects(payload.teamId, optimisticProjectSnapshot);
      optimistic().restoreTasks(payload.teamId, optimisticTaskSnapshot);
      toast.error("Couldn't add project", { description: getErrorMessage(error, "Try again.") });
      return null;
    } finally {
      set((state) => ({
        ...state,
        projectMutationCount: Math.max(0, state.projectMutationCount - 1),
      }));
    }
  }

  async function createProjectTask(payload: CreateProjectTaskPayload): Promise<string | null> {
    const title = payload.title.trim();
    if (!payload.teamId || !payload.projectId || !title) return null;

    const snapshots = snapshotQueries(registryPayloads(projectTasksQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotTasks(payload.teamId);
    const nowIso = new Date().toISOString();
    const createdByUserId = (await authClient.getSession()).data?.user?.id ?? "";
    const assignedToTeam = payload.assignedToTeam ?? false;
    const assigneeUserIds = assignedToTeam ? [] : [...new Set(payload.assigneeUserIds ?? [])];
    const trimmedDescription = payload.description?.trim() ?? "";
    const optimisticBlueprintId = trimmedDescription ? optimisticId("agency-task-blueprint") : null;
    const optimisticTask: AgencyProjectTask = {
      id: optimisticId("agency-project-task"),
      teamId: payload.teamId,
      projectId: payload.projectId,
      title,
      status: payload.status ?? "open",
      taskKind: "standard",
      assignedToTeam,
      isWaste: false,
      estimateMinutes: payload.estimateMinutes ?? null,
      billableRateAmount: null,
      sourceBillableRateAmount: null,
      currency: "USD",
      projectBillableRateAmount: null,
      projectSourceBillableRateAmount: null,
      projectCurrency: "USD",
      clientBillableRateAmount: null,
      clientSourceBillableRateAmount: null,
      clientCurrency: "USD",
      createdByUserId,
      // Assignees required so assignee-filtered active lists accept the optimistic row.
      assignees: assigneeUserIds.map((userId) => ({
        userId,
        userName: "",
        userAvatar: null,
        status: "open" as const,
      })),
      viewerStatus: "open",
      viewerCompletionCount: 0,
      ...(optimisticBlueprintId
        ? {
            viewerBlueprints: [{ id: optimisticBlueprintId, description: trimmedDescription }],
          }
        : {}),
      dueDate: payload.dueDate ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    set((state) => ({ ...state, isCreatingTask: true }));

    try {
      await cancelAgencyProjectTaskListQueries(payload.teamId);

      const existingByTitle = findProjectTaskInCacheByTitle(
        payload.teamId,
        payload.projectId,
        title,
      );

      // Reuse: update the existing row in place. New: insert a temporary optimistic row.
      // Always open for the viewer — create/reuse (and Done → Active reopen) lands in Active.
      const reopenedFromDone = existingByTitle?.viewerStatus === "done";
      if (existingByTitle) {
        patchUpdatedProjectTask(payload.teamId, {
          ...existingByTitle,
          assignedToTeam,
          isWaste: existingByTitle.isWaste ?? false,
          assignees:
            assigneeUserIds.length > 0
              ? assigneeUserIds.map((userId) => ({
                  userId,
                  userName:
                    existingByTitle.assignees.find((a) => a.userId === userId)?.userName ?? "",
                  userAvatar:
                    existingByTitle.assignees.find((a) => a.userId === userId)?.userAvatar ?? null,
                  status:
                    existingByTitle.assignees.find((a) => a.userId === userId)?.status ?? "open",
                }))
              : existingByTitle.assignees,
          viewerStatus: "open",
          viewerCompletionCount: existingByTitle.viewerCompletionCount ?? 0,
          ...(optimisticBlueprintId
            ? {
                viewerBlueprints: [
                  ...(existingByTitle.viewerBlueprints ?? []),
                  { id: optimisticBlueprintId, description: trimmedDescription },
                ],
              }
            : {}),
          updatedAt: nowIso,
        });
        payload.onOptimisticId?.(existingByTitle.id);
      } else {
        patchInsertedProjectTask(payload.teamId, optimisticTask);
        payload.onOptimisticId?.(optimisticTask.id);
      }

      const created = (await orpcClient.agencyOps.projectTasks.create({
        teamId: payload.teamId,
        projectId: payload.projectId,
        title,
        status: payload.status,
        assignedToTeam: payload.assignedToTeam,
        assigneeUserIds: payload.assigneeUserIds,
        dueDate: payload.dueDate,
        estimateMinutes: payload.estimateMinutes,
        description: trimmedDescription || undefined,
      })) as AgencyProjectTask;

      // #region agent log
      fetch("http://127.0.0.1:7426/ingest/ccff2d3d-07dc-43a2-9258-da9208dfd805", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "ecaea0",
        },
        body: JSON.stringify({
          sessionId: "ecaea0",
          runId: "pre-fix",
          hypothesisId: "H2",
          location: "agency-ops.ts:createProjectTask:created",
          message: "created task assignees shape",
          data: {
            reusedExisting: Boolean(existingByTitle),
            assigneesIsArray: Array.isArray(created.assignees),
            assigneesType: typeof created.assignees,
            assigneesLength: Array.isArray(created.assignees) ? created.assignees.length : null,
            status: created.status,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      if (existingByTitle) {
        patchUpdatedProjectTask(payload.teamId, {
          ...created,
          viewerStatus: created.viewerStatus === "done" ? "open" : (created.viewerStatus ?? "open"),
        });
      } else {
        reconcileCreatedTask(payload.teamId, optimisticTask.id, created);
      }

      payload.onCreated?.(created);

      if (payload.successToast !== false) {
        toast.success(
          reopenedFromDone
            ? "Added to open tasks"
            : existingByTitle || payload.reusesExistingTitle
              ? "Using existing task"
              : "Task added",
          {
            description: reopenedFromDone
              ? `"${title}" is open again.`
              : existingByTitle || payload.reusesExistingTitle
                ? `"${title}" is already open on this project. Assignees were merged.`
                : title,
          },
        );
      }
      syncProjectTaskQueriesAfterMutation(payload.teamId);

      return created.id;
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreTasks(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't add task", { description: getErrorMessage(error, "Try again.") });
      return null;
    } finally {
      set((state) => ({ ...state, isCreatingTask: false }));
    }
  }

  function patchProjectTaskBlueprintDescription(
    teamId: string,
    taskId: string,
    blueprintId: string,
    description: string,
  ) {
    patchProjectTaskBlueprintDescriptionInCache(teamId, taskId, blueprintId, description);
  }

  async function updateProjectTaskBlueprint(payload: UpdateProjectTaskBlueprintPayload) {
    if (!payload.teamId || !payload.blueprintId) return;

    try {
      await orpcClient.agencyOps.projectTasks.updateBlueprint({
        teamId: payload.teamId,
        blueprintId: payload.blueprintId,
        description: payload.description,
      });
    } catch (error) {
      toast.error("Couldn't save task description", {
        description: getErrorMessage(error, "Try again."),
      });
      await syncProjectTaskQueriesAfterMutation(payload.teamId);
    }
  }

  async function deleteProjectTask(payload: DeleteProjectTaskPayload) {
    if (!payload.teamId || !payload.taskId) return;

    const snapshots = snapshotQueries(registryPayloads(projectTasksQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotTasks(payload.teamId);
    set((state) => ({
      ...state,
      deletingTaskIds: [...new Set([...state.deletingTaskIds, payload.taskId])],
    }));

    try {
      await cancelAgencyProjectTaskListQueries(payload.teamId);
      patchDeletedProjectTask(payload.teamId, payload.taskId);

      await orpcClient.agencyOps.projectTasks.delete({
        teamId: payload.teamId,
        taskId: payload.taskId,
      });

      toast.success("Task deleted", { description: payload.taskTitle });
      await syncProjectTaskQueriesAfterMutation(payload.teamId);
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreTasks(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't delete task", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        deletingTaskIds: state.deletingTaskIds.filter((id) => id !== payload.taskId),
      }));
    }
  }

  // ---------------------------------------------------------------------------
  // Client archive / unarchive
  // ---------------------------------------------------------------------------

  function patchRemovedClient(teamId: string, clientId: string) {
    optimistic().deleteClient(teamId, clientId);
    clientsQueryRegistry.forEach(({ payload: reg }) => {
      if (reg.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyClientsListQueryData | undefined>(
        reg.queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.filter((c) => c.id !== clientId),
            total: Math.max(0, current.total - 1),
          };
        },
      );
    });
  }

  async function archiveClient(payload: ArchiveClientPayload): Promise<boolean> {
    if (!payload.teamId || !payload.clientId) return false;

    const snapshots = snapshotQueries(registryPayloads(clientsQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotClients(payload.teamId);
    set((state) => ({ ...state, clientMutationCount: state.clientMutationCount + 1 }));

    try {
      patchRemovedClient(payload.teamId, payload.clientId);

      await orpcClient.agencyOps.clients.archive({
        teamId: payload.teamId,
        clientId: payload.clientId,
      });

      toast.success("Client archived", { description: `${payload.clientName} has been archived.` });
      await getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.clients.key(),
      });
      return true;
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreClients(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't archive client", { description: getErrorMessage(error, "Try again.") });
      return false;
    } finally {
      set((state) => ({
        ...state,
        clientMutationCount: Math.max(0, state.clientMutationCount - 1),
      }));
    }
  }

  async function unarchiveClient(payload: ArchiveClientPayload): Promise<boolean> {
    if (!payload.teamId || !payload.clientId) return false;

    const snapshots = snapshotQueries(registryPayloads(clientsQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotClients(payload.teamId);
    set((state) => ({ ...state, clientMutationCount: state.clientMutationCount + 1 }));

    try {
      // Archived list removes the row; active list will pick it up on invalidate.
      patchRemovedClient(payload.teamId, payload.clientId);

      await orpcClient.agencyOps.clients.unarchive({
        teamId: payload.teamId,
        clientId: payload.clientId,
      });

      toast.success("Client restored", {
        description: `${payload.clientName} is active again.`,
      });
      await getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.clients.key(),
      });
      return true;
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreClients(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't restore client", {
        description: getErrorMessage(error, "Try again."),
      });
      return false;
    } finally {
      set((state) => ({
        ...state,
        clientMutationCount: Math.max(0, state.clientMutationCount - 1),
      }));
    }
  }

  async function deleteProject(payload: DeleteProjectPayload) {
    if (!payload.teamId || !payload.projectId) return;

    const snapshots = snapshotQueries(registryPayloads(projectsQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotProjects(payload.teamId);
    set((state) => ({ ...state, projectMutationCount: state.projectMutationCount + 1 }));

    try {
      patchRemovedProject(payload.teamId, payload.projectId);

      await orpcClient.agencyOps.projects.delete({
        teamId: payload.teamId,
        projectId: payload.projectId,
      });

      await getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.projects.list.key(),
      });

      toast.success("Project moved to trash", {
        description: `${payload.projectName} can be restored for 30 days.`,
      });
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreProjects(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't delete project", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        projectMutationCount: Math.max(0, state.projectMutationCount - 1),
      }));
    }
  }

  async function restoreProject(payload: RestoreProjectPayload) {
    if (!payload.teamId || !payload.projectId) return;

    set((state) => ({ ...state, projectMutationCount: state.projectMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.projects.restore({
        teamId: payload.teamId,
        projectId: payload.projectId,
      });

      await getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.projects.list.key(),
      });

      toast.success("Project restored", { description: payload.projectName });
    } catch (error) {
      toast.error("Couldn't restore project", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        projectMutationCount: Math.max(0, state.projectMutationCount - 1),
      }));
    }
  }

  async function updateProject(payload: UpdateProjectPayload) {
    if (!payload.teamId || !payload.projectId) return;
    if (payload.billableRateAmount === undefined && payload.currency === undefined) return;

    set((state) => ({ ...state, projectMutationCount: state.projectMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.projects.update({
        teamId: payload.teamId,
        projectId: payload.projectId,
        billableRateAmount: payload.billableRateAmount,
        currency: payload.currency,
      });

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.projects.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.money.periodScoreboard.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.periodActivity.key(),
        }),
      ]);

      toast.success("Project rate updated");
    } catch (error) {
      toast.error("Couldn't update project rate", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        projectMutationCount: Math.max(0, state.projectMutationCount - 1),
      }));
    }
  }

  // ---------------------------------------------------------------------------
  // Contact upsert
  // ---------------------------------------------------------------------------

  async function upsertContact(
    payload: UpsertContactPayload,
    callbacks?: { onSuccess?: () => void },
  ) {
    if (!payload.teamId || !payload.clientId) return;

    set((state) => ({ ...state, contactMutationCount: state.contactMutationCount + 1 }));

    try {
      const contact = (await orpcClient.agencyOps.contacts.upsert({
        teamId: payload.teamId,
        clientId: payload.clientId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
      })) as AgencyContact;

      patchUpsertedContact(payload.teamId, payload.clientId, contact);

      callbacks?.onSuccess?.();
      optimistic().clearContact(payload.teamId, payload.clientId);
      toast.success("Contact saved");
    } catch (error) {
      toast.error("Couldn't save contact", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        contactMutationCount: Math.max(0, state.contactMutationCount - 1),
      }));
    }
  }

  // ---------------------------------------------------------------------------
  // Rates upsert
  // ---------------------------------------------------------------------------

  async function upsertRate(payload: UpsertRatePayload, callbacks?: { onSuccess?: () => void }) {
    if (!payload.teamId || !payload.userId) return;

    set((state) => ({ ...state, rateMutationCount: state.rateMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.rates.upsert({
        teamId: payload.teamId,
        userId: payload.userId,
        costRateAmount: payload.costRateAmount,
        billableRateAmount: payload.billableRateAmount,
        currency: payload.currency,
        effectiveFrom: payload.effectiveFrom,
      });

      await getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.rates.list.key({ input: { teamId: payload.teamId } }),
      });

      callbacks?.onSuccess?.();
      toast.success("Rate saved");
    } catch (error) {
      toast.error("Couldn't save rate", { description: getErrorMessage(error, "Try again.") });
      throw error;
    } finally {
      set((state) => ({ ...state, rateMutationCount: Math.max(0, state.rateMutationCount - 1) }));
    }
  }

  // ---------------------------------------------------------------------------
  // Capacity set
  // ---------------------------------------------------------------------------

  async function setCapacity(payload: SetCapacityPayload, callbacks?: { onSuccess?: () => void }) {
    if (!payload.teamId || !payload.userId) return;

    const snapshots = snapshotQueries(registryPayloads(capacityQueryRegistry));
    const capacityCellKey = `${payload.teamId}:${payload.weekStart}:${payload.userId}`;
    const previousCapacitySeconds =
      useAgencyOptimisticStore.getState().capacityCells[capacityCellKey];
    set((state) => ({ ...state, capacityMutationCount: state.capacityMutationCount + 1 }));

    try {
      patchCapacityCell(payload.teamId, payload.userId, payload.weekStart, payload.capacitySeconds);

      await orpcClient.agencyOps.capacity.set({
        teamId: payload.teamId,
        userId: payload.userId,
        weekStart: payload.weekStart,
        capacitySeconds: payload.capacitySeconds,
      });

      callbacks?.onSuccess?.();
      optimistic().clearCapacityCell(payload.teamId, payload.weekStart, payload.userId);
      toast.success("Capacity updated");
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      if (previousCapacitySeconds === undefined) {
        optimistic().clearCapacityCell(payload.teamId, payload.weekStart, payload.userId);
      } else {
        optimistic().setCapacityCell(
          payload.teamId,
          payload.weekStart,
          payload.userId,
          previousCapacitySeconds,
        );
      }
      toast.error("Couldn't update capacity", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        capacityMutationCount: Math.max(0, state.capacityMutationCount - 1),
      }));
    }
  }

  function getCachedProjectTask(teamId: string, taskId: string): AgencyProjectTask | null {
    return optimistic().findTask(teamId, taskId) ?? findProjectTaskInCache(teamId, taskId);
  }

  async function updateProjectTask(payload: UpdateProjectTaskPayload) {
    if (!payload.teamId || !payload.taskId) return;

    const current = getCachedProjectTask(payload.teamId, payload.taskId);
    const snapshots = snapshotQueries(registryPayloads(projectTasksQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotTasks(payload.teamId);
    const nowIso = new Date().toISOString();

    set((state) => ({
      ...state,
      pendingTaskIds: [...new Set([...state.pendingTaskIds, payload.taskId])],
    }));

    if (!current) {
      try {
        const updated = (await orpcClient.agencyOps.projectTasks.update({
          teamId: payload.teamId,
          taskId: payload.taskId,
          title: payload.title,
          status: payload.status,
          assignedToTeam: payload.assignedToTeam,
          assigneeUserIds: payload.assigneeUserIds,
          dueDate: payload.dueDate,
          estimateMinutes: payload.estimateMinutes,
          billableRateAmount: payload.billableRateAmount,
          currency: payload.currency,
        })) as AgencyProjectTask;

        patchUpdatedProjectTask(payload.teamId, updated);
        syncProjectTaskQueriesAfterMutation(payload.teamId);
      } catch (error) {
        toast.error("Couldn't update task", { description: getErrorMessage(error, "Try again.") });
        throw error;
      } finally {
        set((state) => ({
          ...state,
          pendingTaskIds: state.pendingTaskIds.filter((id) => id !== payload.taskId),
        }));
      }
      return;
    }

    const nextStatus = payload.status ?? current.status;
    const optimisticTask: AgencyProjectTask = {
      ...current,
      title: payload.title ?? current.title,
      status: nextStatus,
      viewerStatus:
        nextStatus === "open" || nextStatus === "in_progress" || nextStatus === "done"
          ? nextStatus
          : current.viewerStatus,
      assignedToTeam:
        payload.assignedToTeam === undefined ? current.assignedToTeam : payload.assignedToTeam,
      assignees:
        payload.assigneeUserIds === undefined
          ? current.assignees
          : payload.assignedToTeam
            ? []
            : payload.assigneeUserIds.map((userId) => {
                const existing = current.assignees.find((assignee) => assignee.userId === userId);
                return (
                  existing ?? {
                    userId,
                    userName: "Member",
                    userAvatar: null,
                    status: "open" as const,
                  }
                );
              }),
      dueDate: payload.dueDate === undefined ? current.dueDate : payload.dueDate,
      estimateMinutes:
        payload.estimateMinutes === undefined ? current.estimateMinutes : payload.estimateMinutes,
      billableRateAmount:
        payload.billableRateAmount === undefined
          ? current.billableRateAmount
          : payload.billableRateAmount,
      sourceBillableRateAmount:
        payload.billableRateAmount === undefined
          ? current.sourceBillableRateAmount
          : payload.billableRateAmount,
      currency: payload.currency === undefined ? current.currency : payload.currency,
      updatedAt: nowIso,
    };

    try {
      await cancelAgencyProjectTaskListQueries(payload.teamId);
      patchUpdatedProjectTask(payload.teamId, optimisticTask);

      const updated = (await orpcClient.agencyOps.projectTasks.update({
        teamId: payload.teamId,
        taskId: payload.taskId,
        title: payload.title,
        status: payload.status,
        assignedToTeam: payload.assignedToTeam,
        assigneeUserIds: payload.assigneeUserIds,
        dueDate: payload.dueDate,
        estimateMinutes: payload.estimateMinutes,
        billableRateAmount: payload.billableRateAmount,
        currency: payload.currency,
      })) as AgencyProjectTask;

      patchUpdatedProjectTask(payload.teamId, updated);
      syncProjectTaskQueriesAfterMutation(payload.teamId);
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreTasks(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't update task", { description: getErrorMessage(error, "Try again.") });
      throw error;
    } finally {
      set((state) => ({
        ...state,
        pendingTaskIds: state.pendingTaskIds.filter((id) => id !== payload.taskId),
      }));
    }
  }

  async function completeProjectTaskForMember(payload: { teamId: string; taskId: string }) {
    if (!payload.teamId || !payload.taskId) return;

    const current = getCachedProjectTask(payload.teamId, payload.taskId);
    const snapshots = snapshotQueries(registryPayloads(projectTasksQueryRegistry));
    const optimisticSnapshot = optimistic().snapshotTasks(payload.teamId);
    const nowIso = new Date().toISOString();

    set((state) => ({
      ...state,
      pendingTaskIds: [...new Set([...state.pendingTaskIds, payload.taskId])],
    }));

    if (current) {
      const optimisticTask: AgencyProjectTask = {
        ...current,
        viewerStatus: "done",
        viewerCompletionCount: (current.viewerCompletionCount ?? 0) + 1,
        updatedAt: nowIso,
      };
      await cancelAgencyProjectTaskListQueries(payload.teamId);
      patchUpdatedProjectTask(payload.teamId, optimisticTask);
    }

    try {
      const updated = (await orpcClient.agencyOps.projectTasks.completeForMember({
        teamId: payload.teamId,
        taskId: payload.taskId,
      })) as AgencyProjectTask;

      patchUpdatedProjectTask(payload.teamId, updated);
      syncProjectTaskQueriesAfterMutation(payload.teamId);
    } catch (error) {
      restoreQuerySnapshots(snapshots);
      optimistic().restoreTasks(payload.teamId, optimisticSnapshot);
      toast.error("Couldn't complete task", { description: getErrorMessage(error, "Try again.") });
      throw error;
    } finally {
      set((state) => ({
        ...state,
        pendingTaskIds: state.pendingTaskIds.filter((id) => id !== payload.taskId),
      }));
    }
  }

  // ---------------------------------------------------------------------------
  // Invoice create / status update
  // ---------------------------------------------------------------------------

  async function createInvoice(
    payload: CreateInvoicePayload,
    callbacks?: { onSuccess?: () => void },
  ) {
    if (!payload.teamId || !payload.clientId) return;

    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.invoices.create({
        teamId: payload.teamId,
        clientId: payload.clientId,
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        currency: payload.currency,
      });

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.summary.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.money.periodScoreboard.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.periodActivity.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.periodObligations.list.key(),
        }),
      ]);

      callbacks?.onSuccess?.();
      toast.success("Invoice draft created", {
        description: `${payload.clientName} — draft added to Bills.`,
      });
    } catch (error) {
      toast.error("Couldn't create invoice", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function updateInvoiceStatus(
    payload: { teamId: string; invoiceId: string; status: "sent" | "paid" | "refunded" },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.invoices.updateStatus(payload);

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.summary.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.periodObligations.list.key(),
        }),
      ]);

      callbacks?.onSuccess?.();
      const label =
        payload.status === "sent"
          ? "Invoice sent"
          : payload.status === "paid"
            ? "Invoice marked paid"
            : "Invoice refunded";
      toast.success(label);
    } catch (error) {
      toast.error("Couldn't update invoice", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function recordInvoicePayment(
    payload: { teamId: string; invoiceId: string; amount: number },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.invoices.recordPayment(payload);

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.summary.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.periodObligations.list.key(),
        }),
      ]);

      callbacks?.onSuccess?.();
      toast.success("Payment recorded");
    } catch (error) {
      toast.error("Couldn't record payment", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function createPayoutFromMember(
    payload: CreatePayoutFromMemberPayload,
    callbacks?: { onSuccess?: () => void },
  ) {
    if (!payload.teamId || !payload.userId) return;

    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.payouts.createFromMember({
        teamId: payload.teamId,
        userId: payload.userId,
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        currency: payload.currency,
      });

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.payouts.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.payouts.summary.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.payouts.getRun.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.periodActivity.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.periodObligations.list.key(),
        }),
      ]);

      callbacks?.onSuccess?.();
      toast.success("Payout draft created", {
        description: `${payload.userName} — draft added to Team Bills.`,
      });
    } catch (error) {
      toast.error("Couldn't create payout", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function createPayoutLine(
    payload: CreatePayoutLinePayload,
    callbacks?: { onSuccess?: () => void },
  ) {
    if (!payload.teamId || !payload.label.trim()) return;

    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.payouts.createLine({
        teamId: payload.teamId,
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        sectionKey: payload.sectionKey,
        payeeUserId: payload.payeeUserId,
        label: payload.label,
        amount: payload.amount,
        currency: payload.currency,
        cohortKey: payload.cohortKey,
      });

      await invalidateAgencyPayoutQueries({ scoreboard: true });

      callbacks?.onSuccess?.();
      toast.success("Adjustment added");
    } catch (error) {
      toast.error("Couldn't add adjustment", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function updatePayoutLineStatus(
    payload: { teamId: string; lineId: string; status: "paid" | "draft" },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.payouts.updateStatus(payload);

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.payouts.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.payouts.summary.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.periodObligations.list.key(),
        }),
      ]);

      callbacks?.onSuccess?.();
      toast.success(payload.status === "paid" ? "Payout marked paid" : "Payout reset to draft");
    } catch (error) {
      toast.error("Couldn't update payout", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function deletePayoutLine(
    payload: { teamId: string; lineId: string },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.payouts.deleteLine(payload);

      await invalidateAgencyPayoutQueries({ scoreboard: true });

      callbacks?.onSuccess?.();
      toast.success("Adjustment removed");
    } catch (error) {
      toast.error("Couldn't remove adjustment", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function recordPayoutPayment(
    payload: { teamId: string; lineId: string; amount: number },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.payouts.recordPayment(payload);

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.payouts.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.payouts.summary.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.periodObligations.list.key(),
        }),
      ]);

      callbacks?.onSuccess?.();
      toast.success("Payout payment recorded");
    } catch (error) {
      toast.error("Couldn't record payout payment", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function invalidateSalaryPoolQueries(teamId: string) {
    await Promise.all([
      getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.salaryPool.get.key(),
      }),
      getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.payouts.summary.key(),
      }),
      getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.money.periodScoreboard.key(),
      }),
      getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.periodObligations.list.key(),
      }),
    ]);
    void teamId;
  }

  async function upsertSalaryPoolTotal(
    payload: {
      teamId: string;
      periodStart: string;
      periodEnd: string;
      totalAmount: number;
      currency?: string;
    },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.salaryPool.upsertTotal(payload);
      await invalidateSalaryPoolQueries(payload.teamId);
      callbacks?.onSuccess?.();
      toast.success("Team salaries total saved");
    } catch (error) {
      toast.error("Couldn't save Team salaries total", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function recordSalaryPoolPayment(
    payload: {
      teamId: string;
      periodStart: string;
      periodEnd: string;
      amount: number;
    },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.salaryPool.recordPayment(payload);
      await invalidateSalaryPoolQueries(payload.teamId);
      callbacks?.onSuccess?.();
      toast.success("Salary payment recorded");
    } catch (error) {
      toast.error("Couldn't record salary payment", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function createExpense(
    payload: CreateExpensePayload,
    callbacks?: { onSuccess?: () => void },
  ) {
    if (!payload.teamId || !payload.name.trim()) return;

    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.expenses.create({
        teamId: payload.teamId,
        name: payload.name,
        kind: payload.kind,
        period: payload.period,
        note: payload.note,
        amount: payload.amount,
        amountMode: payload.amountMode,
        currency: payload.currency,
        fxRate: payload.fxRate,
        startsAt: payload.startsAt,
        occurredAt: payload.occurredAt,
      });

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.expenses.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.expenses.subscriptionCycles.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.money.periodScoreboard.key(),
        }),
      ]);

      callbacks?.onSuccess?.();
      toast.success("Expense added");
    } catch (error) {
      toast.error("Couldn't add expense", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function updateExpense(
    payload: UpdateExpensePayload,
    callbacks?: { onSuccess?: () => void },
  ) {
    if (!payload.teamId || !payload.expenseId) return;

    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.expenses.update(payload);

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.expenses.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.expenses.subscriptionCycles.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.money.periodScoreboard.key(),
        }),
      ]);

      callbacks?.onSuccess?.();
      toast.success("Expense updated");
    } catch (error) {
      toast.error("Couldn't update expense", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function recordExpensePayment(
    payload: { teamId: string; expenseId: string; amount: number },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.expenses.recordPayment(payload);

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.expenses.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.expenses.subscriptionCycles.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.money.periodScoreboard.key(),
        }),
      ]);

      callbacks?.onSuccess?.();
      toast.success("Payment recorded");
    } catch (error) {
      toast.error("Couldn't record payment", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function removeExpense(
    payload: { teamId: string; expenseId: string },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      await orpcClient.agencyOps.expenses.remove(payload);

      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.expenses.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.expenses.subscriptionCycles.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.money.periodScoreboard.key(),
        }),
      ]);

      callbacks?.onSuccess?.();
      toast.success("Expense removed");
    } catch (error) {
      toast.error("Couldn't remove expense", { description: getErrorMessage(error, "Try again.") });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function upsertMoneySettings(
    payload: {
      teamId: string;
      rules: {
        enabledRuleIds: string[];
        notesByRuleId?: Record<string, string>;
        labelByRuleId?: Record<string, string>;
        cohortByRuleId?: Record<string, string>;
        memberIdsByRuleId?: Record<string, string[]>;
      };
      calcOptions: {
        enabledOptionIds: string[];
        notesByOptionId?: Record<string, string>;
        summaryByOptionId?: Record<string, string>;
        valueByOptionId?: Record<string, number>;
        formulas?: Array<{
          id: string;
          key: string;
          label: string;
          locked: boolean;
          enabled: boolean;
          tokens: Array<
            | { kind: "var"; id: string }
            | { kind: "number"; value: number }
            | { kind: "op"; op: "+" | "-" | "*" | "/" }
            | { kind: "paren"; value: "(" | ")" }
          >;
          output: "amount" | "ratio" | "hours";
          metricId: string | null;
          sectionKey: string | null;
          ruleId: string | null;
        }>;
      };
    },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      const saved = await orpcClient.agencyOps.moneySettings.upsert(payload);
      // queryKey includes `{ type: "query" }`; plain `.key({ input })` does not match.
      const moneySettingsQueryKey = orpc.agencyOps.moneySettings.get.queryKey({
        input: { teamId: payload.teamId },
      });
      getQueryClient().setQueryData(moneySettingsQueryKey, saved);
      await Promise.all([
        getQueryClient().invalidateQueries({ queryKey: moneySettingsQueryKey }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.money.periodScoreboard.key(),
        }),
      ]);
      callbacks?.onSuccess?.();
      toast.success("Money settings saved");
    } catch (error) {
      toast.error("Couldn't save Money settings", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function setAgencyCurrency(
    payload: { teamId: string; currency: string },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));
    try {
      await orpcClient.agencyOps.moneySettings.setCurrency(payload);
      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.moneySettings.get.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.fxRates.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.money.periodScoreboard.key(),
        }),
      ]);
      callbacks?.onSuccess?.();
      toast.success("Agency currency updated");
    } catch (error) {
      toast.error("Couldn't update currency", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function upsertFxRate(
    payload: {
      teamId: string;
      fromCurrency: string;
      toCurrency: string;
      rate: string;
      id?: string;
    },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));
    try {
      await orpcClient.agencyOps.fxRates.upsert(payload);
      await getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.fxRates.list.key(),
      });
      callbacks?.onSuccess?.();
      toast.success("FX rate saved");
    } catch (error) {
      toast.error("Couldn't save FX rate", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function deleteFxRate(
    payload: { teamId: string; id: string },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));
    try {
      await orpcClient.agencyOps.fxRates.delete(payload);
      await getQueryClient().invalidateQueries({
        queryKey: orpc.agencyOps.fxRates.list.key(),
      });
      callbacks?.onSuccess?.();
      toast.success("FX rate removed");
    } catch (error) {
      toast.error("Couldn't remove FX rate", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function suggestFxRate(payload: {
    teamId: string;
    fromCurrency: string;
    toCurrency: string;
  }): Promise<{ rate: string; asOf: string } | null> {
    try {
      return await orpcClient.agencyOps.fxRates.suggest(payload);
    } catch (error) {
      toast.error("Couldn't suggest FX rate", {
        description: getErrorMessage(error, "Try again."),
      });
      return null;
    }
  }

  async function applyCurrentFxToPeriod(
    payload: { teamId: string; periodStart: string; periodEnd: string },
    callbacks?: { onSuccess?: () => void },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));
    try {
      await orpcClient.agencyOps.fxRates.applyCurrentToPeriod(payload);
      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.fxRates.listPeriod.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.money.periodScoreboard.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.invoices.periodActivity.key(),
        }),
      ]);
      callbacks?.onSuccess?.();
      toast.success("Period FX updated");
    } catch (error) {
      toast.error("Couldn't update this period's FX", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  async function syncFormulaPayoutLines(
    payload: {
      teamId: string;
      periodStart: string;
      periodEnd: string;
      refreshSnapshot?: boolean;
    },
    callbacks?: { onSuccess?: () => void; quiet?: boolean },
  ) {
    set((state) => ({ ...state, invoiceMutationCount: state.invoiceMutationCount + 1 }));

    try {
      const result = await orpcClient.agencyOps.payouts.syncFormulaLines(payload);
      await Promise.all([
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.payouts.getRun.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.payouts.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.periodObligations.list.key(),
        }),
        getQueryClient().invalidateQueries({
          queryKey: orpc.agencyOps.money.periodScoreboard.key(),
        }),
      ]);
      callbacks?.onSuccess?.();
      if (!callbacks?.quiet) {
        toast.success("Formula lines synced", {
          description: `${result.upserted} updated · ${result.skipped} skipped`,
        });
      }
    } catch (error) {
      toast.error("Couldn't sync formula lines", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      set((state) => ({
        ...state,
        invoiceMutationCount: Math.max(0, state.invoiceMutationCount - 1),
      }));
    }
  }

  return {
    registerClientsQuery,
    unregisterClientsQuery,
    registerProjectsQuery,
    unregisterProjectsQuery,
    registerProjectTasksQuery,
    unregisterProjectTasksQuery,
    registerContactQuery,
    unregisterContactQuery,
    registerCapacityQuery,
    unregisterCapacityQuery,
    createClient,
    updateClient,
    archiveClient,
    unarchiveClient,
    createProject,
    createProjectWithJourney,
    deleteProject,
    restoreProject,
    updateProject,
    toggleFavorite,
    createProjectTask,
    patchProjectTaskBlueprintDescription,
    updateProjectTaskBlueprint,
    updateProjectTask,
    completeProjectTaskForMember,
    deleteProjectTask,
    upsertContact,
    upsertRate,
    setCapacity,
    createInvoice,
    updateInvoiceStatus,
    recordInvoicePayment,
    createPayoutFromMember,
    createPayoutLine,
    updatePayoutLineStatus,
    deletePayoutLine,
    recordPayoutPayment,
    upsertSalaryPoolTotal,
    recordSalaryPoolPayment,
    createExpense,
    updateExpense,
    recordExpensePayment,
    removeExpense,
    upsertMoneySettings,
    setAgencyCurrency,
    upsertFxRate,
    deleteFxRate,
    suggestFxRate,
    applyCurrentFxToPeriod,
    syncFormulaPayoutLines,
  };
}

export const useAgencyOpsStore = create<AgencyOpsState>((set, get) => ({
  clientMutationCount: 0,
  projectMutationCount: 0,
  isCreatingTask: false,
  pendingTaskIds: [],
  deletingTaskIds: [],
  contactMutationCount: 0,
  rateMutationCount: 0,
  capacityMutationCount: 0,
  invoiceMutationCount: 0,
  ...createAgencyOpsActions(set, get),
}));

export {
  selectIsCapacityMutationPending,
  selectIsClientMutationPending,
  selectIsContactMutationPending,
  selectIsCreatingTask,
  selectIsInvoiceMutationPending,
  selectIsProjectMutationPending,
  selectIsRateMutationPending,
  selectIsTaskMutationPending,
  selectIsTaskRowPending,
} from "@/features/shared/stores/agency-ops-selectors";

export {
  toggleAgencyFavorite,
  type ToggleFavoritePayload,
} from "@/features/shared/stores/agency-favorites";
