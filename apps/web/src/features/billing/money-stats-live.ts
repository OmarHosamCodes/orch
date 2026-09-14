/** Build Money stats cards from live period totals + fixture fallbacks. */

import {
  MONEY_STATS_CARDS_FIXTURE,
  MONEY_STATS_FIXTURE_CURRENCY,
  type MoneyStatsCardFixture,
  type MoneyStatsMetricFixture,
  type MoneyStatsMetricId,
} from "./money-stats-fixtures";

type MoneyStatsMetricSource = "live" | "fixture";

export type MoneyStatsLiveOverrides = {
  currency?: string;
  /** Major units for currency metrics; 0–1 for percent. */
  metrics?: Partial<Record<MoneyStatsMetricId, number>>;
  sources?: Partial<Record<MoneyStatsMetricId, MoneyStatsMetricSource>>;
};

type MoneyStatsMetricWithSource = MoneyStatsMetricFixture & {
  source: MoneyStatsMetricSource;
};

export type MoneyStatsCardWithSource = Omit<MoneyStatsCardFixture, "metrics"> & {
  currency: string;
  metrics: MoneyStatsMetricWithSource[];
};

export function amountToMajor(amount: number): number {
  return amount / 100;
}

export function buildMoneyStatsCards(
  overrides: MoneyStatsLiveOverrides = {},
): MoneyStatsCardWithSource[] {
  const currency = overrides.currency ?? MONEY_STATS_FIXTURE_CURRENCY;
  return MONEY_STATS_CARDS_FIXTURE.map((card) => ({
    ...card,
    currency,
    metrics: card.metrics.map((metric) => {
      const liveAmount = overrides.metrics?.[metric.id];
      const source =
        overrides.sources?.[metric.id] ?? (liveAmount === undefined ? "fixture" : "live");
      return {
        ...metric,
        amount: liveAmount ?? metric.amount,
        source,
      };
    }),
  }));
}
