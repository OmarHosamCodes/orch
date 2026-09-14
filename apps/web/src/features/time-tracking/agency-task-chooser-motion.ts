import type { Transition, Variants } from "motion/react";

/** Matches `--motion-ease-out` in index.css (ease-out-quart). */
const CHOOSER_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

/** Seconds — align with `--motion-duration-fast|base|panel`. */
export const CHOOSER_MS = {
  fast: 0.12,
  base: 0.18,
  panel: 0.22,
} as const;

const CHOOSER_STAGGER_CAP = 8;
const CHOOSER_STAGGER_STEP = 0.05;

export const chooserTapScale = { scale: 0.98 } as const;

export const chooserBaseTransition: Transition = {
  type: "tween",
  duration: CHOOSER_MS.base,
  ease: CHOOSER_EASE,
};

const chooserCollapseTransition: Transition = {
  type: "tween",
  duration: CHOOSER_MS.base,
  ease: CHOOSER_EASE,
};

export const chooserListContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0,
      delayChildren: 0,
    },
  },
};

export const chooserListItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...chooserBaseTransition,
      delay: 0.02 + chooserStaggerIndex(index) * CHOOSER_STAGGER_STEP,
    },
  }),
};

export const chooserCollapseVariants: Variants = {
  collapsed: {
    opacity: 0,
    height: 0,
    transition: {
      type: "tween",
      duration: CHOOSER_MS.fast,
      ease: CHOOSER_EASE,
    },
  },
  expanded: {
    opacity: 1,
    height: "auto",
    transition: chooserCollapseTransition,
  },
};

export const chooserEmptyVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: {
    opacity: 1,
    y: 0,
    transition: chooserBaseTransition,
  },
  exit: {
    opacity: 0,
    transition: { type: "tween", duration: CHOOSER_MS.fast * 0.75, ease: CHOOSER_EASE },
  },
};

export const chooserStarPopTransition: Transition = {
  type: "tween",
  duration: CHOOSER_MS.base,
  ease: CHOOSER_EASE,
};

export const chooserSelectFlashTransition: Transition = {
  type: "tween",
  duration: CHOOSER_MS.fast,
  ease: CHOOSER_EASE,
};

function chooserStaggerIndex(index: number): number {
  return Math.min(index, CHOOSER_STAGGER_CAP - 1);
}
