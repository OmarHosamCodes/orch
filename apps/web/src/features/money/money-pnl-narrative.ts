import type { MoneyStatsCardId, MoneyStatsMetricId } from "@/features/billing/money-stats-fixtures";

import { moneyStatsPlateMeta } from "./money-stats-plate-meta";

const PNL_SPINE_METRIC_IDS: ReadonlySet<MoneyStatsMetricId> = new Set([
  "total-income",
  "received",
  "remaining",
  "team-profit",
  "roi",
]);

const STAGE_ORDER: readonly MoneyStatsCardId[] = [
  "income-cash",
  "deductions",
  "profitability",
  "allocations",
];

export type MoneyPnlMetricLike = {
  id: MoneyStatsMetricId;
  amount: number;
};

export type MoneyPnlCardLike<TMetric extends MoneyPnlMetricLike> = {
  id: MoneyStatsCardId;
  title: string;
  primary: TMetric;
  secondary: TMetric[];
};

export type MoneyPnlStage<TCard> = {
  id: MoneyStatsCardId;
  title: string;
  destinationHint: string;
  card: TCard;
};

export function isMoneyPnlLiveMetric(id: MoneyStatsMetricId, amount: number): boolean {
  if (PNL_SPINE_METRIC_IDS.has(id)) return true;
  return amount !== 0;
}

function stageHasLiveOptionalMetrics<TMetric extends MoneyPnlMetricLike>(
  stageId: MoneyStatsCardId,
  metrics: readonly TMetric[],
): boolean {
  if (stageId !== "deductions" && stageId !== "allocations") return true;
  return metrics.some((metric) => metric.amount !== 0);
}

export function buildMoneyPnlStages<
  TMetric extends MoneyPnlMetricLike,
  TCard extends MoneyPnlCardLike<TMetric>,
>(statsCards: readonly TCard[]): MoneyPnlStage<TCard>[] {
  const stages: MoneyPnlStage<TCard>[] = [];

  for (const stageId of STAGE_ORDER) {
    const card = statsCards.find((item) => item.id === stageId);
    if (!card) continue;
    const metrics = [card.primary, ...card.secondary];
    if (!stageHasLiveOptionalMetrics(stageId, metrics)) continue;
    const meta = moneyStatsPlateMeta(stageId);
    stages.push({
      id: stageId,
      title: meta.shortTitle,
      destinationHint: meta.destinationHint,
      card,
    });
  }

  return stages;
}
