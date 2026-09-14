export type ThemePreference = "light" | "dark";

const STORAGE_KEY = "orch-theme";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getStoredTheme(): ThemePreference | null {
  if (typeof localStorage === "undefined") return null;
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function resolveInitialTheme(): ThemePreference {
  return getStoredTheme() ?? (systemPrefersDark() ? "dark" : "light");
}

export function applyTheme(theme: ThemePreference): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: ThemePreference): void {
  applyTheme(theme);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, theme);
  }
}
