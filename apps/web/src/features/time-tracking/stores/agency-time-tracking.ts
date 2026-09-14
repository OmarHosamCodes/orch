import { create } from "zustand";
import { toast } from "sonner";

import { getQueryClient } from "@/lib/query-client";
import {
  cancelAgencyProjectTaskListQueries,
  findProjectTaskInCache,
  isAgencyTimeEntriesListQueryKey,
  patchActiveTimerInCache,
  patchUpdatedProjectTaskInCache,
  refetchAgencyActiveTimerQueries,
  refetchAgencyTimeEntriesListQueries,
} from "@/features/shared/agency-query-cache";
import { orpcClient } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  getAgencyTimerStartBlockedMessage,
  getAgencyTimerStopBlockedMessage,
  resolveAgencyTimerStopDescription,
} from "@/features/time-tracking/timer-validation";
import {
  createRetainedTrackerDraftAfterStop,
  type AgencyTrackerDraft,
} from "@/features/time-tracking/tracker-draft";
import {
  shouldPersistActiveTimerDescription,
  shouldSkipActiveTimerDescriptionSync,
} from "@/features/time-tracking/tracker-description-sync";
import { isQueryCancelRejection, settledQueryCancel } from "@/features/time-tracking/query-cancel";
import { createTimerMutationQueue } from "@/features/time-tracking/timer-mutation-queue";
import { buildActiveTimerTaskUpdateInput } from "@/features/time-tracking/active-timer-task-update";
import { releasePendingEntryIds } from "@/features/time-tracking/pending-entry-ids";
import { type AgencyListOverlay } from "@/features/shared/agency-optimistic-merge";
import { useAgencyOptimisticStore } from "@/features/shared/stores/agency-optimistic";
import { restoreQuerySnapshots, snapshotQueries } from "@/features/shared/query-snapshots";

type AgencyProjectTask = {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  createdAt: string;
  updatedAt: string;
};

