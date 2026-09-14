import type { Transition, Variants } from "motion/react";

/** Matches `--motion-ease-out` in index.css. Twin of Tracker chooser tokens. */
export const RAIL_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

/** Matches `--motion-ease-emphasized` in index.css. */
const RAIL_EASE_EMPHASIZED: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Seconds — align with `--motion-duration-*` in `apps/web/src/index.css`.
 * Keep flash/hold timeouts in hooks on the same ms values.
 */
export const RAIL_MS = {
  fast: 0.12,
  base: 0.18,
  panel: 0.22,
  rail: 0.32,
  pulse: 0.42,
  pop: 0.22,
  flash: 0.48,
  complete: 0.62,
} as const;

/** Milliseconds twin of `RAIL_MS` for `setTimeout` holds matching CSS animation lengths. */
export const RAIL_HOLD_MS = {
  pulse: 420,
  pop: 220,
  flash: 480,
  complete: 620,
} as const;

export const RAIL_STAGGER_CAP = 8;
const RAIL_STAGGER_STEP = 0.04;

export const railTapScale = { scale: 0.98 } as const;

export const railFastTransition: Transition = {
  type: "tween",
  duration: RAIL_MS.fast,
  ease: RAIL_EASE,
};

const railBaseTransition: Transition = {
  type: "tween",
  duration: RAIL_MS.base,
  ease: RAIL_EASE,
};

/** Shared layout morph when siblings reflow after appear/disappear. */
export const railLayoutTransition: Transition = {
  type: "tween",
  duration: RAIL_MS.panel,
  ease: RAIL_EASE_EMPHASIZED,
};

export const railListContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0, delayChildren: 0 } },
};

/** Enter/exit for filter, complete, create, delete — AnimatePresence drives these. */
export const railListItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.97,
  },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...railBaseTransition,
      delay: railStaggerIndex(index) * RAIL_STAGGER_STEP,
    },
  }),
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.97,
    transition: { type: "tween", duration: RAIL_MS.fast, ease: RAIL_EASE },
  },
};

/** In-place morph when open ↔ done while the row stays mounted. */
export const railRowStateTransition: Transition = {
  type: "tween",
  duration: RAIL_MS.base,
  ease: RAIL_EASE,
};

export const railEmptyVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: railBaseTransition },
  exit: {
    opacity: 0,
    transition: { type: "tween", duration: RAIL_MS.fast * 0.75, ease: RAIL_EASE },
  },
};

/** Collapse/expand uses CSS width on the aside only — no content enter/exit morph. */

export const railSectionExit = {
  opacity: 0,
  y: -4,
  transition: { type: "tween" as const, duration: RAIL_MS.fast, ease: RAIL_EASE },
};

export function railStaggerIndex(index: number): number {
  return Math.min(index, RAIL_STAGGER_CAP - 1);
}
