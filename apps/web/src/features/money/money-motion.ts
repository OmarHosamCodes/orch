import type { Transition } from "motion/react";

const MONEY_EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

const MONEY_MS = {
  base: 0.18,
} as const;

export const moneyBaseTransition: Transition = {
  type: "tween",
  duration: MONEY_MS.base,
  ease: MONEY_EASE,
};
