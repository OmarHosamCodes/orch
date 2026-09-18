import type { Transition } from "motion/react";

/** Matches `--motion-ease-out` in index.css (ease-out-quart). */
export const AGENCY_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

/** Matches `--motion-ease-emphasized` in index.css. */
export const AGENCY_EASE_EMPHASIZED: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Seconds — align with `--motion-duration-fast|base|panel`. */
export const AGENCY_MS = {
  fast: 0.12,
  base: 0.18,
  panel: 0.22,
} as const;

export const AGENCY_STAGGER_CAP = 8;

export const agencyTapScale = { scale: 0.98 } as const;

export const agencyFastTransition: Transition = {
  type: "tween",
  duration: AGENCY_MS.fast,
  ease: AGENCY_EASE,
};

export const agencyBaseTransition: Transition = {
  type: "tween",
  duration: AGENCY_MS.base,
  ease: AGENCY_EASE,
};

export function agencyStaggerIndex(index: number): number {
  return Math.min(index, AGENCY_STAGGER_CAP - 1);
}
