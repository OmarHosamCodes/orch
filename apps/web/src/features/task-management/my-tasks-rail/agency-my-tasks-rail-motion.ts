import type { Transition, Variants } from "motion/react";

import {
  AGENCY_EASE,
  AGENCY_EASE_EMPHASIZED,
  AGENCY_MS,
  AGENCY_STAGGER_CAP,
  agencyBaseTransition,
  agencyFastTransition,
  agencyStaggerIndex,
  agencyTapScale,
} from "@/features/shared/agency-motion";

export const RAIL_EASE = AGENCY_EASE;

/**
 * Seconds — align with `--motion-duration-*` in `apps/web/src/index.css`.
 * Keep flash/hold timeouts in hooks on the same ms values.
 */
export const RAIL_MS = {
  fast: AGENCY_MS.fast,
  base: AGENCY_MS.base,
  panel: AGENCY_MS.panel,
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

export const RAIL_STAGGER_CAP = AGENCY_STAGGER_CAP;
const RAIL_STAGGER_STEP = 0.04;

export const railTapScale = agencyTapScale;

export const railFastTransition: Transition = agencyFastTransition;

const railBaseTransition: Transition = agencyBaseTransition;

/** Shared layout morph when siblings reflow after appear/disappear. */
export const railLayoutTransition: Transition = {
  type: "tween",
  duration: RAIL_MS.panel,
  ease: AGENCY_EASE_EMPHASIZED,
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
      delay: agencyStaggerIndex(index) * RAIL_STAGGER_STEP,
    },
  }),
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.97,
    transition: agencyFastTransition,
  },
};

/** In-place morph when open ↔ done while the row stays mounted. */
export const railRowStateTransition: Transition = agencyBaseTransition;

export const railEmptyVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: railBaseTransition },
  exit: {
    opacity: 0,
    transition: { type: "tween", duration: RAIL_MS.fast * 0.75, ease: AGENCY_EASE },
  },
};

/** Collapse/expand uses CSS width on the aside only — no content enter/exit morph. */

export const railSectionExit = {
  opacity: 0,
  y: -4,
  transition: agencyFastTransition,
};

export const railStaggerIndex = agencyStaggerIndex;
