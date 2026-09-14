import { create } from "zustand";

import { setFaviconTheme } from "@/lib/favicon";
import { applyTheme, resolveInitialTheme, setTheme, type ThemePreference } from "@/lib/theme";

type ThemeState = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  toggle: () => void;
};

function applyThemeDom(theme: ThemePreference): void {
  applyTheme(theme);
  setFaviconTheme(theme);
}

const useThemeStore = create<ThemeState>((set, get) => ({
  theme: resolveInitialTheme(),
  setTheme: (theme) => {
    setTheme(theme);
    set({ theme });
  },
  toggle: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
}));

/** Apply theme to document when store changes. Call once from app root. */
export function subscribeThemeDomSync() {
  applyThemeDom(useThemeStore.getState().theme);
  return useThemeStore.subscribe((state) => {
    applyThemeDom(state.theme);
  });
}

export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const setThemePreference = useThemeStore((s) => s.setTheme);
  const toggle = useThemeStore((s) => s.toggle);

  return {
    theme,
    setTheme: setThemePreference,
    toggle,
    isDark: theme === "dark",
  };
}
