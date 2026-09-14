import { X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, type ReactElement } from "react";

import { Button } from "@/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { agencyLabelClass, agencyMetricClass } from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

export type AgencyHourBreakdownMetrics = {
  totalSeconds: number;
  externalSeconds: number;
  internalSeconds: number;
  internalBillableSeconds: number;
  paidSeconds: number;
};

type HourBreakdownSegmentId = "paid" | "waste" | "internalBillable" | "internalNonBillable";

type HourBreakdownSegment = {
  id: HourBreakdownSegmentId;
  label: string;
  shortLabel: string;
  purpose: string;
  seconds: number;
  barClass: string;
  dotClass: string;
};

export function deriveInternalSplit(metrics: AgencyHourBreakdownMetrics): {
  wasteSeconds: number;
  internalBillableSeconds: number;
  internalNonBillableSeconds: number;
} {
  const wasteSeconds = Math.max(0, metrics.externalSeconds - metrics.paidSeconds);
  const internalBillableSeconds = Math.min(
    metrics.internalSeconds,
    Math.max(0, metrics.internalBillableSeconds),
  );
  const internalNonBillableSeconds = Math.max(0, metrics.internalSeconds - internalBillableSeconds);
  return { wasteSeconds, internalBillableSeconds, internalNonBillableSeconds };
}

export function buildHourBreakdownSegments(
  metrics: AgencyHourBreakdownMetrics,
): HourBreakdownSegment[] {
  const { wasteSeconds, internalBillableSeconds, internalNonBillableSeconds } =
    deriveInternalSplit(metrics);

  return [
    {
      id: "paid",
      label: "Paid",
      shortLabel: "Paid",
      purpose: "External hours minus waste — the billable client share.",
      seconds: metrics.paidSeconds,
      barClass: "bg-primary",
      dotClass: "bg-primary",
    },
    {
      id: "waste",
      label: "Waste",
      shortLabel: "Waste",
      purpose: "External time marked as non-billable or waste.",
      seconds: wasteSeconds,
      barClass: "bg-destructive",
      dotClass: "bg-destructive",
    },
    {
      id: "internalBillable",
      label: "Internal billable",
      shortLabel: "Billable",
      purpose: "Internal-client work marked billable.",
      seconds: internalBillableSeconds,
      barClass: "bg-info",
      dotClass: "bg-info",
    },
    {
      id: "internalNonBillable",
      label: "Internal non-billable",
      shortLabel: "Non-billable",
      purpose: "Internal-client work marked non-billable.",
      seconds: internalNonBillableSeconds,
      barClass: "bg-info/45",
      dotClass: "bg-info/45",
    },
  ];
}

type FlowSpan = { x0: number; x1: number };

type HourBreakdownFlowLink = {
  id: string;
  source: FlowSpan;
  target: FlowSpan;
  fillClass: string;
};

export type HourBreakdownFlowLayout = {
  shares: Record<HourBreakdownSegmentId, number>;
  nodes: { external: FlowSpan; internal: FlowSpan };
  bar: Array<{ id: HourBreakdownSegmentId; span: FlowSpan }>;
  branchLinks: HourBreakdownFlowLink[];
  destinationLinks: HourBreakdownFlowLink[];
};

/** Zero-hour stages keep this much of the diagram so every lane stays legible. */
export const MIN_FLOW_SHARE = 0.05;

/** Fraction each mid node is inset from its branch span, giving ribbons a waist. */
const NODE_INSET = 0.08;

function flooredShares(
  metrics: AgencyHourBreakdownMetrics,
): Record<HourBreakdownSegmentId, number> {
  const { wasteSeconds, internalBillableSeconds, internalNonBillableSeconds } =
    deriveInternalSplit(metrics);
  const raw: Array<[HourBreakdownSegmentId, number]> = [
    ["paid", metrics.paidSeconds],
    ["waste", wasteSeconds],
    ["internalBillable", internalBillableSeconds],
    ["internalNonBillable", internalNonBillableSeconds],
  ];
  const total = raw.reduce((sum, [, seconds]) => sum + seconds, 0);
  if (total <= 0) {
    return {
      paid: 0.25,
      waste: 0.25,
      internalBillable: 0.25,
      internalNonBillable: 0.25,
    };
  }

  const shares = raw.map(([id, seconds]) => [id, seconds / total] as const);
  const small = shares.filter(([, share]) => share < MIN_FLOW_SHARE);
  const largeTotal = shares
    .filter(([, share]) => share >= MIN_FLOW_SHARE)
    .reduce((sum, [, share]) => sum + share, 0);
  const largeBudget = 1 - small.length * MIN_FLOW_SHARE;

  const result = {
    paid: 0,
    waste: 0,
    internalBillable: 0,
    internalNonBillable: 0,
  };
  for (const [id, share] of shares) {
    result[id] =
      share < MIN_FLOW_SHARE ? MIN_FLOW_SHARE : (share / Math.max(largeTotal, 1e-9)) * largeBudget;
  }
  return result;
}

