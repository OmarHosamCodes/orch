import type { ReactNode } from "react";
import { motion } from "motion/react";

import type { StreakSegmentState } from "@/features/member-profile/member-profile-attendance-streak";
import { memberProfileGaugeMorphTransition } from "@/features/member-profile/member-profile-gauge-morph";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

export type InstrumentPlateTone = "warning" | "danger" | "info" | "success" | "neutral";

export type StatPlateKey = "leaves" | "period" | "present" | "waste";

/** Neutral shadcn surface for plates/strips — color lives on glyphs only. */
export function instrumentPlateSurfaceClass() {
  return "border-border bg-card hover:bg-muted/40";
}

/** Semantic ink for glyphs/graphs only (not plate backgrounds or metric text). */
export function instrumentPlateInkClass(tone: InstrumentPlateTone) {
  switch (tone) {
    case "danger":
      return "text-destructive";
    case "warning":
      return "text-warning";
    case "success":
      return "text-success";
    case "info":
      return "text-muted-foreground";
    case "neutral":
      return "text-foreground";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export function statPlateShortLabel(key: StatPlateKey): string {
  switch (key) {
    case "leaves":
      return "Off days";
    case "period":
      return "Hours";
    case "present":
      return "Day streak";
    case "waste":
      return "Waste";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function gaugeToneToPlateTone(
  tone: "success" | "warning" | "foreground",
): InstrumentPlateTone {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "foreground":
      return "neutral";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function PaceBarGlyph({ ratio, className }: { ratio: number; className?: string }) {
  const r = Math.min(1, Math.max(0, ratio));
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <rect x="4" y="11" width="56" height="6" rx="1.5" className="fill-current opacity-20" />
      {r > 0 ? (
        <rect x="4" y="11" width={56 * r} height="6" rx="1.5" className="fill-current" />
      ) : null}
      <line
        x1={4 + 56 * 0.85}
        y1="7"
        x2={4 + 56 * 0.85}
        y2="21"
        className="stroke-current opacity-55"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

function DonutGlyph({ ratio, className }: { ratio: number; className?: string }) {
  const r = Math.min(1, Math.max(0, ratio));
  const radius = 11;
  const c = 2 * Math.PI * radius;
  const dash = c * r;
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <g transform="translate(32 14)">
        <circle r={radius} fill="none" className="stroke-current opacity-25" strokeWidth="3.5" />
        {r > 0 ? (
          <circle
            r={radius}
            fill="none"
            className="stroke-current"
            strokeWidth="3.5"
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="round"
            transform="rotate(-90)"
          />
        ) : null}
      </g>
    </svg>
  );
}

function PeriodHoursGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={8 + i * 10}
          y={22 - (i % 3 === 0 ? 14 : i % 3 === 1 ? 10 : 6)}
          width="6"
          height={i % 3 === 0 ? 14 : i % 3 === 1 ? 10 : 6}
          rx="1"
          className="fill-current opacity-80"
        />
      ))}
    </svg>
  );
}

const WEEK_BAR_COUNT = 7;
const WEEK_BAR_WIDTH = 6;
const WEEK_BAR_GAP = 2;
const WEEK_BAR_MAX_HEIGHT = 14;
const WEEK_BAR_BASE_Y = 22;

/** Dynamic week bars for gauge dossier (ratios 0–1, up to 7). */
export function WeekBarsGlyph({ ratios, className }: { ratios: number[]; className?: string }) {
  const bars = ratios.slice(0, WEEK_BAR_COUNT);
  while (bars.length < WEEK_BAR_COUNT) {
    bars.unshift(0);
  }
  const totalWidth = WEEK_BAR_COUNT * WEEK_BAR_WIDTH + (WEEK_BAR_COUNT - 1) * WEEK_BAR_GAP;
  const startX = (64 - totalWidth) / 2;

  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      {bars.map((ratio, index) => {
        const height = Math.max(2, Math.round(ratio * WEEK_BAR_MAX_HEIGHT));
        const x = startX + index * (WEEK_BAR_WIDTH + WEEK_BAR_GAP);
        return (
          <rect
            key={index}
            x={x}
            y={WEEK_BAR_BASE_Y - height}
            width={WEEK_BAR_WIDTH}
            height={height}
            rx="1"
            className={cn("fill-current", ratio > 0 ? "opacity-90" : "opacity-15")}
          />
        );
      })}
    </svg>
  );
}

const STREAK_SEGMENT_COUNT = 7;
const STREAK_SEGMENT_WIDTH = 6;
const STREAK_SEGMENT_HEIGHT = 10;
const STREAK_SEGMENT_GAP = 2;
const STREAK_CHAIN_X = 4;

