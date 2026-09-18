import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format-duration";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

import {
  buildHourBreakdownSegments,
  type AgencyHourBreakdownMetrics,
} from "./agency-hour-breakdown-metrics";

export type CompactHourCompositionItem = {
  id: "paid" | "waste" | "internal";
  label: string;
  purpose: string;
  seconds: number;
  dotClass: string;
  barClass: string;
};

export function compactHourCompositionItems(
  metrics: AgencyHourBreakdownMetrics,
): CompactHourCompositionItem[] {
  const segments = buildHourBreakdownSegments(metrics).filter(
    (segment) =>
      segment.id === "paid" || segment.id === "waste" || segment.id === "internalBillable",
  );
  const paid = segments.find((segment) => segment.id === "paid");
  const waste = segments.find((segment) => segment.id === "waste");

  return [
    paid
      ? {
          id: "paid" as const,
          label: paid.label,
          purpose: paid.purpose,
          seconds: paid.seconds,
          dotClass: paid.dotClass,
          barClass: paid.barClass,
        }
      : null,
    waste
      ? {
          id: "waste" as const,
          label: waste.label,
          purpose: waste.purpose,
          seconds: waste.seconds,
          dotClass: waste.dotClass,
          barClass: waste.barClass,
        }
      : null,
    {
      id: "internal" as const,
      label: "Internal",
      purpose: "Internal-client hours (billable and non-billable).",
      seconds: metrics.internalSeconds,
      dotClass: "bg-info",
      barClass: "bg-info",
    },
  ].filter((item): item is CompactHourCompositionItem => item !== null && item.seconds > 0);
}

export type AgencyHourBreakdownCompactStripProps = AgencyHourBreakdownMetrics & {
  className?: string;
  showLabels?: boolean;
  layout?: "dots" | "bar";
};

/** Paid / Waste / Internal composition. Omits empty buckets. */
export function AgencyHourBreakdownCompactStrip({
  className,
  showLabels = true,
  layout = "dots",
  totalSeconds,
  externalSeconds,
  internalSeconds,
  internalBillableSeconds,
  paidSeconds,
}: AgencyHourBreakdownCompactStripProps) {
  const items = compactHourCompositionItems({
    totalSeconds,
    externalSeconds,
    internalSeconds,
    internalBillableSeconds,
    paidSeconds,
  });
  if (items.length === 0) return null;
  const denom = Math.max(
    1,
    items.reduce((sum, item) => sum + item.seconds, 0),
  );

  return (
    <TooltipProvider delayDuration={120}>
      <div className={cn(layout === "bar" && "space-y-2", className)} aria-label="Hour composition">
        {layout === "bar" ? (
          <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-hidden>
            {items.map((item) => (
              <span
                key={item.id}
                className={cn("h-full", item.barClass)}
                style={{ width: `${(item.seconds / denom) * 100}%` }}
              />
            ))}
          </div>
        ) : null}
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs leading-snug">
          {items.map((item) => (
            <li key={item.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-sm text-muted-foreground",
                      agencyFocusRingClass,
                    )}
                    aria-label={`${item.label} ${formatDuration(item.seconds, "clock")}`}
                  >
                    <span
                      className={cn("size-2 shrink-0 self-center rounded-full", item.dotClass)}
                      aria-hidden
                    />
                    {showLabels ? (
                      <span className="font-medium text-foreground">{item.label}</span>
                    ) : null}
                    <span className="font-mono tabular-nums">
                      {formatDuration(item.seconds, "clock")}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[16rem] px-3 py-2 text-left">
                  <p className="text-xs leading-snug">
                    {showLabels ? item.purpose : `${item.label}. ${item.purpose}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </div>
    </TooltipProvider>
  );
}
