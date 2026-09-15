import { create } from "zustand";

const STORAGE_KEY = "orch.agency.tracker-right-panel.v1";

export type TrackerRightPanelSurfaceKind = "my-tasks";

export type TrackerRightPanelSurface = {
  id: string;
  kind: TrackerRightPanelSurfaceKind;
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
  openMyTasks: () => string;
  activateSurface: (surfaceId: string) => void;
  closeSurface: (surfaceId: string) => void;
  closeOthers: (surfaceId: string) => void;
  closeToRight: (surfaceId: string) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  hasSurfaceKind: (kind: TrackerRightPanelSurfaceKind) => boolean;
};

const DEFAULT_STATE: PersistedState = {
  isOpen: false,
  surfaces: [],
  activeSurfaceId: null,
};

function readPersisted(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState & { maximized?: boolean }>;
    const surfaces = Array.isArray(parsed.surfaces)
      ? parsed.surfaces.filter(
          (entry): entry is TrackerRightPanelSurface =>
            typeof entry === "object" &&
            entry !== null &&
            typeof entry.id === "string" &&
            entry.kind === "my-tasks",
        )
      : [];
    const activeSurfaceId =
      typeof parsed.activeSurfaceId === "string" &&
      surfaces.some((surface) => surface.id === parsed.activeSurfaceId)
        ? parsed.activeSurfaceId
        : (surfaces[0]?.id ?? null);
    return {
      isOpen: Boolean(parsed.isOpen) && surfaces.length > 0,
      surfaces,
      activeSurfaceId,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writePersisted(state: PersistedState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  openMyTasks: () => {
    const existing = get().surfaces.find((surface) => surface.kind === "my-tasks");
    if (existing) {
      set({ isOpen: true, activeSurfaceId: existing.id });
      get().persist();
      return existing.id;
    }
    const surface: TrackerRightPanelSurface = { id: nextSurfaceId("my-tasks"), kind: "my-tasks" };
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
    const isOpen = surfaces.length > 0;
    set({
      surfaces,
      activeSurfaceId,
      isOpen,
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
    set({ surfaces, activeSurfaceId, isOpen: surfaces.length > 0 });
    get().persist();
  },
  togglePanel: () => {
    if (get().isOpen) {
      get().closePanel();
      return;
    }
    get().openMyTasks();
  },
  openPanel: () => {
    if (get().surfaces.length === 0) {
      get().openMyTasks();
      return;
    }
    set({ isOpen: true, activeSurfaceId: get().activeSurfaceId ?? get().surfaces[0]?.id ?? null });
    get().persist();
  },
  closePanel: () => {
    set({ isOpen: false });
    get().persist();
  },
}));
