import { ChevronRight } from "lucide-react";

import {
  type MoneyStatsMetricFixture,
  type MoneyStatsMetricKind,
  type MoneyStatsMetricTone,
} from "@/features/billing/money-stats-fixtures";
import {
  instrumentPlateInkClass,
  instrumentPlateSurfaceClass,
} from "@/features/member-profile/member-profile-instrument-plate";
import { agencyFocusRingClass, agencyMetricClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

import { MoneyStatsPlateGlyph } from "./money-stats-plate-glyphs";
import { moneyStatsMetricDestination, moneyStatsPlateMeta } from "./money-stats-plate-meta";
import {
  type AgencyMoneySurfaceViewModel,
  type MoneyStatsCardViewModel,
  type MoneyStatsMetricSelection,
} from "./hooks/use-agency-money-surface";

const plateTitleClass = "text-sm font-semibold tracking-tight text-foreground";
const plateHintClass =
  "shrink-0 font-mono text-[0.625rem] font-medium tracking-[0.04em] text-muted-foreground";
const metricLabelClass = "min-w-0 truncate text-[10px] leading-snug text-muted-foreground";
const metricValueClass = cn(
  agencyMetricClass,
  "text-xs font-medium tracking-tight tabular-nums leading-none sm:text-sm",
);

export function formatMoneyStatsMetricValue(
  kind: MoneyStatsMetricKind,
  amount: number,
  currency: string,
): string {
  if (kind === "percent") {
    return new Intl.NumberFormat(undefined, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function toneValueClass(tone: MoneyStatsMetricTone | undefined): string {
  switch (tone) {
    case "positive":
      return "text-success";
    case "caution":
      return "text-warning";
    case "danger":
      return "text-destructive";
    case "default":
    case undefined:
      return "text-foreground";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function MoneyStatsMetricRow({
  card,
  metric,
  value,
  onSelect,
  emphasized,
}: {
  card: MoneyStatsCardViewModel;
  metric: MoneyStatsMetricFixture & { source: "live" | "fixture" };
  value: string;
  onSelect: (selection: MoneyStatsMetricSelection) => void;
  emphasized?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group/metric flex min-w-0 flex-col gap-0.5 rounded-md px-1.5 py-1.5 text-left transition-colors",
        "hover:bg-muted/40",
        agencyFocusRingClass,
      )}
      onClick={() => onSelect({ cardId: card.id, metricId: metric.id })}
      aria-label={`${metric.label}: ${value}. Show ${moneyStatsMetricDestination(metric.id)}.`}
    >
      <span className={metricLabelClass}>{metric.label}</span>
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span
          className={cn(
            metricValueClass,
            emphasized && "font-semibold",
            toneValueClass(metric.tone),
          )}
        >
          {value}
        </span>
        <ChevronRight
          className="size-3 shrink-0 text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover/metric:opacity-100 sm:group-focus-visible/metric:opacity-100"
          aria-hidden
        />
      </span>
    </button>
  );
}

export function MoneyStatsPlate({
  card,
  onSelectMetric,
  staggerIndex = 0,
}: {
  card: MoneyStatsCardViewModel;
  onSelectMetric: AgencyMoneySurfaceViewModel["onSelectMetric"];
  staggerIndex?: number;
}) {
  const { shortTitle, destinationHint } = moneyStatsPlateMeta(card.id);
  const ink = instrumentPlateInkClass(card.tone);
  const collectedPct = card.collectedRatio === null ? null : Math.round(card.collectedRatio * 100);
  const allMetrics = [card.primary, ...card.secondary];
  const collectionTone =
    collectedPct !== null && collectedPct < 100 ? "text-warning" : "text-muted-foreground";

  return (
    <article
      className={cn(
        instrumentPlateSurfaceClass(),
        "flex min-h-[15.5rem] flex-col gap-2 rounded-xl border px-4 py-3.5 transition-colors",
        "animate-in fade-in fill-mode-both duration-300 motion-reduce:animate-none",
      )}
      style={{ animationDelay: `${staggerIndex * 40}ms` }}
    >
      <header className="flex shrink-0 items-start justify-between gap-3">
        <h2 className={plateTitleClass}>{shortTitle}</h2>
        <span className={plateHintClass}>{destinationHint}</span>
      </header>

      <div className="flex min-h-[5.5rem] flex-1 flex-col justify-center gap-2.5 rounded-lg bg-muted/15 px-3 py-4">
        <div className={cn("h-14 w-full shrink-0 transition-colors duration-300 sm:h-16", ink)}>
          <MoneyStatsPlateGlyph glyph={card.glyph} className="h-full w-full" />
        </div>

        {collectedPct !== null ? (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] leading-snug text-muted-foreground">Collection</span>
              <span
                className={cn("font-mono text-[11px] font-medium tabular-nums", collectionTone)}
              >
                {card.collectedLabel}
              </span>
            </div>
            <div
              className="h-[5px] overflow-hidden rounded-full bg-muted/80"
              role="meter"
              aria-label="Share of total income received"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={collectedPct}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
                  collectedPct > 0 ? "bg-success/80" : "bg-warning/70",
                )}
                style={{ width: `${collectedPct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <ul className="grid shrink-0 grid-cols-1 gap-0.5 border-t border-border pt-2.5 sm:grid-cols-2 sm:gap-x-1.5 sm:gap-y-0.5">
        {allMetrics.map((metric) => (
          <li key={metric.id} className="min-w-0">
            <MoneyStatsMetricRow
              card={card}
              metric={metric}
              value={formatMoneyStatsMetricValue(metric.kind, metric.amount, card.currency)}
              onSelect={onSelectMetric}
              emphasized={metric.id === card.primary.id}
            />
          </li>
        ))}
      </ul>
    </article>
  );
}

export type MoneyStatsMetricHint = {
  label: string;
  value: string;
  destination: string;
};

export function MoneyStatsMetricHintStrip({ hint }: { hint: MoneyStatsMetricHint | null }) {
  if (!hint) return null;

  return (
    <p
      className="rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-sm leading-snug text-muted-foreground"
      aria-live="polite"
    >
      <span className="font-medium text-foreground">{hint.label}</span>
      <span aria-hidden> · </span>
      <span className={cn(agencyMetricClass, "font-medium tracking-tight")}>{hint.value}</span>
      <span aria-hidden> · </span>
      <span>Showing {hint.destination}</span>
    </p>
  );
}
