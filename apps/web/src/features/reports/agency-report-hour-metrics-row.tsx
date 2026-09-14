import { AgencyHourBreakdownCompactStrip } from "@/features/shared/agency-hour-breakdown-compact-strip";
import { agencyMetricClass } from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import type { ReportHourMetrics } from "./agency-report-hour-metrics";

export type AgencyReportHourMetricsRowProps = {
  metrics: ReportHourMetrics;
  caption: string;
};

const metricTiles = [
  { id: "total", label: "Total", dotClass: null },
  { id: "paid", label: "Paid", dotClass: "bg-primary" },
  { id: "waste", label: "Waste", dotClass: "bg-destructive" },
  { id: "internal", label: "Internal", dotClass: "bg-info" },
] as const;

export function AgencyReportHourMetricsRow({ metrics, caption }: AgencyReportHourMetricsRowProps) {
  const values = {
    total: metrics.totalSeconds,
    paid: metrics.paidSeconds,
    waste: metrics.wasteSeconds,
    internal: metrics.internalSeconds,
  };
  const entryLabel = metrics.entryCount === 1 ? "1 entry" : `${metrics.entryCount} entries`;

  return (
    <div className="space-y-3 rounded-surface border border-default/55 bg-default px-surface py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted">{caption}</p>
        <p className="text-xs text-muted">{entryLabel}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricTiles.map((tile) => (
          <div key={tile.id} className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              {tile.dotClass ? (
                <span className={cn("size-2 shrink-0 rounded-full", tile.dotClass)} aria-hidden />
              ) : null}
              {tile.label}
            </p>
            <p className={cn(agencyMetricClass, "text-base font-semibold sm:text-lg")}>
              {formatDuration(values[tile.id], "clock")}
            </p>
          </div>
        ))}
      </div>
      <AgencyHourBreakdownCompactStrip
        layout="bar"
        totalSeconds={metrics.totalSeconds}
        externalSeconds={metrics.externalSeconds}
        internalSeconds={metrics.internalSeconds}
        internalBillableSeconds={metrics.internalBillableSeconds}
        paidSeconds={metrics.paidSeconds}
      />
    </div>
  );
}
