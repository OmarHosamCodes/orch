import { create } from "zustand";

import {
  createBreakTimerFields,
  DEFAULT_BREAK_DURATION_SECONDS,
  pauseBreakTimer,
  resetBreakTimer,
  setBreakDuration,
  startBreakTimer,
  syncBreakRemaining,
} from "@/features/task-management/break-timer/break-timer-state";

const STORAGE_KEY_V2 = "orch.agency.tracker-right-panel.v2";
const STORAGE_KEY_V1 = "orch.agency.tracker-right-panel.v1";

export type TrackerRightPanelSurfaceKind = "my-tasks" | "break" | "agent";

export type TrackerRightPanelMyTasksSurface = {
  id: string;
  kind: "my-tasks";
};

export type TrackerRightPanelAgentSurface = {
  id: string;
  kind: "agent";
};

export type TrackerRightPanelBreakSurface = {
  id: string;
  kind: "break";
  durationSeconds: number;
  startedAt: number | null;
  pausedAt: number | null;
  remainingSeconds: number;
};

export type TrackerRightPanelSurface =
  | TrackerRightPanelMyTasksSurface
  | TrackerRightPanelAgentSurface
  | TrackerRightPanelBreakSurface;

export type OpenBreakSurfaceOptions = {
  durationSeconds?: number;
};

type PersistedState = {
  isOpen: boolean;
  surfaces: TrackerRightPanelSurface[];
  activeSurfaceId: string | null;
};

type AgencyTrackerRightPanelStore = PersistedState & {
  hydrated: boolean;
  hydrate: () => void;
  persist: () => void;
  canOpenSurface: (kind: TrackerRightPanelSurfaceKind) => boolean;
  openSurface: (kind: TrackerRightPanelSurfaceKind, options?: OpenBreakSurfaceOptions) => string;
  openMyTasks: () => string;
  activateSurface: (surfaceId: string) => void;
  closeSurface: (surfaceId: string) => void;
  closeOthers: (surfaceId: string) => void;
  closeToRight: (surfaceId: string) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  hasSurfaceKind: (kind: TrackerRightPanelSurfaceKind) => boolean;
  startBreak: (surfaceId: string) => void;
  pauseBreak: (surfaceId: string) => void;
  resetBreak: (surfaceId: string, durationSeconds?: number) => void;
  setBreakDuration: (surfaceId: string, durationSeconds: number) => void;
  tickBreaks: () => void;
};

const DEFAULT_STATE: PersistedState = {
  isOpen: false,
  surfaces: [],
  activeSurfaceId: null,
};

function isSurfaceKind(value: unknown): value is TrackerRightPanelSurfaceKind {
  return value === "my-tasks" || value === "break" || value === "agent";
}

function parseSurface(entry: unknown): TrackerRightPanelSurface | null {
  if (typeof entry !== "object" || entry === null) return null;
  const record = entry as Record<string, unknown>;
  if (typeof record.id !== "string" || !isSurfaceKind(record.kind)) return null;

  switch (record.kind) {
    case "my-tasks":
      return { id: record.id, kind: "my-tasks" };
    case "agent":
      return { id: record.id, kind: "agent" };
    case "break": {
      const durationSeconds =
        typeof record.durationSeconds === "number" && record.durationSeconds > 0
          ? record.durationSeconds
          : DEFAULT_BREAK_DURATION_SECONDS;
      const startedAt = typeof record.startedAt === "number" ? record.startedAt : null;
      const pausedAt = typeof record.pausedAt === "number" ? record.pausedAt : null;
      const remainingSeconds =
        typeof record.remainingSeconds === "number" ? record.remainingSeconds : durationSeconds;
      return {
        id: record.id,
        kind: "break",
        durationSeconds,
        startedAt,
        pausedAt,
        remainingSeconds,
      };
    }
    default: {
      const _exhaustive: never = record.kind;
      return _exhaustive;
    }
  }
}