type AgencyProjectSummary = {
  id: string;
  teamId: string;
  clientId: string;
  clientName: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyTag = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyActiveTimer = {
  id: string;
  teamId: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  projectName: string;
  description: string;
  tags: AgencyTag[];
  links: Array<{ id: string; url: string }>;
  isBillable: boolean;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
};

type AgencyTimeEntry = {
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
  tags: AgencyTag[];
  links: Array<{ id: string; url: string }>;
  isBillable: boolean;
  isWaste: boolean;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
};

type AgencyWeekSummary = {
  weekStartKey?: string;
  startDate: string;
  endDate: string;
  totalSeconds: number;
  daily: Array<{
    date: string;
    totalSeconds: number;
  }>;
};

type AgencyActiveTimerQueryData = {
  timer: AgencyActiveTimer | null;
};

type QueryKey = readonly unknown[];

type AgencyTimeEntriesListQueryData = {
  items: AgencyTimeEntry[];
  page: number;
  pageSize: number;
  total: number;
  weekSummary: AgencyWeekSummary;
  weekSummaries?: Array<AgencyWeekSummary & { weekStartKey: string }>;
};

type TrackerDraft = AgencyTrackerDraft;

type RegisteredActiveTimerQuery = {
  queryKey: QueryKey;
  teamId: string;
};

type RegisteredLogQuery = {
  queryKey: QueryKey;
  teamId: string;
  page: number;
};

type StartTimerPayload = {
  teamId: string;
  project: Pick<AgencyProjectSummary, "id" | "name"> | null;
  task: Pick<AgencyProjectTask, "id" | "title"> | null;
  description: string;
  tagIds?: string[];
  isBillable?: boolean;
  successDescription?: string;
};

type StopTimerPayload = {
  teamId: string;
  description: string;
  discard?: boolean;
  activeTimer?: AgencyActiveTimer | null;
  task?: Pick<AgencyProjectTask, "id" | "title"> | null;
  tagIds?: string[];
  isBillable?: boolean;
};

type UpdateActiveTimerStartPayload = {
  teamId: string;
  activeTimer: AgencyActiveTimer;
  startedAt: string;
};

const ACTIVE_TIMER_DESCRIPTION_DEBOUNCE_MS = 400;
const activeTimerDescriptionPersistTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** Local draft differs from last server-acked description; blocks live/cache overwrites. */
const trackerDescriptionDirtyByTeam = new Map<string, boolean>();

function markTrackerDescriptionDirty(teamId: string) {
  if (!teamId) return;
  trackerDescriptionDirtyByTeam.set(teamId, true);
}

function clearTrackerDescriptionDirty(teamId: string) {
  if (!teamId) return;
  trackerDescriptionDirtyByTeam.delete(teamId);
}

function isTrackerDescriptionDirty(teamId: string) {
  return trackerDescriptionDirtyByTeam.get(teamId) === true;
}

type RestartEntryPayload = {
  teamId: string;
  project: Pick<AgencyProjectSummary, "id" | "name">;
  task: Pick<AgencyProjectTask, "id" | "title"> | null;
  description: string;
  tagIds?: string[];
  isBillable?: boolean;
};

type DeleteEntriesPayload = {
  teamId: string;
  entries: Array<Pick<AgencyTimeEntry, "id" | "startedAt" | "durationSeconds">>;
};

type UpdateEntryPayload = {
  teamId: string;
  entryId: string;
  /** Baseline from the UI list; preferred over cache lookup. */
  previousEntry?: AgencyTimeEntry;
  projectId: string;
  taskId: string | null;
  task: Pick<AgencyProjectTask, "id" | "title"> | null;
  project: Pick<AgencyProjectSummary, "id" | "name" | "clientId" | "clientName">;
  description: string;
  startAt: string;
  endAt: string;
  durationSeconds: number;
  tagIds?: string[];
  links?: string[];
  isBillable?: boolean;
};

type UpdateEntriesBulkPayload = {
  teamId: string;
  entryIds: string[];
  /** Baselines from the UI list; preferred over cache lookup (same as updateEntry.previousEntry). */
  previousEntries?: AgencyTimeEntry[];
  patch: {
    projectId?: string;
    taskId?: string | null;
    description?: string;
    tagIds?: string[];
    links?: string[];
    isBillable?: boolean;
    isWaste?: boolean;
  };
};

type DuplicateEntryPayload = {
  teamId: string;
  entry: AgencyTimeEntry;
};

type CreateManualEntryPayload = {
  teamId: string;
  project: Pick<AgencyProjectSummary, "id" | "name" | "clientId" | "clientName">;
  task: Pick<AgencyProjectTask, "id" | "title"> | null;
  description: string;
  startAt: string;
  endAt: string;
  tagIds?: string[];
  isBillable?: boolean;
};

function buildUpdateEntryPayloadFromEntry(
  entry: AgencyTimeEntry,
  teamId: string,
  patch: Pick<UpdateEntryPayload, "links"> = {},
): UpdateEntryPayload {
  return {
    teamId,
    entryId: entry.id,
    previousEntry: entry,
    projectId: entry.projectId,
    taskId: entry.taskId,
    task: entry.taskId ? { id: entry.taskId, title: entry.taskTitle ?? "" } : null,
    project: {
      id: entry.projectId,
      name: entry.projectName,
      clientId: entry.clientId,
      clientName: entry.clientName,
    },
    description: entry.description,
    startAt: entry.startedAt,
    endAt: entry.endedAt,
    durationSeconds: entry.durationSeconds,
    tagIds: entry.tags.map((tag) => tag.id),
    isBillable: entry.isBillable,
    ...patch,
  };
}

export function buildAgencyTimeEntryLinksUpdatePayload(
  entry: AgencyTimeEntry,
  teamId: string,
  links: string[],
): UpdateEntryPayload {
  return buildUpdateEntryPayloadFromEntry(entry, teamId, { links });
}

const OPTIMISTIC_CLIENT_ID = "optimistic-client";
const OPTIMISTIC_CLIENT_NAME = "Unknown client";
const OPTIMISTIC_USER_NAME = "You";

let cachedUserId = "unknown-user";

export function setAgencyTimeTrackingUserId(userId: string | null) {
  cachedUserId = userId ?? "unknown-user";
}

function getCurrentUserId() {
  return cachedUserId;
}

type AgencyTimeTrackingActions = ReturnType<typeof createAgencyTimeTrackingActions>;

type AgencyTimeTrackingState = {
  timerStartCount: number;
  timerStopCount: number;
  timerAdjustCount: number;
  /** Depth of queued start/stop work — keeps pending true across chain handoff. */
  timerQueueDepth: number;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  duplicatingEntryIds: string[];
  manualCreateCount: number;
  trackerDraftsByTeam: Record<string, TrackerDraft>;
  timerLiveUpdatedAtByTeam: Record<string, string>;
  taskChooserOpenRequest: number;
} & AgencyTimeTrackingActions;

function createAgencyTimeTrackingActions(
  set: (fn: (state: AgencyTimeTrackingState) => AgencyTimeTrackingState) => void,
  get: () => AgencyTimeTrackingState,
) {
  const activeTimerQueryRegistry = new Map<
    string,
    { payload: RegisteredActiveTimerQuery; count: number }
  >();
  const logQueryRegistry = new Map<string, { payload: RegisteredLogQuery; count: number }>();
  // Serialize start/stop so bar + mini-timer clicks enqueue instead of dropping.
  const timerMutationQueue = createTimerMutationQueue();

  function enqueueTimerMutation(run: () => Promise<void>) {
    // Hold pending from enqueue through settle so chained ops never flash enabled.
    set((s) => ({ ...s, timerQueueDepth: s.timerQueueDepth + 1 }));
    return timerMutationQueue.enqueue(async () => {
      try {
        await run();
      } finally {
        set((s) => ({ ...s, timerQueueDepth: Math.max(0, s.timerQueueDepth - 1) }));
      }
    });
  }

  function startTimer(payload: StartTimerPayload) {
    return enqueueTimerMutation(() => runStartTimer(payload));
  }

  function stopTimer(payload: StopTimerPayload) {
    return enqueueTimerMutation(() => runStopTimer(payload));
  }

  function optimistic() {
    return useAgencyOptimisticStore.getState();
  }

  function registerInto<T>(
    registry: Map<string, { payload: T; count: number }>,
    key: string,
    payload: T,
  ) {
    const existing = registry.get(key);
    if (existing) {
      existing.count += 1;
      existing.payload = payload;
    } else {
      registry.set(key, { payload, count: 1 });
    }
  }

  function unregisterFrom<T>(registry: Map<string, { payload: T; count: number }>, key: string) {
    const existing = registry.get(key);
    if (!existing) return;
    existing.count -= 1;
    if (existing.count <= 0) registry.delete(key);
  }

  function emptyTrackerDraft(): TrackerDraft {
    return {
      description: "",
      projectId: "",
      taskId: "",
      tagIds: [],
      isBillable: true,
      syncedTimerId: null,
    };
  }

  function ensureTrackerDraft(teamId: string) {
    if (!teamId) {
      return null;
    }

    const existingDraft = get().trackerDraftsByTeam[teamId];

    if (existingDraft) {
      return existingDraft;
    }

    const nextDraft = emptyTrackerDraft();

    set((s) => ({
      ...s,
      trackerDraftsByTeam: {
        ...s.trackerDraftsByTeam,
        [teamId]: nextDraft,
      },
    }));

    return nextDraft;
  }

  function setTrackerDescription(teamId: string, description: string) {
    if (!teamId) {
      return;
    }

    set((s) => {
      const existing = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();
      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: { ...existing, description },
        },
      };
    });
    // Draft-only while typing: mirroring into the active-timer query on every
    // keystroke re-renders the tracker and lets live echoes fight the input.
    markTrackerDescriptionDirty(teamId);
    scheduleActiveTimerDescriptionPersist(teamId);
  }

  function scheduleActiveTimerDescriptionPersist(teamId: string) {
    const existingTimer = activeTimerDescriptionPersistTimers.get(teamId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    activeTimerDescriptionPersistTimers.set(
      teamId,
      setTimeout(() => {
        activeTimerDescriptionPersistTimers.delete(teamId);
        void persistActiveTimerDescription(teamId);
      }, ACTIVE_TIMER_DESCRIPTION_DEBOUNCE_MS),
    );
  }

  function cancelActiveTimerDescriptionPersist(teamId: string) {
    const existingTimer = activeTimerDescriptionPersistTimers.get(teamId);
    if (!existingTimer) {
      return;
    }

    clearTimeout(existingTimer);
    activeTimerDescriptionPersistTimers.delete(teamId);
  }

  async function persistActiveTimerDescription(teamId: string) {
    if (!teamId) {
      return;
    }

    const draft = get().trackerDraftsByTeam[teamId];
    const activeTimer = getActiveTimerForTeam(teamId);
    if (!draft || !activeTimer || draft.syncedTimerId !== activeTimer.id) {
      if (!activeTimer) {
        clearTrackerDescriptionDirty(teamId);
      }
      return;
    }

    const description = draft.description;
    const descriptionDirty = isTrackerDescriptionDirty(teamId);
    if (
      !shouldPersistActiveTimerDescription({
        draftDescription: description,
        activeTimerDescription: activeTimer.description,
        descriptionDirty,
      })
    ) {
      clearTrackerDescriptionDirty(teamId);
      return;
    }

    const timerSnapshots = snapshotQueries(
      [...activeTimerQueryRegistry.values()].map((entry) => entry.payload),
    );

    try {
      const result = (await orpcClient.agencyOps.timer.updateDescription({
        teamId,
        description,
      })) as { timer: AgencyActiveTimer };

      patchActiveTimerCaches(result.timer);
      if (get().trackerDraftsByTeam[teamId]?.description === description) {
        clearTrackerDescriptionDirty(teamId);
      }
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);

      toast.error("Unable to sync description", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  }

  function flushActiveTimerDescription(teamId: string) {
    if (!teamId) {
      return Promise.resolve();
    }

    cancelActiveTimerDescriptionPersist(teamId);
    return persistActiveTimerDescription(teamId);
  }

  async function runUpdateActiveTimerLinks(payload: { teamId: string; links: string[] }) {
    const { teamId, links } = payload;
    if (!teamId) return;

    const activeTimer = getActiveTimerForTeam(teamId);
    if (!activeTimer) {
      toast.error("Unable to update links", { description: "No active timer." });
      throw new Error("No active timer.");
    }

    const timerSnapshots = snapshotQueries(
      [...activeTimerQueryRegistry.values()].map((entry) => entry.payload),
    );

    const optimisticTimer: AgencyActiveTimer = {
      ...activeTimer,
      links: links.map((url, index) => ({
        id: `optimistic-timer-link-${index}`,
        url,
      })),
      updatedAt: new Date().toISOString(),
    };
    patchActiveTimerCaches(optimisticTimer);

    try {
      const result = (await orpcClient.agencyOps.timer.updateLinks({
        teamId,
        links,
      })) as { timer: AgencyActiveTimer };

      patchActiveTimerCaches(result.timer);
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);
      toast.error("Unable to update links", {
        description: getErrorMessage(error, "Please try again."),
      });
      throw error;
    }
  }

  function updateActiveTimerLinks(payload: { teamId: string; links: string[] }) {
    return enqueueTimerMutation(() => runUpdateActiveTimerLinks(payload));
  }

  function setTrackerProjectId(teamId: string, projectId: string) {
    if (!teamId) {
      return;
    }

    let shouldPersist = false;

    set((s) => {
      const existing = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();
      const nextTaskId = projectId === existing.projectId ? existing.taskId : "";
      // Persist here only for project-only edits while already unbound.
      // Task clears defer to setTrackerTaskId("") so we don't double-write.
      shouldPersist = nextTaskId === "" && existing.taskId === "";
      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: {
            ...existing,
            projectId,
            taskId: nextTaskId,
          },
        },
      };
    });
    mirrorTrackerDraftToActiveTimer(teamId);
    if (shouldPersist) {
      void persistActiveTimerTask(teamId);
    }
  }

  function setTrackerTaskId(teamId: string, taskId: string) {
    if (!teamId) {
      return;
    }

    set((s) => {
      const existing = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();
      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: { ...existing, taskId },
        },
      };
    });
    mirrorTrackerDraftToActiveTimer(teamId);
    void persistActiveTimerTask(teamId);
  }

  async function persistActiveTimerTask(teamId: string) {
    if (!teamId) {
      return;
    }

    const draft = get().trackerDraftsByTeam[teamId];
    const activeTimer = getActiveTimerForTeam(teamId);
    if (!draft || !activeTimer || draft.syncedTimerId !== activeTimer.id) {
      return;
    }

    const timerSnapshots = snapshotQueries(
      [...activeTimerQueryRegistry.values()].map((entry) => entry.payload),
    );

    try {
      const result = (await orpcClient.agencyOps.timer.updateTask(
        buildActiveTimerTaskUpdateInput({
          teamId,
          taskId: draft.taskId.trim() || null,
          draftProjectId: draft.projectId,
        }),
      )) as { timer: AgencyActiveTimer };

      const patchedTimer = isTrackerDescriptionDirty(teamId)
        ? { ...result.timer, description: draft.description }
        : result.timer;
      patchActiveTimerCaches(patchedTimer);
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);

      toast.error("Unable to sync task", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  }

  function setTrackerTagIds(teamId: string, tagIds: string[]) {
    patchTrackerDraft(teamId, { tagIds: [...new Set(tagIds)] });
    mirrorTrackerDraftToActiveTimer(teamId);
  }

  function setTrackerIsBillable(teamId: string, isBillable: boolean) {
    patchTrackerDraft(teamId, { isBillable });
    mirrorTrackerDraftToActiveTimer(teamId);
  }

  function getActiveTimerForTeam(teamId: string): AgencyActiveTimer | null {
    const optimisticTimer = useAgencyOptimisticStore.getState().activeTimers[teamId];
    if (optimisticTimer) {
      return optimisticTimer;
    }

    const queryClient = getQueryClient();

    for (const query of queryClient.getQueryCache().findAll()) {
      const path = query.queryKey[0];
      if (
        !Array.isArray(path) ||
        path[0] !== "agencyOps" ||
        path[1] !== "timer" ||
        path[2] !== "getActive"
      ) {
        continue;
      }

      const cached = queryClient.getQueryData<AgencyActiveTimerQueryData>(query.queryKey);
      if (cached?.timer?.teamId === teamId) {
        return cached.timer;
      }
    }

    return null;
  }

  function findProjectNameInCache(teamId: string, projectId: string) {
    if (!projectId) {
      return "";
    }

    const queryClient = getQueryClient();

    for (const query of queryClient.getQueryCache().findAll()) {
      const path = query.queryKey[0];
      if (
        !Array.isArray(path) ||
        path[0] !== "agencyOps" ||
        path[1] !== "projects" ||
        path[2] !== "list"
      ) {
        continue;
      }

      const cached = queryClient.getQueryData<{
        items: Array<{ id: string; name: string; teamId: string }>;
      }>(query.queryKey);
      const project = cached?.items.find(
        (entry) => entry.id === projectId && entry.teamId === teamId,
      );
      if (project) {
        return project.name;
      }
    }

    return "";
  }

  function mirrorTrackerDraftToActiveTimer(teamId: string) {
    if (!teamId) {
      return;
    }

    const draft = get().trackerDraftsByTeam[teamId];
    if (!draft) {
      return;
    }

    const activeTimer = getActiveTimerForTeam(teamId);
    if (!activeTimer || draft.syncedTimerId !== activeTimer.id) {
      return;
    }

    const taskId = draft.taskId.trim() || null;
    const cachedTask = taskId ? findProjectTaskInCache(teamId, taskId) : null;
    const projectId = cachedTask?.projectId ?? (draft.projectId || activeTimer.projectId);
    const projectName = findProjectNameInCache(teamId, projectId) || activeTimer.projectName || "";

    patchActiveTimerCaches({
      ...activeTimer,
      description: draft.description,
      taskId,
      taskTitle: cachedTask?.title ?? (taskId ? activeTimer.taskTitle : null),
      projectId,
      projectName,
      tags: draft.tagIds
        .map((id) => activeTimer.tags.find((tag) => tag.id === id))
        .filter(Boolean) as AgencyTag[],
      isBillable: draft.isBillable,
      updatedAt: new Date().toISOString(),
    });
  }

  function syncDraftFromActiveTimer(
    teamId: string,
    timer: AgencyActiveTimer | null,
    options?: { skipDescription?: boolean; authoritative?: boolean },
  ) {
    if (!teamId) {
      return;
    }

    const draft = get().trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();

    if (!timer) {
      clearTrackerDescriptionDirty(teamId);
      if (draft.syncedTimerId === null) {
        return;
      }

      set((s) => {
        const current = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();
        if (current.syncedTimerId === null) {
          return s;
        }
        return {
          ...s,
          trackerDraftsByTeam: {
            ...s.trackerDraftsByTeam,
            [teamId]: { ...current, syncedTimerId: null },
          },
        };
      });
      return;
    }

    const sameTimer = draft.syncedTimerId === timer.id;
    const skipDescription = shouldSkipActiveTimerDescriptionSync({
      sameTimer,
      skipDescription: options?.skipDescription,
      descriptionDirty: isTrackerDescriptionDirty(teamId),
    });

    if (!sameTimer) {
      clearTrackerDescriptionDirty(teamId);
      set((s) => {
        const current = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();
        return {
          ...s,
          trackerDraftsByTeam: {
            ...s.trackerDraftsByTeam,
            [teamId]: {
              description: timer.description,
              projectId: timer.projectId,
              taskId: timer.taskId ?? current.taskId ?? "",
              tagIds: timer.tags.map((tag) => tag.id),
              isBillable: timer.isBillable,
              syncedTimerId: timer.id,
            },
          },
        };
      });
      return;
    }

    const nextDescription = skipDescription ? draft.description : timer.description;
    const nextTaskId = options?.authoritative ? (timer.taskId ?? "") : draft.taskId;
    const nextProjectId = options?.authoritative ? timer.projectId : draft.projectId;
    const nextTagIds = options?.authoritative ? timer.tags.map((tag) => tag.id) : draft.tagIds;
    const nextIsBillable = options?.authoritative ? timer.isBillable : draft.isBillable;

    if (
      nextDescription === draft.description &&
      nextTaskId === draft.taskId &&
      nextProjectId === draft.projectId &&
      nextIsBillable === draft.isBillable &&
      nextTagIds.length === draft.tagIds.length &&
      nextTagIds.every((tagId, index) => tagId === draft.tagIds[index])
    ) {
      return;
    }

    set((s) => {
      const current = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();
      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: {
            ...current,
            description: skipDescription ? current.description : timer.description,
            projectId: nextProjectId,
            taskId: nextTaskId,
            tagIds: nextTagIds,
            isBillable: nextIsBillable,
          },
        },
      };
    });
  }

  function reconcileActiveTimerFromLive(
    teamId: string,
    timer: AgencyActiveTimer | null,
    eventUpdatedAt: string,
  ) {
    if (!teamId || (timer && timer.teamId !== teamId)) return;

    const previousUpdatedAt = get().timerLiveUpdatedAtByTeam[teamId];
    if (
      previousUpdatedAt &&
      new Date(eventUpdatedAt).getTime() < new Date(previousUpdatedAt).getTime()
    ) {
      return;
    }

    // Keep draft description when dirty; still accept authoritative task/tags/etc.
    const skipDescription = isTrackerDescriptionDirty(teamId);
    if (timer && skipDescription) {
      const draft = get().trackerDraftsByTeam[teamId];
      patchActiveTimerCaches(
        {
          ...timer,
          description: draft?.description ?? timer.description,
        },
        teamId,
      );
    } else {
      patchActiveTimerCaches(timer, teamId);
    }
    syncDraftFromActiveTimer(teamId, timer, {
      authoritative: true,
      skipDescription,
    });
    set((state) => ({
      ...state,
      timerLiveUpdatedAtByTeam: {
        ...state.timerLiveUpdatedAtByTeam,
        [teamId]: eventUpdatedAt,
      },
    }));
  }

  function patchTrackerDraft(teamId: string, patch: Partial<TrackerDraft>) {
    if (!teamId) {
      return;
    }

    set((s) => {
      const existing = s.trackerDraftsByTeam[teamId] ?? emptyTrackerDraft();
      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: { ...existing, ...patch },
        },
      };
    });
  }

  function registerActiveTimerQuery(payload: RegisteredActiveTimerQuery) {
    registerInto(activeTimerQueryRegistry, getRegistryKey(payload.queryKey), payload);
  }

  function unregisterActiveTimerQuery(queryKey: QueryKey) {
    unregisterFrom(activeTimerQueryRegistry, getRegistryKey(queryKey));
  }

  function registerLogQuery(payload: RegisteredLogQuery) {
    registerInto(logQueryRegistry, getRegistryKey(payload.queryKey), payload);
  }

  function unregisterLogQuery(queryKey: QueryKey) {
    unregisterFrom(logQueryRegistry, getRegistryKey(queryKey));
  }

  function captureTimerOverlaySnapshots(teamIds: Iterable<string>) {
    const snapshots = new Map<string, AgencyActiveTimer | null | undefined>();
    for (const teamId of teamIds) {
      snapshots.set(teamId, optimistic().snapshotActiveTimer(teamId));
    }
    return snapshots;
  }

  function restoreTimerOverlaySnapshots(
    snapshots: Map<string, AgencyActiveTimer | null | undefined>,
  ) {
    for (const [teamId, snapshot] of snapshots) {
      optimistic().restoreActiveTimer(teamId, snapshot);
    }
  }

  function captureEntryOverlaySnapshots(teamIds: Iterable<string>) {
    const snapshots = new Map<string, AgencyListOverlay<AgencyTimeEntry>>();
    for (const teamId of teamIds) {
      snapshots.set(teamId, optimistic().snapshotTimeEntries(teamId));
    }
    return snapshots;
  }

  function restoreEntryOverlaySnapshots(
    snapshots: Map<string, AgencyListOverlay<AgencyTimeEntry>>,
  ) {
    for (const [teamId, snapshot] of snapshots) {
      optimistic().restoreTimeEntries(teamId, snapshot);
    }
  }

  async function runStartTimer(payload: StartTimerPayload) {
    const previousActiveTimer = getCachedActiveTimer();
    // Prefer tracker draft for the running timer's team so typed desc/task unlock switch.
    const previousTimerDraft = previousActiveTimer
      ? get().trackerDraftsByTeam[previousActiveTimer.teamId]
      : null;
    const previousDraftTaskId = previousTimerDraft?.taskId?.trim() ?? "";
    const previousDraftTask =
      !previousActiveTimer?.taskId && previousDraftTaskId
        ? { id: previousDraftTaskId, title: "" }
        : null;
    // Idle start: require the payload task. Switch: require the running timer to be stoppable.
    const startBlockedMessage = getAgencyTimerStartBlockedMessage({
      activeTimer: previousActiveTimer,
      project: payload.project,
      description: previousTimerDraft?.description ?? previousActiveTimer?.description,
      selectedTask: previousActiveTimer ? previousDraftTask : payload.task,
    });

    if (startBlockedMessage) {
      toast.error("Can't start timer", { description: startBlockedMessage });
      return;
    }

    // Stop-then-start so draft description/task are saved; API start rollover only uses DB fields.
    if (previousActiveTimer) {
      let stopTask: { id: string; title: string } | null = null;

      if (previousActiveTimer.taskId) {
        stopTask = {
          id: previousActiveTimer.taskId,
          title: previousActiveTimer.taskTitle ?? "",
        };
      } else if (previousDraftTaskId) {
        const cachedTask =
          optimistic().findTask(previousActiveTimer.teamId, previousDraftTaskId) ??
          findProjectTaskInCache(previousActiveTimer.teamId, previousDraftTaskId);
        stopTask = {
          id: previousDraftTaskId,
          title: cachedTask?.title ?? "",
        };
      }

      const stopDescription = resolveAgencyTimerStopDescription(
        previousTimerDraft?.description ?? previousActiveTimer.description ?? "",
        stopTask?.title ?? previousActiveTimer.taskTitle,
        previousActiveTimer.projectName,
      );

      // Unbound timers can't be saved as entries — discard them when switching.
      const shouldDiscard =
        !previousActiveTimer.projectId.trim() && !stopTask && !previousActiveTimer.taskId;

      await runStopTimer({
        teamId: previousActiveTimer.teamId,
        activeTimer: previousActiveTimer,
        description: stopDescription,
        task: stopTask,
        discard: shouldDiscard,
      });

      if (getCachedActiveTimer()) {
        return;
      }
    }

    const previousDraft = getTrackerDraftSnapshot(payload.teamId);
    const affectedLogTeams = new Set<string>([payload.teamId]);
    const timerSnapshots = snapshotQueries(
      [...activeTimerQueryRegistry.values()].map((entry) => entry.payload),
    );

    const logSnapshots = snapshotQueries(getRegisteredLogQueries(affectedLogTeams));
    const timerOverlaySnapshots = captureTimerOverlaySnapshots([payload.teamId]);
    const entryOverlaySnapshots = captureEntryOverlaySnapshots(affectedLogTeams);
    const taskOverlaySnapshot = optimistic().snapshotTasks(payload.teamId);
    const nowIso = new Date().toISOString();
    const optimisticTimer = createOptimisticTimer({
      teamId: payload.teamId,
      project: payload.project,
      task: payload.task,
      description: payload.description,
      tagIds: payload.tagIds ?? previousDraft?.tagIds ?? [],
      isBillable: payload.isBillable ?? previousDraft?.isBillable ?? true,
      startedAt: nowIso,
    });
    const draft = ensureTrackerDraft(payload.teamId);

    if (!draft) {
      return;
    }

    set((s) => ({ ...s, timerStartCount: s.timerStartCount + 1 }));

    // #region agent log
    let startPhase = "enter";
    // #endregion

    try {
      // #region agent log
      startPhase = "cancel-queries";
      // #endregion
      await cancelQueries([...activeTimerQueryRegistry.values()].map((entry) => entry.payload));
      await cancelQueries(getRegisteredLogQueries(affectedLogTeams));

      // #region agent log
      startPhase = "optimistic-patch";
      // #endregion
      patchActiveTimerCaches(optimisticTimer);

      patchTrackerDraft(payload.teamId, {
        description: optimisticTimer.description,
        projectId: optimisticTimer.projectId,
        taskId: optimisticTimer.taskId ?? "",
        tagIds: (payload.tagIds ?? previousDraft?.tagIds ?? []).slice(),
        isBillable: payload.isBillable ?? previousDraft?.isBillable ?? true,
        syncedTimerId: optimisticTimer.id,
      });

      // Server promotes open → in_progress on timer start; mirror that in the task rail.
      if (payload.task) {
        const cachedTask =
          optimistic().findTask(payload.teamId, payload.task.id) ??
          findProjectTaskInCache(payload.teamId, payload.task.id);
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
            location: "agency-time-tracking.ts:runStartTimer:cachedTask",
            message: "cached task before in_progress patch",
            data: {
              hasCachedTask: Boolean(cachedTask),
              status: cachedTask?.status ?? null,
              assigneesIsArray: Array.isArray(
                (cachedTask as { assignees?: unknown } | null)?.assignees,
              ),
              assigneesType: typeof (cachedTask as { assignees?: unknown } | null)?.assignees,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        if (cachedTask && cachedTask.status === "open") {
          // #region agent log
          startPhase = "task-cache-patch";
          // #endregion
          await settledQueryCancel(() => cancelAgencyProjectTaskListQueries(payload.teamId));
          const inProgressTask = {
            ...cachedTask,
            status: "in_progress" as const,
            viewerStatus: "in_progress" as const,
            updatedAt: nowIso,
          };
          optimistic().upsertTask(payload.teamId, inProgressTask);
          patchUpdatedProjectTaskInCache(payload.teamId, inProgressTask);
        }
      }

      // #region agent log
      startPhase = "api-start";
      fetch("http://127.0.0.1:7426/ingest/ccff2d3d-07dc-43a2-9258-da9208dfd805", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "ecaea0",
        },
        body: JSON.stringify({
          sessionId: "ecaea0",
          runId: "pre-fix",
          hypothesisId: "H1",
          location: "agency-time-tracking.ts:runStartTimer:beforeApi",
          message: "timer start draft/tag shape before API",
          data: {
            payloadTagIdsIsArray: Array.isArray(payload.tagIds),
            draftTagIdsIsArray: Array.isArray(previousDraft?.tagIds),
            draftTagIdsType: typeof previousDraft?.tagIds,
            hasTask: Boolean(payload.task),
            hasProject: Boolean(payload.project),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      const result = (await orpcClient.agencyOps.timer.start({
        teamId: payload.teamId,
        ...(payload.project ? { projectId: payload.project.id } : {}),
        ...(payload.task ? { taskId: payload.task.id } : {}),
        description: payload.description.trim(),
        tagIds: payload.tagIds ?? previousDraft?.tagIds,
        isBillable: payload.isBillable ?? previousDraft?.isBillable,
      })) as {
        timer: AgencyActiveTimer | null;
        createdEntry: AgencyTimeEntry | null;
      };

      // #region agent log
      startPhase = "post-api-sync";
      fetch("http://127.0.0.1:7426/ingest/ccff2d3d-07dc-43a2-9258-da9208dfd805", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "ecaea0",
        },
        body: JSON.stringify({
          sessionId: "ecaea0",
          runId: "pre-fix",
          hypothesisId: "H3",
          location: "agency-time-tracking.ts:runStartTimer:afterApi",
          message: "timer start API result shape",
          data: {
            hasTimer: Boolean(result.timer),
            tagsIsArray: Array.isArray(result.timer?.tags),
            tagsType: typeof result.timer?.tags,
            tagsLength: Array.isArray(result.timer?.tags) ? result.timer.tags.length : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      patchActiveTimerCaches(result.timer, payload.teamId);
      syncDraftFromActiveTimer(payload.teamId, result.timer);

      void refetchAgencyActiveTimerQueries(payload.teamId);
      // Do not refetch task lists here: it races the in_progress optimistic
      // patch and flashes status back to open.
      void refetchAgencyTimeEntriesListQueries(payload.teamId);

      toast.success("Timer started", { description: payload.successDescription });
    } catch (error) {
      if (isQueryCancelRejection(error)) {
        return;
      }
      // #region agent log
      const err = error as { message?: string; stack?: string; name?: string };
      fetch("http://127.0.0.1:7426/ingest/ccff2d3d-07dc-43a2-9258-da9208dfd805", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "ecaea0",
        },
        body: JSON.stringify({
          sessionId: "ecaea0",
          runId: "pre-fix",
          hypothesisId: "H1-H3",
          location: "agency-time-tracking.ts:runStartTimer:catch",
          message: "Unable to start timer caught",
          data: {
            startPhase,
            errorName: err?.name ?? typeof error,
            errorMessage: getErrorMessage(error, "unknown"),
            stack: typeof err?.stack === "string" ? err.stack.slice(0, 1500) : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      console.error("[debug-ecaea0] startTimer failed", { startPhase, error });
      // #endregion
      restoreQuerySnapshots(timerSnapshots);
      restoreQuerySnapshots(logSnapshots);
      restoreTimerOverlaySnapshots(timerOverlaySnapshots);
      restoreEntryOverlaySnapshots(entryOverlaySnapshots);
      optimistic().restoreTasks(payload.teamId, taskOverlaySnapshot);
      restoreTrackerDraft(payload.teamId, previousDraft);

      toast.error("Unable to start timer", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({ ...s, timerStartCount: Math.max(0, s.timerStartCount - 1) }));
    }
  }

  async function restartEntry(payload: RestartEntryPayload) {
    await startTimer({
      teamId: payload.teamId,
      project: payload.project,
      task: payload.task,
      description: payload.description,
      tagIds: payload.tagIds,
      isBillable: payload.isBillable,
      successDescription: `Tracking ${payload.description || "time"}.`,
    });
  }

  async function runStopTimer(payload: StopTimerPayload) {
    const activeTimer = payload.activeTimer ?? getCachedActiveTimer();

    if (!activeTimer) {
      return;
    }

    const selectedTask = payload.task ?? null;
    const description = resolveAgencyTimerStopDescription(
      payload.description,
      selectedTask?.title ?? activeTimer.taskTitle,
      activeTimer.projectName,
    );

    if (!payload.discard) {
      const stopBlockedMessage = getAgencyTimerStopBlockedMessage({
        activeTimer: {
          taskId: activeTimer.taskId,
          taskTitle: activeTimer.taskTitle,
          description: activeTimer.description,
          projectId: activeTimer.projectId,
        },
        description,
        selectedTask,
        selectedTaskId: selectedTask?.id,
        selectedTaskTitle: selectedTask?.title,
      });

      if (stopBlockedMessage) {
        toast.error("Can't stop timer", { description: stopBlockedMessage });
        return;
      }
    }

    const previousDraft = getTrackerDraftSnapshot(payload.teamId);

    const timerSnapshots = snapshotQueries(
      [...activeTimerQueryRegistry.values()].map((entry) => entry.payload),
    );
    const affectedLogTeams = new Set<string>([activeTimer.teamId]);
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(affectedLogTeams));
    const timerOverlaySnapshots = captureTimerOverlaySnapshots([activeTimer.teamId]);
    const entryOverlaySnapshots = captureEntryOverlaySnapshots(affectedLogTeams);
    const optimisticEntry = payload.discard
      ? null
      : createOptimisticEntryFromTimer(activeTimer, {
          endedAt: new Date().toISOString(),
          description: description || activeTimer.description,
          taskId: selectedTask?.id ?? activeTimer.taskId,
          taskTitle: selectedTask?.title ?? activeTimer.taskTitle,
        });
    const draft = ensureTrackerDraft(payload.teamId);

    if (!draft) {
      return;
    }

    set((s) => ({ ...s, timerStopCount: s.timerStopCount + 1 }));

    try {
      await cancelQueries([...activeTimerQueryRegistry.values()].map((entry) => entry.payload));
      await cancelQueries(getRegisteredLogQueries(affectedLogTeams));

      if (optimisticEntry) {
        patchInsertedEntry(activeTimer.teamId, optimisticEntry);
      }

      patchActiveTimerCaches(null, activeTimer.teamId);

      patchTrackerDraft(
        payload.teamId,
        payload.discard
          ? emptyTrackerDraft()
          : createRetainedTrackerDraftAfterStop({
              activeTimer,
              previousDraft,
              selectedTaskId: selectedTask?.id,
              description,
              tagIds: payload.tagIds,
              isBillable: payload.isBillable,
            }),
      );

      const result = (await orpcClient.agencyOps.timer.stop({
        teamId: payload.teamId,
        taskId: selectedTask?.id,
        description,
        tagIds: payload.tagIds ?? previousDraft?.tagIds,
        isBillable: payload.isBillable ?? previousDraft?.isBillable,
        discard: payload.discard,
      })) as {
        timer: AgencyActiveTimer | null;
        createdEntry: AgencyTimeEntry | null;
      };

      patchActiveTimerCaches(result.timer, activeTimer.teamId);

      if (optimisticEntry && result.createdEntry) {
        reconcileCreatedEntry(activeTimer.teamId, optimisticEntry.id, result.createdEntry);
      } else if (optimisticEntry && !result.createdEntry) {
        patchDeletedEntries(activeTimer.teamId, [optimisticEntry]);
      }

      void refetchAgencyActiveTimerQueries(activeTimer.teamId);
      if (!payload.discard) {
        void refetchAgencyTimeEntriesListQueries(activeTimer.teamId);
      }

      toast.success(payload.discard ? "Timer discarded" : "Timer stopped");
    } catch (error) {
      if (isQueryCancelRejection(error)) {
        return;
      }
      restoreQuerySnapshots(timerSnapshots);
      restoreQuerySnapshots(logSnapshots);
      restoreTimerOverlaySnapshots(timerOverlaySnapshots);
      restoreEntryOverlaySnapshots(entryOverlaySnapshots);
      restoreTrackerDraft(payload.teamId, previousDraft);

      toast.error(payload.discard ? "Unable to discard timer" : "Unable to stop timer", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({ ...s, timerStopCount: Math.max(0, s.timerStopCount - 1) }));
    }
  }

  async function updateActiveTimerStart(payload: UpdateActiveTimerStartPayload) {
    const nextMs = new Date(payload.startedAt).getTime();
    const currentMs = new Date(payload.activeTimer.startedAt).getTime();
    if (!Number.isNaN(nextMs) && !Number.isNaN(currentMs) && nextMs === currentMs) {
      return;
    }

    const timerSnapshots = snapshotQueries(
      [...activeTimerQueryRegistry.values()].map((entry) => entry.payload),
    );
    const timerOverlaySnapshots = captureTimerOverlaySnapshots([payload.teamId]);
    const optimisticTimer: AgencyActiveTimer = {
      ...payload.activeTimer,
      startedAt: payload.startedAt,
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({ ...s, timerAdjustCount: s.timerAdjustCount + 1 }));

    try {
      patchActiveTimerCaches(optimisticTimer);

      const result = (await orpcClient.agencyOps.timer.updateStart({
        teamId: payload.teamId,
        startedAt: payload.startedAt,
      })) as { timer: AgencyActiveTimer };

      patchActiveTimerCaches(result.timer);
    } catch (error) {
      restoreQuerySnapshots(timerSnapshots);
      restoreTimerOverlaySnapshots(timerOverlaySnapshots);

      toast.error("Unable to update start time", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({ ...s, timerAdjustCount: Math.max(0, s.timerAdjustCount - 1) }));
    }
  }

  async function deleteEntries(payload: DeleteEntriesPayload) {
    if (payload.entries.length === 0) {
      return;
    }

    const uniqueEntries = dedupeEntries(payload.entries);
    const ids = uniqueEntries.map((entry) => entry.id);
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(new Set([payload.teamId])));
    const entryOverlaySnapshot = optimistic().snapshotTimeEntries(payload.teamId);

    set((s) => ({ ...s, deletingEntryIds: [...new Set([...get().deletingEntryIds, ...ids])] }));

    try {
      patchDeletedEntries(payload.teamId, uniqueEntries);

      await Promise.all(
        ids.map((entryId) =>
          orpcClient.agencyOps.timeEntries.deleteMine({
            teamId: payload.teamId,
            entryId,
          }),
        ),
      );
    } catch (error) {
      restoreQuerySnapshots(logSnapshots);
      optimistic().restoreTimeEntries(payload.teamId, entryOverlaySnapshot);

      toast.error(ids.length > 1 ? "Unable to delete entries" : "Unable to delete entry", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({
        ...s,
        deletingEntryIds: releasePendingEntryIds(s.deletingEntryIds, ids),
      }));
    }
  }

  function getRegistryKey(queryKey: QueryKey) {
    return JSON.stringify(queryKey);
  }

  function getCachedActiveTimer() {
    const optimisticState = useAgencyOptimisticStore.getState();
    for (const timer of Object.values(optimisticState.activeTimers)) {
      if (timer !== undefined) {
        return timer;
      }
    }

    const queryClient = getQueryClient();

    for (const query of queryClient.getQueryCache().findAll()) {
      const path = query.queryKey[0];
      if (
        !Array.isArray(path) ||
        path[0] !== "agencyOps" ||
        path[1] !== "timer" ||
        path[2] !== "getActive"
      ) {
        continue;
      }
      const cached = queryClient.getQueryData<AgencyActiveTimerQueryData>(query.queryKey);
      if (cached?.timer) {
        return cached.timer;
      }
    }

    return null;
  }

  function getTrackerDraftSnapshot(teamId: string) {
    const existingDraft = get().trackerDraftsByTeam[teamId];

    if (!existingDraft) {
      return null;
    }

    return { ...existingDraft } satisfies TrackerDraft;
  }

  function restoreTrackerDraft(teamId: string, snapshot: TrackerDraft | null) {
    set((s) => {
      if (!snapshot) {
        const { [teamId]: _removed, ...rest } = s.trackerDraftsByTeam;
        return { ...s, trackerDraftsByTeam: rest };
      }

      return {
        ...s,
        trackerDraftsByTeam: {
          ...s.trackerDraftsByTeam,
          [teamId]: { ...snapshot },
        },
      };
    });
  }

  function createOptimisticId(prefix: string) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function createOptimisticTimer(payload: {
    teamId: string;
    project: Pick<AgencyProjectSummary, "id" | "name"> | null;
    task: Pick<AgencyProjectTask, "id" | "title"> | null;
    description: string;
    tagIds?: string[];
    isBillable?: boolean;
    startedAt: string;
  }) {
    return {
      id: createOptimisticId("agency-active-timer"),
      teamId: payload.teamId,
      userId: getCurrentUserId(),
      projectId: payload.project?.id ?? "",
      taskId: payload.task?.id ?? null,
      taskTitle: payload.task?.title ?? null,
      projectName: payload.project?.name ?? "",
      description: payload.description.trim(),
      tags: [],
      links: [],
      isBillable: payload.isBillable ?? true,
      startedAt: payload.startedAt,
      createdAt: payload.startedAt,
      updatedAt: payload.startedAt,
    } satisfies AgencyActiveTimer;
  }

  function createOptimisticEntryFromTimer(
    timer: AgencyActiveTimer,
    overrides: {
      endedAt: string;
      description?: string;
      clientId?: string;
      clientName?: string;
      taskId?: string | null;
      taskTitle?: string | null;
    },
  ) {
    return {
      id: createOptimisticId("agency-time"),
      teamId: timer.teamId,
      userId: timer.userId,
      userName: OPTIMISTIC_USER_NAME,
      projectId: timer.projectId,
      taskId: overrides.taskId ?? timer.taskId,
      taskTitle: overrides.taskTitle ?? timer.taskTitle,
      projectName: timer.projectName,
      clientId: overrides.clientId ?? OPTIMISTIC_CLIENT_ID,
      clientName: overrides.clientName ?? OPTIMISTIC_CLIENT_NAME,
      source: "timer",
      description: overrides.description ?? timer.description,
      tags: timer.tags,
      links: timer.links ?? [],
      isBillable: timer.isBillable,
      isWaste: false,
      startedAt: timer.startedAt,
      endedAt: overrides.endedAt,
      durationSeconds: getDurationSeconds(timer.startedAt, overrides.endedAt),
      createdAt: overrides.endedAt,
      updatedAt: overrides.endedAt,
    } satisfies AgencyTimeEntry;
  }

  function createOptimisticDuplicateEntry(source: AgencyTimeEntry) {
    const now = new Date().toISOString();

    return {
      ...source,
      id: createOptimisticId("agency-time"),
      source: "manual",
      createdAt: now,
      updatedAt: now,
    } satisfies AgencyTimeEntry;
  }

  function createOptimisticManualEntry(payload: CreateManualEntryPayload) {
    const now = new Date().toISOString();
    const description = payload.description.trim();

    return {
      id: createOptimisticId("agency-time"),
      teamId: payload.teamId,
      userId: getCurrentUserId(),
      userName: OPTIMISTIC_USER_NAME,
      projectId: payload.project.id,
      taskId: payload.task?.id ?? null,
      taskTitle: payload.task?.title ?? null,
      projectName: payload.project.name,
      clientId: payload.project.clientId,
      clientName: payload.project.clientName,
      source: "manual",
      description,
      tags: [],
      links: [],
      isBillable: payload.isBillable ?? true,
      isWaste: false,
      startedAt: payload.startAt,
      endedAt: payload.endAt,
      durationSeconds: getDurationSeconds(payload.startAt, payload.endAt),
      createdAt: now,
      updatedAt: now,
    } satisfies AgencyTimeEntry;
  }

  function getDurationSeconds(startedAt: string, endedAt: string) {
    const startedAtMs = new Date(startedAt).getTime();
    const endedAtMs = new Date(endedAt).getTime();

    if (Number.isNaN(startedAtMs) || Number.isNaN(endedAtMs)) {
      return 1;
    }

    return Math.max(1, Math.floor((endedAtMs - startedAtMs) / 1_000));
  }

  async function cancelQueries(queries: Iterable<{ queryKey: QueryKey }>) {
    await Promise.all(
      [...queries].map((query) =>
        settledQueryCancel(() => getQueryClient().cancelQueries({ queryKey: query.queryKey })),
      ),
    );
  }

  function emptyTimeEntriesList(page: number, pageSize = 20): AgencyTimeEntriesListQueryData {
    return {
      items: [],
      page,
      pageSize,
      total: 0,
      weekSummary: {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        totalSeconds: 0,
        daily: [],
      },
    };
  }

  function getRegisteredLogQueries(teamIds: Set<string>) {
    return [...logQueryRegistry.values()]
      .map((entry) => entry.payload)
      .filter((registeredQuery) => teamIds.has(registeredQuery.teamId));
  }

  function patchActiveTimerCaches(timer: AgencyActiveTimer | null, targetTeamId?: string) {
    const teamId = timer?.teamId ?? targetTeamId;
    if (teamId) {
      optimistic().setActiveTimer(teamId, timer);
      patchActiveTimerInCache(teamId, timer);
      return;
    }

    for (const { payload: registeredQuery } of activeTimerQueryRegistry.values()) {
      optimistic().setActiveTimer(registeredQuery.teamId, null);
      patchActiveTimerInCache(registeredQuery.teamId, null);
    }
  }

  function patchInsertedEntry(teamId: string, entry: AgencyTimeEntry) {
    optimistic().upsertTimeEntry(teamId, entry);
    logQueryRegistry.forEach(({ payload: registeredQuery }) => {
      if (registeredQuery.teamId !== teamId) {
        return;
      }

      getQueryClient().setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current) => {
          const base = current ?? emptyTimeEntriesList(registeredQuery.page);

          return {
            ...base,
            items:
              registeredQuery.page === 1
                ? [entry, ...base.items].slice(0, base.pageSize)
                : base.items,
            total: base.total + 1,
            weekSummary: updateWeekSummary(base.weekSummary, entry, 1),
          };
        },
      );
    });
  }

  function patchDeletedEntries(
    teamId: string,
    entries: Array<Pick<AgencyTimeEntry, "id" | "startedAt" | "durationSeconds">>,
  ) {
    optimistic().deleteTimeEntries(
      teamId,
      entries.map((entry) => entry.id),
    );
    const deletedIds = new Set(entries.map((entry) => entry.id));

    logQueryRegistry.forEach(({ payload: registeredQuery }) => {
      if (registeredQuery.teamId !== teamId) {
        return;
      }

      getQueryClient().setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            items: current.items.filter((entry) => !deletedIds.has(entry.id)),
            total: Math.max(0, current.total - entries.length),
            weekSummary: entries.reduce(
              (summary, entry) => updateWeekSummary(summary, entry, -1),
              current.weekSummary,
            ),
          };
        },
      );
    });
  }

  function updateWeekSummary(
    weekSummary: AgencyWeekSummary,
    entry: Pick<AgencyTimeEntry, "startedAt" | "durationSeconds">,
    direction: 1 | -1,
  ) {
    const startedAtMs = new Date(entry.startedAt).getTime();
    const weekStartMs = new Date(weekSummary.startDate).getTime();
    const weekEndMs = new Date(weekSummary.endDate).getTime();

    if (
      Number.isNaN(startedAtMs) ||
      Number.isNaN(weekStartMs) ||
      Number.isNaN(weekEndMs) ||
      startedAtMs < weekStartMs ||
      startedAtMs > weekEndMs
    ) {
      return weekSummary;
    }

    const dateKey = entry.startedAt.slice(0, 10);
    const nextTotals = new Map(
      weekSummary.daily.map((dailyEntry) => [dailyEntry.date, dailyEntry.totalSeconds]),
    );
    const nextTotalSeconds = Math.max(
      0,
      weekSummary.totalSeconds + direction * entry.durationSeconds,
    );
    const nextDailyTotal = Math.max(
      0,
      (nextTotals.get(dateKey) ?? 0) + direction * entry.durationSeconds,
    );

    if (nextDailyTotal > 0) {
      nextTotals.set(dateKey, nextDailyTotal);
    } else {
      nextTotals.delete(dateKey);
    }

    return {
      ...weekSummary,
      totalSeconds: nextTotalSeconds,
      daily: [...nextTotals.entries()]
        .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
        .map(([date, totalSeconds]) => ({ date, totalSeconds })),
    };
  }

  function reconcileCreatedEntry(
    teamId: string,
    optimisticIdValue: string,
    created: AgencyTimeEntry,
  ) {
    optimistic().reconcileTimeEntry(teamId, optimisticIdValue, created);
    logQueryRegistry.forEach(({ payload: registeredQuery }) => {
      if (registeredQuery.teamId !== teamId) return;
      getQueryClient().setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current) => {
          const base = current ?? emptyTimeEntriesList(registeredQuery.page);
          const hasOptimistic = base.items.some((item) => item.id === optimisticIdValue);
          if (hasOptimistic) {
            return {
              ...base,
              items: base.items.map((item) => (item.id === optimisticIdValue ? created : item)),
            };
          }
          if (base.items.some((item) => item.id === created.id)) {
            return {
              ...base,
              items: base.items.map((item) => (item.id === created.id ? created : item)),
            };
          }
          return {
            ...base,
            items:
              registeredQuery.page === 1
                ? [created, ...base.items].slice(0, base.pageSize)
                : base.items,
            total: base.total + 1,
            weekSummary: updateWeekSummary(base.weekSummary, created, 1),
          };
        },
      );
    });
  }

  function patchUpdatedEntry(teamId: string, previous: AgencyTimeEntry, next: AgencyTimeEntry) {
    optimistic().upsertTimeEntry(teamId, next);

    logQueryRegistry.forEach(({ payload: registeredQuery }) => {
      if (registeredQuery.teamId !== teamId) {
        return;
      }

      getQueryClient().setQueryData<AgencyTimeEntriesListQueryData | undefined>(
        registeredQuery.queryKey,
        (current) => {
          if (!current) {
            return current;
          }

          const hasEntry = current.items.some((item) => item.id === next.id);
          if (!hasEntry) {
            return current;
          }

          return {
            ...current,
            items: current.items.map((item) => (item.id === next.id ? next : item)),
            weekSummary: updateWeekSummary(
              updateWeekSummary(current.weekSummary, previous, -1),
              next,
              1,
            ),
          };
        },
      );
    });
  }

  function createOptimisticUpdatedEntry(
    payload: UpdateEntryPayload,
    previous: AgencyTimeEntry,
  ): AgencyTimeEntry {
    return {
      ...previous,
      projectId: payload.project.id,
      projectName: payload.project.name,
      clientId: payload.project.clientId,
      clientName: payload.project.clientName,
      taskId: payload.taskId,
      taskTitle: payload.task?.title ?? null,
      description: payload.description.trim(),
      ...(payload.tagIds !== undefined ? { tags: previous.tags } : {}),
      ...(payload.links !== undefined
        ? {
            links: payload.links.map((url, index) => ({
              id: `optimistic-link-${index}`,
              url,
            })),
          }
        : {}),
      ...(payload.isBillable !== undefined ? { isBillable: payload.isBillable } : {}),
      startedAt: payload.startAt,
      endedAt: payload.endAt,
      durationSeconds: payload.durationSeconds,
      updatedAt: new Date().toISOString(),
    };
  }

  function findTimeEntry(teamId: string, entryId: string): AgencyTimeEntry | null {
    for (const { payload: registeredQuery } of logQueryRegistry.values()) {
      if (registeredQuery.teamId !== teamId) continue;
      const cached = getQueryClient().getQueryData<AgencyTimeEntriesListQueryData>(
        registeredQuery.queryKey,
      );
      const found = cached?.items.find((item) => item.id === entryId);
      if (found) return found;
    }

    // Full cache scan: registry can miss keepPreviousData / unregistered observers.
    for (const query of getQueryClient().getQueryCache().findAll()) {
      if (!isAgencyTimeEntriesListQueryKey(query.queryKey, teamId)) continue;
      const cached = getQueryClient().getQueryData<AgencyTimeEntriesListQueryData>(query.queryKey);
      const found = cached?.items.find((item) => item.id === entryId);
      if (found) return found;
    }

    const overlay = optimistic().timeEntries[teamId];
    if (!overlay) return null;
    if (overlay.upserts[entryId]) return overlay.upserts[entryId] as AgencyTimeEntry;
    for (const [optimisticId, realId] of Object.entries(overlay.idMap)) {
      if (realId !== entryId) continue;
      const upsert = overlay.upserts[optimisticId] ?? overlay.upserts[realId];
      if (upsert) return { ...upsert, id: entryId } as AgencyTimeEntry;
    }
    return null;
  }

  async function duplicateEntry(payload: DuplicateEntryPayload) {
    const { teamId, entry } = payload;
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(new Set([teamId])));
    const entryOverlaySnapshot = optimistic().snapshotTimeEntries(teamId);
    const optimisticEntry = createOptimisticDuplicateEntry(entry);

    set((s) => ({
      ...s,
      duplicatingEntryIds: [...new Set([...s.duplicatingEntryIds, entry.id])],
    }));

    try {
      patchInsertedEntry(teamId, optimisticEntry);

      const created = (await orpcClient.agencyOps.timeEntries.createManual({
        teamId,
        projectId: entry.projectId,
        taskId: entry.taskId ?? undefined,
        startAt: entry.startedAt,
        endAt: entry.endedAt,
        description: entry.description,
        tagIds: entry.tags.map((tag) => tag.id),
        isBillable: entry.isBillable,
      })) as AgencyTimeEntry;

      reconcileCreatedEntry(teamId, optimisticEntry.id, created);
    } catch (error) {
      patchDeletedEntries(teamId, [optimisticEntry]);
      restoreQuerySnapshots(logSnapshots);
      optimistic().restoreTimeEntries(teamId, entryOverlaySnapshot);

      toast.error("Unable to duplicate entry", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({
        ...s,
        duplicatingEntryIds: releasePendingEntryIds(s.duplicatingEntryIds, [entry.id]),
      }));
    }
  }

  async function createManualEntry(payload: CreateManualEntryPayload) {
    const { teamId } = payload;
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(new Set([teamId])));
    const entryOverlaySnapshot = optimistic().snapshotTimeEntries(teamId);
    const optimisticEntry = createOptimisticManualEntry(payload);

    set((s) => ({ ...s, manualCreateCount: s.manualCreateCount + 1 }));

    try {
      patchInsertedEntry(teamId, optimisticEntry);

      const created = (await orpcClient.agencyOps.timeEntries.createManual({
        teamId,
        projectId: payload.project.id,
        taskId: payload.task?.id,
        startAt: payload.startAt,
        endAt: payload.endAt,
        description: payload.description.trim() || undefined,
        tagIds: payload.tagIds,
        isBillable: payload.isBillable,
      })) as AgencyTimeEntry;

      reconcileCreatedEntry(teamId, optimisticEntry.id, created);
      return created;
    } catch (error) {
      patchDeletedEntries(teamId, [optimisticEntry]);
      restoreQuerySnapshots(logSnapshots);
      optimistic().restoreTimeEntries(teamId, entryOverlaySnapshot);

      toast.error("Unable to add entry", {
        description: getErrorMessage(error, "Please try again."),
      });
      return null;
    } finally {
      set((s) => ({ ...s, manualCreateCount: Math.max(0, s.manualCreateCount - 1) }));
    }
  }

  async function updateEntry(payload: UpdateEntryPayload) {
    const logSnapshots = snapshotQueries(getRegisteredLogQueries(new Set([payload.teamId])));
    const entryOverlaySnapshot = optimistic().snapshotTimeEntries(payload.teamId);
    const previousEntry = payload.previousEntry ?? findTimeEntry(payload.teamId, payload.entryId);

    if (!previousEntry) {
      toast.error("Unable to update entry", { description: "Entry not found." });
      return;
    }

    const optimisticEntry = createOptimisticUpdatedEntry(payload, previousEntry);

    set((s) => ({
      ...s,
      updatingEntryIds: [...new Set([...s.updatingEntryIds, payload.entryId])],
    }));

    try {
      patchUpdatedEntry(payload.teamId, previousEntry, optimisticEntry);

      const updated = (await orpcClient.agencyOps.timeEntries.updateMine({
        teamId: payload.teamId,
        entryId: payload.entryId,
        projectId: payload.project.id,
        taskId: payload.taskId,
        description: payload.description.trim(),
        startAt: payload.startAt,
        endAt: payload.endAt,
        tagIds: payload.tagIds,
        links: payload.links,
        isBillable: payload.isBillable,
      })) as AgencyTimeEntry;

      patchUpdatedEntry(payload.teamId, optimisticEntry, updated);
    } catch (error) {
      restoreQuerySnapshots(logSnapshots);
      optimistic().restoreTimeEntries(payload.teamId, entryOverlaySnapshot);
      toast.error("Unable to update entry", {
        description: getErrorMessage(error, "Please try again."),
      });
    } finally {
      set((s) => ({
        ...s,
        updatingEntryIds: releasePendingEntryIds(s.updatingEntryIds, [payload.entryId]),
      }));
    }
  }

  async function updateEntriesBulk(payload: UpdateEntriesBulkPayload) {
    const entryIds = [...new Set(payload.entryIds)];
    if (entryIds.length === 0) return;

    const previousById = new Map(
      (payload.previousEntries ?? []).map((entry) => [entry.id, entry] as const),
    );
    const previousEntries = entryIds
      .map((entryId) => previousById.get(entryId) ?? findTimeEntry(payload.teamId, entryId))
      .filter((entry): entry is AgencyTimeEntry => entry !== null);
    if (previousEntries.length !== entryIds.length) {
      toast.error("Unable to update entries", {
        description: "One or more entries were not found.",
      });
      throw new Error("One or more entries were not found.");
    }

    const logSnapshots = snapshotQueries(getRegisteredLogQueries(new Set([payload.teamId])));
    const entryOverlaySnapshot = optimistic().snapshotTimeEntries(payload.teamId);
    const optimisticEntries = previousEntries.map((entry) => ({
      ...entry,
      ...(payload.patch.projectId
        ? {
            projectId: payload.patch.projectId,
            taskId: payload.patch.taskId ?? null,
            taskTitle: null,
          }
        : {}),
      ...(payload.patch.taskId ? { taskId: payload.patch.taskId } : {}),
      ...(payload.patch.description !== undefined
        ? { description: payload.patch.description.trim() }
        : {}),
      ...(payload.patch.links !== undefined
        ? {
            links: payload.patch.links.map((url, index) => ({
              id: `optimistic-link-${index}`,
              url,
            })),
          }
        : {}),
      ...(payload.patch.isBillable !== undefined ? { isBillable: payload.patch.isBillable } : {}),
      ...(payload.patch.isWaste !== undefined ? { isWaste: payload.patch.isWaste } : {}),
      updatedAt: new Date().toISOString(),
    }));

    set((s) => ({
      ...s,
      updatingEntryIds: [...new Set([...s.updatingEntryIds, ...entryIds])],
    }));

    try {
      optimisticEntries.forEach((entry, index) => {
        patchUpdatedEntry(payload.teamId, previousEntries[index]!, entry);
      });

      const result = (await orpcClient.agencyOps.timeEntries.updateMineBulk({
        teamId: payload.teamId,
        entryIds,
        patch: payload.patch,
      })) as { items: AgencyTimeEntry[] };

      result.items.forEach((entry) => {
        const optimisticEntry = optimisticEntries.find((item) => item.id === entry.id);
        if (optimisticEntry) patchUpdatedEntry(payload.teamId, optimisticEntry, entry);
      });
    } catch (error) {
      restoreQuerySnapshots(logSnapshots);
      optimistic().restoreTimeEntries(payload.teamId, entryOverlaySnapshot);
      toast.error("Unable to update entries", {
        description: getErrorMessage(error, "Please try again."),
      });
      throw error;
    } finally {
      set((s) => ({
        ...s,
        updatingEntryIds: releasePendingEntryIds(s.updatingEntryIds, entryIds),
      }));
    }
  }

  function dedupeEntries(entries: DeleteEntriesPayload["entries"]) {
    const seenIds = new Set<string>();

    return entries.filter((entry) => {
      if (seenIds.has(entry.id)) {
        return false;
      }

      seenIds.add(entry.id);
      return true;
    });
  }

  function requestOpenTaskChooser() {
    set((s) => ({ ...s, taskChooserOpenRequest: s.taskChooserOpenRequest + 1 }));
  }

  return {
    ensureTrackerDraft,
    setTrackerDescription,
    setTrackerProjectId,
    setTrackerTaskId,
    setTrackerTagIds,
    setTrackerIsBillable,
    syncDraftFromActiveTimer,
    reconcileActiveTimerFromLive,
    flushActiveTimerDescription,
    updateActiveTimerLinks,
    registerActiveTimerQuery,
    unregisterActiveTimerQuery,
    registerLogQuery,
    unregisterLogQuery,
    startTimer,
    restartEntry,
    stopTimer,
    updateActiveTimerStart,
    deleteEntries,
    duplicateEntry,
    createManualEntry,
    updateEntry,
    updateEntriesBulk,
    requestOpenTaskChooser,
  };
}

export const useAgencyTimeTrackingStore = create<AgencyTimeTrackingState>((set, get) => ({
  timerStartCount: 0,
  timerStopCount: 0,
  timerAdjustCount: 0,
  timerQueueDepth: 0,
  deletingEntryIds: [],
  updatingEntryIds: [],
  duplicatingEntryIds: [],
  manualCreateCount: 0,
  trackerDraftsByTeam: {},
  timerLiveUpdatedAtByTeam: {},
  taskChooserOpenRequest: 0,
  ...createAgencyTimeTrackingActions(
    (fn) => set((state) => fn(state as AgencyTimeTrackingState)),
    () => get() as AgencyTimeTrackingState,
  ),
}));

export function useTrackerDraft(teamId: string) {
  return useAgencyTimeTrackingStore((s) =>
    teamId ? (s.trackerDraftsByTeam[teamId] ?? null) : null,
  );
}

export const selectIsTimerMutationPending = (s: AgencyTimeTrackingState) =>
  s.timerQueueDepth > 0 || s.timerStartCount > 0 || s.timerStopCount > 0 || s.timerAdjustCount > 0;
