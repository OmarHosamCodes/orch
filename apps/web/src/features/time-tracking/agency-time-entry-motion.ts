import type { Variants } from "motion/react";

import {
  agencyBaseTransition,
  agencyFastTransition,
  agencyStaggerIndex,
} from "@/features/shared/agency-motion";

const CHILD_STAGGER_STEP = 0.04;

/** xN children and bulk-flattened singles — opacity/y only, never height. */
export const timeEntryChildVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...agencyBaseTransition,
      delay: agencyStaggerIndex(index) * CHILD_STAGGER_STEP,
    },
  }),
  exit: {
    opacity: 0,
    y: -4,
    transition: agencyFastTransition,
  },
};

export const timeEntryBulkCheckboxVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: agencyFastTransition },
  exit: { opacity: 0, scale: 0.96, transition: agencyFastTransition },
};

export const timeEntryOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: agencyFastTransition },
  exit: { opacity: 0, transition: agencyFastTransition },
};

export const timeEntryHoverRevealVariants: Variants = {
  rest: { opacity: 0, transition: agencyFastTransition },
  hover: { opacity: 1, transition: agencyFastTransition },
};

export const timeEntryWasteTransition = agencyBaseTransition;