function normalizeSurfaces(surfaces: TrackerRightPanelSurface[]): TrackerRightPanelSurface[] {
  return surfaces.map((surface) => {
    if (surface.kind !== "break") return surface;
    return { ...surface, ...syncBreakRemaining(surface) };
  });
}

function readPersistedV1(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_V1);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const surfaces = Array.isArray(parsed.surfaces)
      ? parsed.surfaces
          .map((entry) => parseSurface(entry))
          .filter((entry): entry is TrackerRightPanelSurface => entry != null)
      : [];
    const activeSurfaceId =
      typeof parsed.activeSurfaceId === "string" &&
      surfaces.some((surface) => surface.id === parsed.activeSurfaceId)
        ? parsed.activeSurfaceId
        : (surfaces[0]?.id ?? null);
    return {
      isOpen: Boolean(parsed.isOpen),
      surfaces: normalizeSurfaces(surfaces),
      activeSurfaceId,
    };
  } catch {
    return null;
  }
}

function readPersisted(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_V2);
    if (!raw) {
      const migrated = readPersistedV1();
      if (migrated) {
        writePersisted(migrated);
        try {
          window.localStorage.removeItem(STORAGE_KEY_V1);
        } catch {
          // ignore
        }
        return migrated;
      }
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const surfaces = Array.isArray(parsed.surfaces)
      ? parsed.surfaces
          .map((entry) => parseSurface(entry))
          .filter((entry): entry is TrackerRightPanelSurface => entry != null)
      : [];
    const activeSurfaceId =
      typeof parsed.activeSurfaceId === "string" &&
      surfaces.some((surface) => surface.id === parsed.activeSurfaceId)
        ? parsed.activeSurfaceId
        : (surfaces[0]?.id ?? null);
    return {
      isOpen: Boolean(parsed.isOpen),
      surfaces: normalizeSurfaces(surfaces),
      activeSurfaceId,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writePersisted(state: PersistedState) {
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
  } catch {
    // local preference only
  }
}

function nextSurfaceId(kind: TrackerRightPanelSurfaceKind): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${kind}-${crypto.randomUUID()}`;
  }
  return `${kind}-${Date.now()}`;
}

function updateBreakSurface(
  surfaces: TrackerRightPanelSurface[],
  surfaceId: string,
  updater: (surface: TrackerRightPanelBreakSurface) => TrackerRightPanelBreakSurface,
): TrackerRightPanelSurface[] {
  return surfaces.map((surface) => {
    if (surface.id !== surfaceId || surface.kind !== "break") return surface;
    return updater(surface);
  });
}

export const useAgencyTrackerRightPanelStore = create<AgencyTrackerRightPanelStore>((set, get) => ({
  ...DEFAULT_STATE,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ ...readPersisted(), hydrated: true });
  },
  persist: () => {
    const { isOpen, surfaces, activeSurfaceId } = get();
    writePersisted({ isOpen, surfaces, activeSurfaceId });
  },
  hasSurfaceKind: (kind) => get().surfaces.some((surface) => surface.kind === kind),
  canOpenSurface: (kind) => {
    if (kind === "break") return true;
    return !get().hasSurfaceKind(kind);
  },
  openMyTasks: () => {
    const existing = get().surfaces.find((surface) => surface.kind === "my-tasks");
    if (existing) {
      set({ isOpen: true, activeSurfaceId: existing.id });
      get().persist();
      return existing.id;
    }
    const surface: TrackerRightPanelMyTasksSurface = {
      id: nextSurfaceId("my-tasks"),
      kind: "my-tasks",
    };
    set({
      isOpen: true,
      surfaces: [...get().surfaces, surface],
      activeSurfaceId: surface.id,
    });
    get().persist();
    return surface.id;
  },
  openSurface: (kind, options) => {
    if (kind === "my-tasks") return get().openMyTasks();
    if (kind === "agent") {
      const existing = get().surfaces.find((surface) => surface.kind === "agent");
      if (existing) {
        set({ isOpen: true, activeSurfaceId: existing.id });
        get().persist();
        return existing.id;
      }
      const surface: TrackerRightPanelAgentSurface = { id: nextSurfaceId("agent"), kind: "agent" };
      set({
        isOpen: true,
        surfaces: [...get().surfaces, surface],
        activeSurfaceId: surface.id,
      });
      get().persist();
      return surface.id;
    }
    const durationSeconds = options?.durationSeconds ?? DEFAULT_BREAK_DURATION_SECONDS;
    const fields = createBreakTimerFields(durationSeconds);
    const surface: TrackerRightPanelBreakSurface = {
      id: nextSurfaceId("break"),
      kind: "break",
      ...fields,
    };
    set({
      isOpen: true,
      surfaces: [...get().surfaces, surface],
      activeSurfaceId: surface.id,
    });
    get().persist();
    return surface.id;
  },
  activateSurface: (surfaceId) => {
    if (!get().surfaces.some((surface) => surface.id === surfaceId)) return;
    set({ isOpen: true, activeSurfaceId: surfaceId });
    get().persist();
  },
  closeSurface: (surfaceId) => {
    const surfaces = get().surfaces.filter((surface) => surface.id !== surfaceId);
    const activeSurfaceId =
      get().activeSurfaceId === surfaceId ? (surfaces.at(-1)?.id ?? null) : get().activeSurfaceId;
    set({
      surfaces,
      activeSurfaceId,
      isOpen: true,
    });
    get().persist();
  },
  closeOthers: (surfaceId) => {
    const kept = get().surfaces.find((surface) => surface.id === surfaceId);
    if (!kept) return;
    set({
      surfaces: [kept],
      activeSurfaceId: kept.id,
      isOpen: true,
    });
    get().persist();
  },
  closeToRight: (surfaceId) => {
    const index = get().surfaces.findIndex((surface) => surface.id === surfaceId);
    if (index < 0) return;
    const surfaces = get().surfaces.slice(0, index + 1);
    const activeSurfaceId = surfaces.some((surface) => surface.id === get().activeSurfaceId)
      ? get().activeSurfaceId
      : (surfaces.at(-1)?.id ?? null);
    set({ surfaces, activeSurfaceId, isOpen: true });
    get().persist();
  },
  togglePanel: () => {
    if (get().isOpen) {
      get().closePanel();
      return;
    }
    get().openPanel();
  },
  openPanel: () => {
    set({
      isOpen: true,
      activeSurfaceId: get().activeSurfaceId ?? get().surfaces[0]?.id ?? null,
    });
    get().persist();
  },
  closePanel: () => {
    set({ isOpen: false });
    get().persist();
  },
  startBreak: (surfaceId) => {
    set({
      surfaces: updateBreakSurface(get().surfaces, surfaceId, (surface) => ({
        ...surface,
        ...startBreakTimer(surface),
      })),
    });
    get().persist();
  },
  pauseBreak: (surfaceId) => {
    set({
      surfaces: updateBreakSurface(get().surfaces, surfaceId, (surface) => ({
        ...surface,
        ...pauseBreakTimer(surface),
      })),
    });
    get().persist();
  },
  resetBreak: (surfaceId, durationSeconds) => {
    set({
      surfaces: updateBreakSurface(get().surfaces, surfaceId, (surface) => ({
        ...surface,
        ...resetBreakTimer(surface, durationSeconds),
      })),
    });
    get().persist();
  },
  setBreakDuration: (surfaceId, durationSeconds) => {
    set({
      surfaces: updateBreakSurface(get().surfaces, surfaceId, (surface) => ({
        ...surface,
        ...setBreakDuration(surface, durationSeconds),
      })),
    });
    get().persist();
  },
  tickBreaks: () => {
    const surfaces = get().surfaces.map((surface) => {
      if (surface.kind !== "break") return surface;
      return { ...surface, ...syncBreakRemaining(surface) };
    });
    const changed = surfaces.some((surface, index) => surface !== get().surfaces[index]);
    if (!changed) return;
    set({ surfaces });
    get().persist();
  },
}));
