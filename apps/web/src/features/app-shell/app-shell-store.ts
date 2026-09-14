import { create } from "zustand";

import { type AppShellMode, resolveShellMode } from "@/features/app-shell/app-navigation";
import {
  isAgencyManagementPaneId,
  type AgencyManagementPaneId,
} from "@/features/shared/agency-management-sections";

const RAIL_PINNED_STORAGE_KEY = "orch.appShell.railPinned";
const LAST_MANAGEMENT_PANE_KEY = "orch.appShell.lastManagementPane";

function readRailPinned(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(RAIL_PINNED_STORAGE_KEY) === "1";
}

function readLastManagementPane(): AgencyManagementPaneId {
  if (typeof localStorage === "undefined") return "resourcing";
  const stored = localStorage.getItem(LAST_MANAGEMENT_PANE_KEY);
  return isAgencyManagementPaneId(stored) ? stored : "resourcing";
}

type AppShellState = {
  commandPaletteOpen: boolean;
  railPinned: boolean;
  /** Last visited Management pane — Management group label navigates here. */
  lastManagementPane: AgencyManagementPaneId;
  currentPath: string;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setRailPinned: (pinned: boolean) => void;
  toggleRailPinned: () => void;
  setLastManagementPane: (pane: AgencyManagementPaneId) => void;
  setCurrentPath: (path: string) => void;
};

export const useAppShellStore = create<AppShellState>((set, get) => ({
  commandPaletteOpen: false,
  railPinned: readRailPinned(),
  lastManagementPane: readLastManagementPane(),
  currentPath: "/",
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set({ commandPaletteOpen: !get().commandPaletteOpen }),
  setRailPinned: (pinned) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(RAIL_PINNED_STORAGE_KEY, pinned ? "1" : "0");
    }
    set({ railPinned: pinned });
  },
  toggleRailPinned: () => get().setRailPinned(!get().railPinned),
  setLastManagementPane: (pane) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LAST_MANAGEMENT_PANE_KEY, pane);
    }
    set({ lastManagementPane: pane });
  },
  setCurrentPath: (path) => set({ currentPath: path }),
}));

export function useShellMode(): AppShellMode {
  return resolveShellMode(useAppShellStore((s) => s.currentPath));
}
