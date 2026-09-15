import { cn } from "@/lib/utils";

import {
  clampHoursPlateRatio,
  type DashboardHoursPlateGlyphSignal,
} from "./dashboard-hours-plate-signal";

const glyphMotionClass =
  "transition-[width,transform,stroke-dashoffset,opacity] duration-300 ease-out motion-reduce:transition-none";

const TRACK_X = 2;
const TRACK_W = 60;
const TRACK_Y = 13;
const TRACK_H = 8;
const BASELINE = 26;
const STACK_MAX = 20;
const STACK_CENTER_X = 26;
const STACK_OUTER_W = 12;
const STACK_INNER_X = 28;
const STACK_INNER_W = 8;

function trackWidth(ratio: number): number {
  return TRACK_W * clampHoursPlateRatio(ratio);
}

function stackScale(ratio: number, floor = 0.1): number {
  return Math.max(floor, clampHoursPlateRatio(ratio));
}

/** Paid share of tracked time with an external boundary marker. */
function PaidClientFlowGlyph({
  paidShare,
  externalShare,
  className,
}: {
  paidShare: number;
  externalShare: number;
  className?: string;
}) {
  const paidFill = clampHoursPlateRatio(paidShare);
  const externalMark = clampHoursPlateRatio(externalShare);
  const paidWidth = trackWidth(paidFill);
  const externalWidth = trackWidth(externalMark);

  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden>
      <rect
        x={TRACK_X}
        y={TRACK_Y}
        width={TRACK_W}
        height={TRACK_H}
        rx="2"
        className="fill-current opacity-20"
      />
      {externalMark > 0 ? (
        <rect
          x={TRACK_X}
          y={TRACK_Y}
          width={externalWidth}
          height={TRACK_H}
          rx="2"
          className={cn("fill-current opacity-10", glyphMotionClass)}
        />
      ) : null}
      {paidFill > 0 ? (
        <rect
          x={TRACK_X}
          y={TRACK_Y}
          height={TRACK_H}
          rx="2"
          className={cn("fill-current", glyphMotionClass)}
          style={{ width: paidWidth }}
        />
      ) : null}
      {externalMark > 0 ? (
        <line
          x1={TRACK_X + externalWidth}
          y1="6"
          x2={TRACK_X + externalWidth}
          y2="28"
          className="stroke-current opacity-55"
          strokeWidth="1.5"
          strokeDasharray="2.5 2.5"
        />
      ) : null}
    </svg>
  );
}

/** External lane with waste peeling off the billable remainder. */
function WasteBranchGlyph({
  wasteShare,
  externalShare,
  wasteExternalRatio,
  className,
}: {
  wasteShare: number;
  externalShare: number;
  wasteExternalRatio: number;
  className?: string;
}) {
  const wasteFill = clampHoursPlateRatio(wasteShare);
  const externalFill = clampHoursPlateRatio(externalShare);
  const wasteRatio = clampHoursPlateRatio(wasteExternalRatio);
  const externalWidth = trackWidth(externalFill);
  const wasteWidth = externalWidth * wasteRatio;
  const branchX = TRACK_X + Math.max(0, externalWidth - wasteWidth);
  const branchQuiet = wasteFill <= 0;

  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden fill="none">
      <rect
        x={TRACK_X}
        y={TRACK_Y}
        width={TRACK_W}
        height={TRACK_H}
        rx="2"
        className="fill-current opacity-20"
      />
      {externalFill > 0 ? (
        <rect
          x={TRACK_X}
          y={TRACK_Y}
          height={TRACK_H}
          rx="2"
          className={cn("fill-current opacity-30", glyphMotionClass)}
          style={{ width: externalWidth }}
        />
      ) : null}
      {!branchQuiet ? (
        <>
          <rect
            x={branchX}
            y={TRACK_Y}
            height={TRACK_H}
            rx="2"
            className={cn("fill-current", glyphMotionClass)}
            style={{ width: Math.max(2, wasteWidth) }}
          />
          <path
            d={`M${branchX + Math.max(2, wasteWidth) / 2} ${TRACK_Y + TRACK_H} L${branchX + Math.max(2, wasteWidth) / 2} 27 L${branchX + Math.max(2, wasteWidth) + 8} 27`}
            className={cn("stroke-current", glyphMotionClass)}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: Math.max(0.55, wasteRatio) }}
          />
        </>
      ) : (
        <line
          x1={TRACK_X + TRACK_W * 0.72}
          y1={TRACK_Y + TRACK_H + 4}
          x2={TRACK_X + TRACK_W * 0.72}
          y2="27"
          className="stroke-current opacity-20"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
      )}
    </svg>
  );
}