export function buildHourBreakdownFlowLayout(
  metrics: AgencyHourBreakdownMetrics,
): HourBreakdownFlowLayout {
  const shares = flooredShares(metrics);
  const externalWidth = shares.paid + shares.waste;
  const internalWidth = shares.internalBillable + shares.internalNonBillable;

  const externalNode: FlowSpan = {
    x0: externalWidth * NODE_INSET,
    x1: externalWidth * (1 - NODE_INSET),
  };
  const internalNode: FlowSpan = {
    x0: externalWidth + internalWidth * NODE_INSET,
    x1: 1 - internalWidth * NODE_INSET,
  };

  const bar: HourBreakdownFlowLayout["bar"] = [
    { id: "paid", span: { x0: 0, x1: shares.paid } },
    { id: "waste", span: { x0: shares.paid, x1: externalWidth } },
    {
      id: "internalBillable",
      span: { x0: externalWidth, x1: externalWidth + shares.internalBillable },
    },
    {
      id: "internalNonBillable",
      span: { x0: externalWidth + shares.internalBillable, x1: 1 },
    },
  ];

  const externalNodeWidth = externalNode.x1 - externalNode.x0;
  const paidPortion = shares.paid / Math.max(externalWidth, 1e-9);
  const paidSourceEnd = externalNode.x0 + externalNodeWidth * paidPortion;

  const internalNodeWidth = internalNode.x1 - internalNode.x0;
  const billablePortion = shares.internalBillable / Math.max(internalWidth, 1e-9);
  const billableSourceEnd = internalNode.x0 + internalNodeWidth * billablePortion;

  return {
    shares,
    nodes: { external: externalNode, internal: internalNode },
    bar,
    branchLinks: [
      {
        id: "total-external",
        source: { x0: 0, x1: externalWidth },
        target: externalNode,
        fillClass: "fill-muted/25",
      },
      {
        id: "total-internal",
        source: { x0: externalWidth, x1: 1 },
        target: internalNode,
        fillClass: "fill-info/25",
      },
    ],
    destinationLinks: [
      {
        id: "external-paid",
        source: { x0: externalNode.x0, x1: paidSourceEnd },
        target: { x0: 0, x1: shares.paid },
        fillClass: "fill-primary/35",
      },
      {
        id: "external-waste",
        source: { x0: paidSourceEnd, x1: externalNode.x1 },
        target: { x0: shares.paid, x1: externalWidth },
        fillClass: "fill-destructive/35",
      },
      {
        id: "internal-billable",
        source: { x0: internalNode.x0, x1: billableSourceEnd },
        target: { x0: externalWidth, x1: externalWidth + shares.internalBillable },
        fillClass: "fill-info/40",
      },
      {
        id: "internal-non-billable",
        source: { x0: billableSourceEnd, x1: internalNode.x1 },
        target: { x0: externalWidth + shares.internalBillable, x1: 1 },
        fillClass: "fill-info/20",
      },
    ],
  };
}

function ribbonPath(link: HourBreakdownFlowLink): string {
  const s0 = (link.source.x0 * 100).toFixed(2);
  const s1 = (link.source.x1 * 100).toFixed(2);
  const t0 = (link.target.x0 * 100).toFixed(2);
  const t1 = (link.target.x1 * 100).toFixed(2);
  return `M ${s0} 0 C ${s0} 60 ${t0} 40 ${t0} 100 L ${t1} 100 C ${t1} 40 ${s1} 60 ${s1} 0 Z`;
}

