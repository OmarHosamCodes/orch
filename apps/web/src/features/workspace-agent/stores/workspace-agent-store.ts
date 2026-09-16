import type { AgentScopeRef } from "@orch/agent/types";
import { create } from "zustand";

type OrchPresence = "dock" | "thread";

type WorkspaceAgentUiState = {
  expanded: boolean;
  compactOpen: boolean;
  /** Where the Orch presence chrome lives: top-bar Eclipse vs task-thread composer badge. */
  orchPresence: OrchPresence;
  scopeModeActive: boolean;
  scopeHintSeen: boolean;
  draft: string;
  scopeChips: AgentScopeRef[];
  boundTaskId: string | null;
  boundTaskTitle: string | null;
  pendingComposerSeed: { text: string; toolPreset: "ask" | "plan" | "agent" } | null;
  setBoundTask: (task: { id: string; title: string } | null) => void;
  setCompactOpen: (open: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  setOrchPresence: (presence: OrchPresence) => void;
  setScopeModeActive: (active: boolean) => void;
  toggleScopeMode: () => void;
  markScopeHintSeen: () => void;
  setDraft: (draft: string) => void;
  seedComposer: (input: { text: string; toolPreset: "ask" | "plan" | "agent" }) => void;
  clearComposerSeed: () => void;
  addScopeChip: (chip: AgentScopeRef) => void;
  removeScopeChip: (id: string) => void;
  clearScopeChips: () => void;
};

const SCOPE_HINT_KEY = "orch:agent-scope-hint-seen";

function readScopeHintSeen() {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(SCOPE_HINT_KEY) === "1";
}

export const useWorkspaceAgentStore = create<WorkspaceAgentUiState>((set, get) => ({
  expanded: false,
  compactOpen: false,
  orchPresence: "dock",
  scopeModeActive: false,
  scopeHintSeen: readScopeHintSeen(),
  draft: "",
  scopeChips: [],
  boundTaskId: null,
  boundTaskTitle: null,
  pendingComposerSeed: null,
  setBoundTask: (task) =>
    set({
      boundTaskId: task?.id ?? null,
      boundTaskTitle: task?.title ?? null,
    }),
  setCompactOpen: (compactOpen) =>
    set({ compactOpen, expanded: compactOpen ? false : get().expanded }),
  setExpanded: (expanded) => {
    set({
      expanded,
      compactOpen: expanded ? false : get().compactOpen,
      scopeModeActive: expanded ? get().scopeModeActive : false,
    });
  },
  toggleExpanded: () => get().setExpanded(!get().expanded),
  setOrchPresence: (presence) =>
    set({
      orchPresence: presence,
      scopeModeActive: presence === "thread" ? false : get().scopeModeActive,
      ...(presence === "thread" ? { expanded: false, compactOpen: false } : {}),
    }),
  setScopeModeActive: (active) => {
    if (get().orchPresence === "thread") return;
    set({ scopeModeActive: active });
  },
  toggleScopeMode: () => {
    if (get().orchPresence === "thread") return;
    const next = !get().scopeModeActive;
    set({
      scopeModeActive: next,
      expanded: next ? true : get().expanded,
    });
  },
  markScopeHintSeen: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SCOPE_HINT_KEY, "1");
    }
    set({ scopeHintSeen: true });
  },
  setDraft: (draft) => set({ draft }),
  seedComposer: (input) => {
    set({ pendingComposerSeed: input, expanded: true, compactOpen: false });
  },
  clearComposerSeed: () => set({ pendingComposerSeed: null }),
  addScopeChip: (chip) =>
    set((state) =>
      state.scopeChips.some((entry) => entry.kind === chip.kind && entry.id === chip.id)
        ? state
        : { scopeChips: [...state.scopeChips, chip] },
    ),
  removeScopeChip: (id) =>
    set((state) => ({
      scopeChips: state.scopeChips.filter((chip) => chip.id !== id),
    })),
  clearScopeChips: () => set({ scopeChips: [] }),
}));
