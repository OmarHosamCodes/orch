import confetti from "canvas-confetti";
import type { Options as ConfettiOptions } from "canvas-confetti";

const ORCH_CONFETTI_COLORS = ["#5b5bd6", "#e8e4dc", "#1c1917"];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type OrchConfettiBurst = Pick<ConfettiOptions, "particleCount" | "ticks">;

export function fireOrchConfetti(origin?: { x: number; y: number }, burst?: OrchConfettiBurst) {
  if (prefersReducedMotion()) return;
  void confetti({
    particleCount: 48,
    spread: 55,
    startVelocity: 28,
    gravity: 0.9,
    ticks: 120,
    origin: origin ?? { x: 0.72, y: 0.22 },
    colors: ORCH_CONFETTI_COLORS,
    disableForReducedMotion: true,
    ...burst,
  });
}
