import { ChevronRight } from "lucide-react";

import type { MoneyStatsMetricTone } from "@/features/billing/money-stats-fixtures";
import { instrumentPlateInkClass } from "@/features/member-profile/member-profile-instrument-plate";
import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyMetricClass,
  agencyPanelClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  type MoneyStatsCardViewModel,
  type MoneyStatsMetricSelection,
} from "./hooks/use-agency-money-scoreboard";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";
import { MoneyPeriodFxLine } from "./money-panel-chrome";
import { type MoneyPnlStage } from "./money-pnl-narrative";
import { MoneyStatsPlateGlyph } from "./money-stats-plate-glyphs";
import { moneyStatsMetricDestination } from "./money-stats-plate-meta";
import {
  formatMoneyStatsMetricValue,
  MoneyStatsMetricHintStrip,
  type MoneyStatsMetricHint,
} from "./money-stats-plate-view";

function pnlGridClass(stageCount: number): string {
  if (stageCount >= 4) return "sm:grid-cols-2 xl:grid-cols-4";
  if (stageCount >= 3) return "sm:grid-cols-2 xl:grid-cols-3";
  if (stageCount === 2) return "sm:grid-cols-2";
  return "grid-cols-1";
}

function pnlMetricToneClass(tone: MoneyStatsMetricTone | undefined): string {
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

function MoneyPnlMetricButton({
  card,
  metric,
  onSelect,
  emphasized,
}: {
  card: MoneyStatsCardViewModel;
  metric: MoneyStatsCardViewModel["primary"];
  onSelect: (selection: MoneyStatsMetricSelection) => void;
  emphasized?: boolean;
}) {
  const value = formatMoneyStatsMetricValue(metric.kind, metric.amount, card.currency);
  const toneClass = pnlMetricToneClass(metric.tone);

  return (
    <button
      type="button"
      className={cn(
        "group/metric flex w-full min-w-0 items-baseline gap-3 rounded-md px-0.5 py-0.5 text-left",
        "hover:bg-muted/40",
        agencyFocusRingClass,
      )}
      onClick={() => onSelect({ cardId: card.id, metricId: metric.id })}
      aria-label={`${metric.label}: ${value}. Show ${moneyStatsMetricDestination(metric.id)}.`}
    >
      <span className="min-w-0 truncate text-xs text-muted-foreground">{metric.label}</span>
      <span className="flex shrink-0 items-baseline gap-1">
        <span
          className={cn(
            agencyMetricClass,
            "whitespace-nowrap text-sm font-medium tracking-tight",
            emphasized && "font-semibold",
            toneClass,
          )}
        >
          {value}
        </span>
        <ChevronRight
          className="size-3 shrink-0 text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover/metric:opacity-100 sm:group-focus-visible/metric:opacity-100"
          aria-hidden
        />
      </span>
    </button>
  );
}

function MoneyPnlStageColumn({
  stage,
  onSelectMetric,
}: {
  stage: MoneyPnlStage<MoneyStatsCardViewModel>;
  onSelectMetric: AgencyMoneySurfaceViewModel["onSelectMetric"];
}) {
  const { card } = stage;
  const ink = instrumentPlateInkClass(card.tone);
  const metrics = [card.primary, ...card.secondary];
  const collectedPct = card.collectedRatio === null ? null : Math.round(card.collectedRatio * 100);
  const collectionTone =
    collectedPct !== null && collectedPct < 100 ? "text-warning" : "text-muted-foreground";

  return (
    <div className="flex h-full min-w-0 flex-col gap-2">
      <header className="flex items-baseline gap-2">
        <h3 className={agencyWorkTitleClass}>{stage.title}</h3>
        <span className="sr-only">{stage.destinationHint}</span>
      </header>
      <div className={cn("h-10 w-20 shrink-0 sm:h-12 sm:w-24", ink)}>
        <MoneyStatsPlateGlyph glyph={card.glyph} className="h-full w-full" />
      </div>
      {card.collectedLabel ? (
        <p className={cn("font-mono text-[11px] font-medium tabular-nums", collectionTone)}>
          {card.collectedLabel}
        </p>
      ) : null}
      <ul className="flex flex-col gap-0.5">
        {metrics.map((metric) => (
          <li key={metric.id}>
            <MoneyPnlMetricButton
              card={card}
              metric={metric}
              onSelect={onSelectMetric}
              emphasized={metric.id === card.primary.id}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MoneyStatsSection({
  status,
  errorMessage,
  pnlStages,
  onSelectMetric,
  onRetry,
  metricHint,
  periodFx,
}: {
  status: AgencyMoneySurfaceViewModel["scoreboardStatus"];
  errorMessage: string;
  pnlStages: AgencyMoneySurfaceViewModel["pnlStages"];
  onSelectMetric: AgencyMoneySurfaceViewModel["onSelectMetric"];
  onRetry: AgencyMoneySurfaceViewModel["onRetryScoreboard"];
  metricHint?: MoneyStatsMetricHint | null;
  periodFx?: AgencyMoneySurfaceViewModel["periodFx"];
}) {
  if (status === "loading") {
    return <SurfaceShimmer className="h-full min-h-[16rem]" label="Loading period stats" />;
  }

  if (status === "error") {
    return (
      <section className={cn(agencyErrorPanelClass, "h-full")} role="alert">
        <p className="text-sm font-medium text-highlighted">Couldn’t load the period scoreboard</p>
        <p className="mt-1 text-xs text-muted">{errorMessage}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      </section>
    );
  }

  return (
    <section
      className={cn(agencyPanelClass, "flex h-full min-h-0 min-w-0 flex-col gap-3 p-4")}
      aria-label="Period performance"
    >
      {periodFx ? (
        <MoneyPeriodFxLine
          label={periodFx.label}
          canApplyCurrent={periodFx.canApplyCurrent}
          applying={periodFx.applying}
          onApplyCurrent={periodFx.onApplyCurrent}
        />
      ) : null}
      <div
        className={cn(
          "grid min-h-0 flex-1 items-stretch gap-x-6 gap-y-4",
          pnlGridClass(pnlStages.length),
        )}
      >
        {pnlStages.map((stage) => (
          <MoneyPnlStageColumn key={stage.id} stage={stage} onSelectMetric={onSelectMetric} />
        ))}
      </div>
      <MoneyStatsMetricHintStrip hint={metricHint ?? null} />
    </section>
  );
}
