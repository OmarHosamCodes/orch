import type { AgentScopeRef } from "@orch/agent/types";
import { create } from "zustand";

type OrchPresence = "dock" | "thread";

type WorkspaceAgentUiState = {
  expanded: boolean;
  /** Where the Orch presence chrome lives: global dock vs task-thread composer badge. */
  orchPresence: OrchPresence;
  scopeModeActive: boolean;
  scopeHintSeen: boolean;
  draft: string;
  scopeChips: AgentScopeRef[];
  pendingComposerSeed: { text: string; toolPreset: "ask" | "plan" | "agent" } | null;
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
  orchPresence: "dock",
  scopeModeActive: false,
  scopeHintSeen: readScopeHintSeen(),
  draft: "",
  scopeChips: [],
  pendingComposerSeed: null,
  setExpanded: (expanded) => {
    if (get().orchPresence === "thread") return;
    set({
      expanded,
      scopeModeActive: expanded ? get().scopeModeActive : false,
    });
  },
  toggleExpanded: () => get().setExpanded(!get().expanded),
  setOrchPresence: (presence) =>
    set({
      orchPresence: presence,
      expanded: false,
      scopeModeActive: presence === "thread" ? false : get().scopeModeActive,
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
    if (get().orchPresence === "thread") {
      set({ pendingComposerSeed: input });
      return;
    }
    set({ pendingComposerSeed: input, expanded: true });
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
