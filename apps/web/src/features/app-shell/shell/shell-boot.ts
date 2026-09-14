export const SHELL_LOGO_ANIMATION_MS = 4000;
export const SHELL_CONTENT_IN_MS = 120;

let bootStartedAt: number | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function startShellBoot(): void {
  if (bootStartedAt === null) {
    bootStartedAt = Date.now();
  }
}

export function resetShellBoot(): void {
  bootStartedAt = null;
}

export function hasShellBootStarted(): boolean {
  return bootStartedAt !== null;
}

export function isShellAnimationReadyAt(now: number, startedAt: number | null): boolean {
  if (startedAt === null) return false;
  return now - startedAt >= SHELL_LOGO_ANIMATION_MS;
}

export function isShellAnimationReady(): boolean {
  if (prefersReducedMotion()) return true;
  return isShellAnimationReadyAt(Date.now(), bootStartedAt);
}

/** Hold the first-paint logo cycle only when a full-page boot actually started. */
export function isShellAnimationHoldActive(): boolean {
  if (prefersReducedMotion()) return false;
  if (bootStartedAt === null) return false;
  return !isShellAnimationReadyAt(Date.now(), bootStartedAt);
}