/** Internal column with a solid billable slice. */
function InternalBillableStackGlyph({
  internalTotalShare,
  billableInternalRatio,
  className,
}: {
  internalTotalShare: number;
  billableInternalRatio: number;
  className?: string;
}) {
  const internalScale = stackScale(internalTotalShare, 0.12);
  const billableScale = stackScale(billableInternalRatio, 0.1);

  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden>
      <rect
        x={TRACK_X}
        y={BASELINE}
        width={TRACK_W}
        height="2"
        rx="1"
        className="fill-current opacity-20"
      />
      <rect
        x={STACK_CENTER_X}
        y={BASELINE - STACK_MAX}
        width={STACK_OUTER_W}
        height={STACK_MAX}
        rx="1.5"
        className={cn("fill-current opacity-15 origin-bottom", glyphMotionClass)}
        style={{
          transform: `scaleY(${internalScale})`,
          transformOrigin: `${STACK_CENTER_X + STACK_OUTER_W / 2}px ${BASELINE}px`,
        }}
      />
      <rect
        x={STACK_INNER_X}
        y={BASELINE - STACK_MAX}
        width={STACK_INNER_W}
        height={STACK_MAX}
        rx="1.5"
        className={cn("fill-current origin-bottom", glyphMotionClass)}
        style={{
          transform: `scaleY(${billableScale})`,
          transformOrigin: `${STACK_INNER_X + STACK_INNER_W / 2}px ${BASELINE}px`,
        }}
      />
    </svg>
  );
}

/** Internal outline with a hollow non-billable slice. */
function InternalNonBillableOutlineGlyph({
  internalTotalShare,
  nonBillableInternalRatio,
  className,
}: {
  internalTotalShare: number;
  nonBillableInternalRatio: number;
  className?: string;
}) {
  const internalScale = stackScale(internalTotalShare, 0.12);
  const nonBillableScale = stackScale(nonBillableInternalRatio, 0.1);
  const quiet = nonBillableScale <= 0.1;

  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden fill="none">
      <rect
        x={TRACK_X}
        y={BASELINE}
        width={TRACK_W}
        height="2"
        rx="1"
        className="fill-current opacity-20"
      />
      <rect
        x={STACK_CENTER_X}
        y={BASELINE - STACK_MAX}
        width={STACK_OUTER_W}
        height={STACK_MAX}
        rx="1.5"
        className={cn("stroke-current opacity-25 origin-bottom", glyphMotionClass)}
        strokeWidth="2"
        style={{
          transform: `scaleY(${internalScale})`,
          transformOrigin: `${STACK_CENTER_X + STACK_OUTER_W / 2}px ${BASELINE}px`,
        }}
      />
      <rect
        x={STACK_INNER_X}
        y={BASELINE - STACK_MAX}
        width={STACK_INNER_W}
        height={STACK_MAX}
        rx="1.5"
        className={cn("stroke-current origin-bottom", glyphMotionClass)}
        strokeWidth="2"
        style={{
          transform: `scaleY(${quiet ? 0.45 : nonBillableScale})`,
          transformOrigin: `${STACK_INNER_X + STACK_INNER_W / 2}px ${BASELINE}px`,
          opacity: quiet ? 0.35 : 0.9,
        }}
      />
      {!quiet ? (
        <line
          x1={STACK_INNER_X + 1}
          y1={BASELINE - STACK_MAX * 0.55 * nonBillableScale}
          x2={STACK_INNER_X + STACK_INNER_W - 1}
          y2={BASELINE - STACK_MAX * 0.55 * nonBillableScale}
          className="stroke-current opacity-45"
          strokeWidth="1.25"
          strokeDasharray="3 2.5"
        />
      ) : null}
    </svg>
  );
}

export function DashboardHoursPlateGlyph({
  glyph,
  className,
}: {
  glyph: DashboardHoursPlateGlyphSignal;
  className?: string;
}) {
  const glyphClass = cn("h-full w-full", className);

  switch (glyph.kind) {
    case "paid":
      return (
        <PaidClientFlowGlyph
          paidShare={glyph.paidShare}
          externalShare={glyph.externalShare}
          className={glyphClass}
        />
      );
    case "waste":
      return (
        <WasteBranchGlyph
          wasteShare={glyph.wasteShare}
          externalShare={glyph.externalShare}
          wasteExternalRatio={glyph.wasteExternalRatio}
          className={glyphClass}
        />
      );
    case "internal-billable":
      return (
        <InternalBillableStackGlyph
          internalTotalShare={glyph.internalTotalShare}
          billableInternalRatio={glyph.billableInternalRatio}
          className={glyphClass}
        />
      );
    case "internal-non-billable":
      return (
        <InternalNonBillableOutlineGlyph
          internalTotalShare={glyph.internalTotalShare}
          nonBillableInternalRatio={glyph.nonBillableInternalRatio}
          className={glyphClass}
        />
      );
    default: {
      const _exhaustive: never = glyph;
      return _exhaustive;
    }
  }
}
