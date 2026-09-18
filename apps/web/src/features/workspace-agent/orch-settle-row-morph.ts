import type { Transition } from "motion/react";

const ORCH_SETTLE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Row insert / sibling reflow when a thread leaves the open list. */
export const orchSettleRowLayoutTransition: Transition = {
  layout: { type: "spring", stiffness: 420, damping: 36, mass: 0.82 },
  opacity: { duration: 0.18, ease: ORCH_SETTLE_EASE },
  y: { duration: 0.18, ease: ORCH_SETTLE_EASE },
};

/** Acknowledged settle — row dissolves out before the list reflows. */
export const orchSettleRowExitTransition: Transition = {
  opacity: { duration: 0.2, ease: ORCH_SETTLE_EASE },
  scale: { duration: 0.22, ease: ORCH_SETTLE_EASE },
  height: { duration: 0.24, ease: ORCH_SETTLE_EASE },
  marginBottom: { duration: 0.24, ease: ORCH_SETTLE_EASE },
  filter: { duration: 0.18, ease: ORCH_SETTLE_EASE },
};

/** Hover / click feedback on the floating Settle pill. */
export const orchSettlePillTransition: Transition = {
  type: "tween",
  duration: 0.16,
  ease: ORCH_SETTLE_EASE,
};
