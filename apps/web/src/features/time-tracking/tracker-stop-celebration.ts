import { useCallback, useState } from "react";

import { resolveEntryWaste } from "@orch/api/routers/agency-ops/shared/waste-helpers";

import { fireOrchConfetti, type OrchConfettiBurst } from "@/features/workspace-agent/orch-confetti";

const STORAGE_KEY = "orch.agency.tracker-stop-celebration.v1";

export type TrackerStopConfettiOrigin = { x: number; y: number };

/** Default on; only an explicit opt-out disables it. Timer state stays server-side — this is a local display pref. */
export function isTrackerStopCelebrationEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return false;
  }
}

/** Normalized viewport origin from the Stop button, mirroring the ConfettiButton pattern. */
export function originFromStopButtonElement(
  element: unknown,
): TrackerStopConfettiOrigin | undefined {
  if (!element || typeof element !== "object" || !("getBoundingClientRect" in element)) {
    return undefined;
  }
  try {
    const rect = (element as Element).getBoundingClientRect();
    if (typeof window === "undefined" || window.innerWidth === 0 || window.innerHeight === 0) {
      return undefined;
    }
    return {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  } catch {
    return undefined;
  }
}

/** Same burst as Orch; reduced-motion is guarded inside fireOrchConfetti. */
export function fireTrackerStopCelebration(
  origin?: TrackerStopConfettiOrigin,
  burst?: OrchConfettiBurst,
) {
  fireOrchConfetti(origin, burst);
}

/** Sessions under a minute are misfires, not victories — no burst. */
export const TRACKER_STOP_CELEBRATION_MIN_SECONDS = 60;

/**
 * Burst scaled to the session the user built (IKEA): a 2-minute stop earns a
 * puff, an hour earns the full celebration. Returns null when there is nothing
 * worth celebrating. Spread/velocity/colors stay fixed — quiet instrument.
 */
export function celebrationBurstForDuration(durationSeconds: number): OrchConfettiBurst | null {
  const safeSeconds = Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0;
  if (safeSeconds < TRACKER_STOP_CELEBRATION_MIN_SECONDS) return null;
  if (safeSeconds < 300) return { particleCount: 20, ticks: 90 };
  if (safeSeconds < 3600) return { particleCount: 48, ticks: 120 };
  return { particleCount: 90, ticks: 150 };
}

export type StopCelebrationContext = {
  durationSeconds: number;
  taskIsWaste?: boolean | null;
  taskTitle?: string | null;
  projectName?: string | null;
};

/**
 * Single gate for stop celebration: waste is tracked, never celebrated, and
 * trivial sessions stay quiet. New entries are never entry-flagged at creation,
 * so the task flag plus waste-named task/project labels carry the check.
 */
export function resolveStopCelebrationBurst(
  context: StopCelebrationContext,
): OrchConfettiBurst | null {
  if (
    resolveEntryWaste({
      isWaste: false,
      taskIsWaste: context.taskIsWaste,
      taskTitle: context.taskTitle,
      projectName: context.projectName,
    })
  ) {
    return null;
  }
  return celebrationBurstForDuration(context.durationSeconds);
}

export function useTrackerStopCelebration() {
  const [enabled, setEnabled] = useState(isTrackerStopCelebrationEnabled);
  const setCelebrationEnabled = useCallback((next: boolean) => {
    setEnabled(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // local preference only
    }
  }, []);
  return { celebrationEnabled: enabled, setCelebrationEnabled };
}
