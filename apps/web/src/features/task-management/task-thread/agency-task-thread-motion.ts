import type { Transition, Variants } from "motion/react";

import {
  RAIL_EASE,
  RAIL_MS,
} from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion";

/** Cover enters from the rail seam (right edge of the main time column). */
const threadCoverTransition: Transition = {
  type: "tween",
  duration: RAIL_MS.rail,
  ease: RAIL_EASE,
};

export const threadCoverVariants: Variants = {
  hidden: { x: "100%" },
  show: { x: 0, transition: threadCoverTransition },
  exit: { x: "100%", transition: threadCoverTransition },
};
