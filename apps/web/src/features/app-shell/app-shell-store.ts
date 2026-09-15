import { create } from "zustand";

import { type AppShellMode, resolveShellMode } from "@/features/app-shell/app-navigation";
import {
  isAgencyManagementPaneId,
  type AgencyManagementPaneId,
} from "@/features/shared/agency-management-sections";

const LAST_MANAGEMENT_PANE_KEY = "orch.appShell.lastManagementPane";

function readLastManagementPane(): AgencyManagementPaneId {
  if (typeof localStorage === "undefined") return "resourcing";
  const stored = localStorage.getItem(LAST_MANAGEMENT_PANE_KEY);
  return isAgencyManagementPaneId(stored) ? stored : "resourcing";
}

type AppShellState = {
  commandPaletteOpen: boolean;
  /** Last visited Management pane — Management group label navigates here. */
  lastManagementPane: AgencyManagementPaneId;
  currentPath: string;
  mobileNavOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setLastManagementPane: (pane: AgencyManagementPaneId) => void;
  setCurrentPath: (path: string) => void;
  setMobileNavOpen: (open: boolean) => void;
};

export const useAppShellStore = create<AppShellState>((set, get) => ({
  commandPaletteOpen: false,
  lastManagementPane: readLastManagementPane(),
  currentPath: "/",
  mobileNavOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set({ commandPaletteOpen: !get().commandPaletteOpen }),
  setLastManagementPane: (pane) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LAST_MANAGEMENT_PANE_KEY, pane);
    }
    set({ lastManagementPane: pane });
  },
  setCurrentPath: (path) => set({ currentPath: path }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));

export function useShellMode(): AppShellMode {
  return resolveShellMode(useAppShellStore((s) => s.currentPath));
}