function RibbonLayer({ links, delay }: { links: HourBreakdownFlowLink[]; delay: number }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-9 w-full"
      aria-hidden="true"
      initial={{ opacity: 0, scaleY: 0.55 }}
      animate={{ opacity: 1, scaleY: 1 }}
      style={{ originY: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {links.map((link) => (
        <path key={link.id} d={ribbonPath(link)} className={link.fillClass} />
      ))}
    </motion.svg>
  );
}

function HourBreakdownSegmentTooltip({
  label,
  seconds,
  totalSeconds,
  purpose,
  children,
}: {
  label: string;
  seconds: number;
  totalSeconds: number;
  purpose: string;
  children: ReactElement;
}) {
  const share = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="flex max-w-[16rem] flex-col gap-1 px-3 py-2 text-left">
        <p className="font-semibold">{label}</p>
        <p className="font-mono text-[11px] tabular-nums opacity-90">
          {formatDuration(seconds)} · {share.toFixed(0)}%
        </p>
        <p className="text-[11px] leading-snug opacity-75">{purpose}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export type AgencyHourBreakdownFlowProps = AgencyHourBreakdownMetrics & {
  panelId?: string;
  className?: string;
  /** Shared-layout id so the donut's Total circle morphs into this Total bar. */
  totalLayoutId?: string;
  onClose?: () => void;
};

export function AgencyHourBreakdownFlow({
  panelId,
  className,
  totalLayoutId,
  totalSeconds,
  externalSeconds,
  internalSeconds,
  internalBillableSeconds,
  paidSeconds,
  onClose,
}: AgencyHourBreakdownFlowProps) {
  const metrics = {
    totalSeconds,
    externalSeconds,
    internalSeconds,
    internalBillableSeconds,
    paidSeconds,
  };
  const segments = buildHourBreakdownSegments(metrics);
  const layout = buildHourBreakdownFlowLayout(metrics);
  const segmentById = new Map(segments.map((segment) => [segment.id, segment]));

  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <TooltipProvider delayDuration={120}>
      <div id={panelId} className={cn(className)} role="region" aria-label="Hour breakdown chart">
        <div className="flex items-center justify-between gap-2">
          <p className={agencyLabelClass}>Hour breakdown</p>
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 text-toned hover:text-highlighted"
              aria-label="Close hour breakdown"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>

        <motion.div
          layoutId={totalLayoutId}
          style={{ borderRadius: 10 }}
          className="mt-4 flex h-10 items-center justify-between border border-default bg-default px-3"
          title={`Total: ${formatDuration(totalSeconds)}`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Total
          </span>
          <span className={cn(agencyMetricClass, "text-sm tabular-nums")}>
            {formatDuration(totalSeconds)}
          </span>
        </motion.div>

        <div
          role="img"
          aria-label="Flow of total time into paid, waste, and internal billable and non-billable hours"
          className="mt-1"
        >
          <RibbonLayer links={layout.branchLinks} delay={0.04} />

          <motion.div
            className="relative h-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.3 }}
          >
            <HourBreakdownSegmentTooltip
              label="External"
              seconds={externalSeconds}
              totalSeconds={totalSeconds}
              purpose="Client-facing tracked time before paid and waste split."
            >
              <button
                type="button"
                className="absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-[4px] bg-elevated"
                style={{
                  left: `${layout.nodes.external.x0 * 100}%`,
                  width: `${(layout.nodes.external.x1 - layout.nodes.external.x0) * 100}%`,
                }}
                aria-label={`External: ${formatDuration(externalSeconds)}`}
              >
                <span className="truncate px-1 text-[9px] font-semibold uppercase tracking-wide text-muted">
                  External
                </span>
              </button>
            </HourBreakdownSegmentTooltip>
            <HourBreakdownSegmentTooltip
              label="Internal"
              seconds={internalSeconds}
              totalSeconds={totalSeconds}
              purpose="Internal-client work, split into billable and non-billable."
            >
              <button
                type="button"
                className="absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-[4px] bg-info"
                style={{
                  left: `${layout.nodes.internal.x0 * 100}%`,
                  width: `${(layout.nodes.internal.x1 - layout.nodes.internal.x0) * 100}%`,
                }}
                aria-label={`Internal: ${formatDuration(internalSeconds)}`}
              >
                <span className="truncate px-1 text-[9px] font-semibold uppercase tracking-wide text-inverted">
                  Internal
                </span>
              </button>
            </HourBreakdownSegmentTooltip>
          </motion.div>

          <RibbonLayer links={layout.destinationLinks} delay={0.12} />

          <motion.div
            className="flex h-8 w-full gap-px overflow-hidden rounded-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.16, duration: 0.3 }}
          >
            {layout.bar.map(({ id, span }) => {
              const segment = segmentById.get(id);
              if (!segment) return null;
              const widthPercent = (span.x1 - span.x0) * 100;
              const share = totalSeconds > 0 ? (segment.seconds / totalSeconds) * 100 : 0;
              return (
                <HourBreakdownSegmentTooltip
                  key={id}
                  label={segment.label}
                  seconds={segment.seconds}
                  totalSeconds={totalSeconds}
                  purpose={segment.purpose}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex h-full min-w-0 items-center justify-center",
                      segment.barClass,
                      segment.seconds <= 0 && "opacity-40",
                    )}
                    style={{ width: `${widthPercent}%` }}
                    aria-label={`${segment.label}: ${formatDuration(segment.seconds)}, ${share.toFixed(0)} percent. ${segment.purpose}`}
                  >
                    {widthPercent >= 12 ? (
                      <span className="truncate px-1 text-[10px] font-semibold uppercase tracking-wide text-inverted">
                        {widthPercent >= 18 ? segment.shortLabel : segment.shortLabel.slice(0, 4)}
                      </span>
                    ) : null}
                  </button>
                </HourBreakdownSegmentTooltip>
              );
            })}
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}