function streakSegmentX(index: number): number {
  return STREAK_CHAIN_X + index * (STREAK_SEGMENT_WIDTH + STREAK_SEGMENT_GAP);
}

export function StreakChainGlyph({
  segments,
  className,
}: {
  segments: StreakSegmentState[];
  className?: string;
}) {
  const chain = segments.slice(-STREAK_SEGMENT_COUNT);
  while (chain.length < STREAK_SEGMENT_COUNT) {
    chain.unshift("missed");
  }

  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      {chain.map((state, index) => {
        const x = streakSegmentX(index);
        const y = 9;
        const bridgeX = x - STREAK_SEGMENT_GAP;
        return (
          <g key={`${index}-${state}`}>
            {index > 0 ? (
              <rect
                x={bridgeX}
                y={y + STREAK_SEGMENT_HEIGHT / 2 - 0.5}
                width={STREAK_SEGMENT_GAP}
                height="1"
                className="fill-current opacity-30"
              />
            ) : null}
            <rect
              x={x}
              y={y}
              width={STREAK_SEGMENT_WIDTH}
              height={STREAK_SEGMENT_HEIGHT}
              rx="1.5"
              className={cn(
                "fill-current",
                state === "present" && "opacity-100",
                state === "missed" && "opacity-20",
                state === "off" && "opacity-10",
                state === "future" && "opacity-5",
              )}
            />
            {state === "missed" ? (
              <rect
                x={x}
                y={y}
                width={STREAK_SEGMENT_WIDTH}
                height={STREAK_SEGMENT_HEIGHT}
                rx="1.5"
                fill="none"
                className="stroke-current opacity-40"
                strokeWidth="0.75"
              />
            ) : null}
            {state === "off" ? (
              <line
                x1={x + 1}
                y1={y + STREAK_SEGMENT_HEIGHT / 2}
                x2={x + STREAK_SEGMENT_WIDTH - 1}
                y2={y + STREAK_SEGMENT_HEIGHT / 2}
                className="stroke-current opacity-50"
                strokeWidth="1"
                strokeDasharray="1.5 1.5"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function StatPlateGlyph({
  plateKey,
  ratio,
  segments,
  className,
}: {
  plateKey: StatPlateKey;
  ratio: number;
  segments?: StreakSegmentState[];
  className?: string;
}) {
  switch (plateKey) {
    case "leaves":
      return <PaceBarGlyph ratio={ratio} className={className} />;
    case "present":
      return <StreakChainGlyph segments={segments ?? []} className={className} />;
    case "period":
      return <PeriodHoursGlyph className={className} />;
    case "waste":
      return <DonutGlyph ratio={ratio} className={className} />;
    default: {
      const _exhaustive: never = plateKey;
      return _exhaustive;
    }
  }
}

type InstrumentPlateProps = {
  tone: InstrumentPlateTone;
  metric: string;
  shortLabel: string;
  ariaLabel: string;
  glyph: ReactNode;
  onClick?: () => void;
  /** Shared-layout morph id; omitted when reduced motion or plate is the morph source while open. */
  layoutId?: string;
  className?: string;
};

export function InstrumentPlate({
  tone,
  metric,
  shortLabel,
  ariaLabel,
  glyph,
  onClick,
  layoutId,
  className,
}: InstrumentPlateProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const ink = instrumentPlateInkClass(tone);
  const body = (
    <>
      <div className={cn("h-7 w-full", ink)}>{glyph}</div>
      <span
        className={cn(
          "max-w-full font-mono font-semibold tracking-tight tabular-nums leading-none text-foreground",
          metric.length > 8 ? "text-lg" : metric.length > 6 ? "text-xl" : "text-2xl",
        )}
      >
        {metric}
      </span>
      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {shortLabel}
      </span>
    </>
  );
  const plateClassName = cn(
    "flex min-h-[7.5rem] flex-col items-center justify-between gap-2 rounded-surface border px-3 py-3 text-center transition-[colors,transform] duration-150 ease-out",
    "motion-reduce:transition-none motion-reduce:active:scale-100",
    onClick && "active:scale-[0.985]",
    onClick && agencyFocusRingClass,
    instrumentPlateSurfaceClass(),
    className,
  );

  const sharedLayoutId = prefersReducedMotion ? undefined : layoutId;

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        className={plateClassName}
        aria-label={ariaLabel}
        layoutId={sharedLayoutId}
        transition={memberProfileGaugeMorphTransition}
      >
        {body}
      </motion.button>
    );
  }

  return (
    <div className={plateClassName} role="img" aria-label={ariaLabel}>
      {body}
    </div>
  );
}
