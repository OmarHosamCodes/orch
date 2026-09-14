import type { Transition } from "motion/react";

/** Shared-element morph between global Orch dock and task-thread composer badge. */
export const ORCH_PRESENCE_LAYOUT_ID = "orch-presence";

/** Collapsed dock pill — fully round for shared layout morph. */
export const ORCH_PRESENCE_COLLAPSED_RADIUS_PX = 9999;

/** Expanded dock card — matches Tailwind `rounded-2xl`. */
export const ORCH_PRESENCE_EXPANDED_RADIUS_PX = 16;

/**
 * Spring settle budget for sequenced close (ms).
 * Slightly longer than the visual settle so the cover does not cut the morph short.
 */
export const ORCH_PRESENCE_MORPH_MS = 560;

/** Emphasized decelerate — same family as `--motion-ease-emphasized`. */
const ORCH_PRESENCE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Shared-layout spring: soft mass, high damping (no bounce), confident travel.
 * Reads as Linear/Apple continuity rather than a linear tween slide.
 */
export const orchPresenceMorphTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 34,
  mass: 0.92,
};

/** Inner label/badge reveal after the shell has mostly traveled. */
export const orchPresenceContentFade: Transition = {
  type: "tween",
  duration: 0.24,
  delay: 0.1,
  ease: ORCH_PRESENCE_EASE,
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
