import type { Transition, Variants } from "motion/react";

import {
  AGENCY_EASE,
  AGENCY_MS,
  agencyBaseTransition,
  agencyStaggerIndex,
  agencyTapScale,
} from "@/features/shared/agency-motion";

/** Seconds — align with `--motion-duration-fast|base|panel`. */
export const CHOOSER_MS = AGENCY_MS;

const CHOOSER_STAGGER_STEP = 0.05;

export const chooserTapScale = agencyTapScale;

export const chooserBaseTransition: Transition = agencyBaseTransition;

const chooserCollapseTransition: Transition = agencyBaseTransition;

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
      delay: 0.02 + agencyStaggerIndex(index) * CHOOSER_STAGGER_STEP,
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
      ease: AGENCY_EASE,
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
    transition: { type: "tween", duration: CHOOSER_MS.fast * 0.75, ease: AGENCY_EASE },
  },
};

export const chooserStarPopTransition: Transition = agencyBaseTransition;

export const chooserSelectFlashTransition: Transition = {
  type: "tween",
  duration: CHOOSER_MS.fast,
  ease: AGENCY_EASE,
};
