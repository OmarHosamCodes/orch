import type { Transition } from "motion/react";

import type { StatPlateKey } from "@/features/member-profile/member-profile-instrument-plate";

/** Shared-element morph between an instrument plate and its detail dialog. */
export function memberProfileGaugeLayoutId(key: StatPlateKey): string {
  return `member-profile-gauge-${key}`;
}

export const memberProfileGaugeMorphTransition: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 34,
  mass: 0.9,
};

export const memberProfileGaugeContentFade: Transition = {
  type: "tween",
  duration: 0.22,
  delay: 0.08,
  ease: [0.16, 1, 0.3, 1],
};
