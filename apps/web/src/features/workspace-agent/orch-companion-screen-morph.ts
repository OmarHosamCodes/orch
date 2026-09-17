import type { Transition } from "motion/react";

/** Shared-element morph between glance Open Orch and the expanded workbench shell. */
export const ORCH_COMPANION_SCREEN_LAYOUT_ID = "orch-companion-screen";

/** Glance footer CTA — matches `rounded-[14.4px]` on Open Orch. */
export const ORCH_COMPANION_SCREEN_TRIGGER_RADIUS_PX = 14.4;

/** Expanded workbench — near-full-screen overlay radius (ExpandableScreen reference). */
export const ORCH_COMPANION_SCREEN_CONTENT_RADIUS_PX = 20;

/** Hairline breathing room on desktop — not a page card inset. */
export const ORCH_COMPANION_SCREEN_DESKTOP_INSET_PX = 4;

/** ExpandableScreen reference duration (~0.3s) with emphasized decelerate. */
const ORCH_COMPANION_SCREEN_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const orchCompanionScreenMorphTransition: Transition = {
  type: "tween",
  duration: 0.32,
  ease: ORCH_COMPANION_SCREEN_EASE,
};

/** Inner workbench content reveals after the shell has mostly traveled. */
export const orchCompanionScreenContentFade: Transition = {
  type: "tween",
  duration: 0.22,
  delay: 0.12,
  ease: ORCH_COMPANION_SCREEN_EASE,
};
