import { MetalFx, useMetalBend } from "metal-fx";
import { motion } from "motion/react";
import { forwardRef, useRef, type ButtonHTMLAttributes, type MouseEvent } from "react";

import { EclipseGlyph } from "@/features/workspace-agent/eclipse-pet-view";
import { eclipseMoodLabel, type EclipseMood } from "@/features/workspace-agent/eclipse-mood";
import {
  ORCH_PRESENCE_LAYOUT_ID,
  orchPresenceMorphTransition,
} from "@/features/shared/orch-presence-morph";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type OrchTopbarTriggerViewProps = {
  mood: EclipseMood;
  compactOpen: boolean;
  expanded: boolean;
  badgeCount: number;
  hidden: boolean;
  onToggle?: () => void;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | "children"
  | "type"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
>;

export const ORCH_METAL_BY_MOOD = {
  idle: { preset: "chromatic", strength: 0.65, disableGlow: false },
  working: { preset: "chromatic", strength: 1, disableGlow: false },
  done: { preset: "gold", strength: 1, disableGlow: false },
  "needs-you": { preset: "chromatic", strength: 1, disableGlow: false },
  error: { preset: "silver", strength: 0.6, disableGlow: true },
} as const;

export const OrchTopbarTriggerView = forwardRef<HTMLButtonElement, OrchTopbarTriggerViewProps>(
  function OrchTopbarTriggerView(
    { mood, compactOpen, expanded, badgeCount, hidden, onToggle, className, onClick, ...rest },
    ref,
  ) {
    const metalRef = useRef<HTMLDivElement>(null);
    useMetalBend(metalRef);
    const reducedMotion = usePrefersReducedMotion();
    if (hidden) return null;
    const label = eclipseMoodLabel(mood);
    const metal = ORCH_METAL_BY_MOOD[mood];
    return (
      <MetalFx
        ref={metalRef}
        variant="circle"
        preset={metal.preset}
        theme="dark"
        strength={metal.strength}
        disableGlow={metal.disableGlow}
        innerShadow
        normalizeHostStyles={false}
        paused={reducedMotion}
        className="inline-flex shrink-0 rounded-full"
      >
        <motion.button
          ref={ref}
          type="button"
          layoutId={ORCH_PRESENCE_LAYOUT_ID}
          transition={orchPresenceMorphTransition}
          aria-label={label}
          aria-expanded={compactOpen || expanded}
          aria-haspopup="dialog"
          aria-busy={mood === "working" || undefined}
          data-eclipse-mood={mood}
          title={label}
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            onClick?.(event);
            onToggle?.();
          }}
          className={cn(
            "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
            "border border-transparent bg-transparent text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            mood === "working" && "eclipse-pet--working",
            mood === "needs-you" && "eclipse-pet--needs-you",
            mood === "error" && "opacity-80",
            mood === "done" && "eclipse-pet--done",
            className,
          )}
          {...rest}
        >
          <EclipseGlyph mood={mood} />
          {badgeCount > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#5b5bd6] text-[9px] font-semibold text-white">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          ) : null}
          <span className="sr-only">{label}</span>
        </motion.button>
      </MetalFx>
    );
  },
);
