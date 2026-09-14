import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  type MoneyStatsCardId,
  type MoneyStatsMetricFixture,
  type MoneyStatsMetricId,
} from "@/features/billing/money-stats-fixtures";
import {
  buildMoneyStatsCards,
  amountToMajor,
  type MoneyStatsCardWithSource,
} from "@/features/billing/money-stats-live";
import type { InstrumentPlateTone } from "@/features/member-profile/member-profile-instrument-plate";
import { moneyStatsMetricDestination } from "@/features/money/money-stats-plate-meta";
import {
  moneyStatsLiveMetricTone,
  moneyStatsPlateSignal,
  type MoneyStatsPlateGlyphSignal,
} from "@/features/money/money-stats-plate-signal";
import { formatMoneyStatsMetricValue } from "@/features/money/money-stats-plate-view";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { orpc } from "@/lib/orpc";

export type MoneyStatsMetricSelection = {
  cardId: MoneyStatsCardId;
  metricId: MoneyStatsMetricId;
};

export type MoneyStatsCardViewModel = {
  id: MoneyStatsCardId;
  title: string;
  currency: string;
  featured: boolean;
  primary: MoneyStatsMetricFixture & { source: "live" | "fixture" };
  secondary: Array<MoneyStatsMetricFixture & { source: "live" | "fixture" }>;
  collectedRatio: number | null;
  collectedLabel: string | null;
  tone: InstrumentPlateTone;
  glyph: MoneyStatsPlateGlyphSignal;
};

function withLiveMetricTone<T extends MoneyStatsMetricFixture>(metric: T): T {
  return {
    ...metric,
    tone: moneyStatsLiveMetricTone(metric.id, metric.amount),
  };
}

function buildCardViewModel(card: MoneyStatsCardWithSource): MoneyStatsCardViewModel {
  const primary = withLiveMetricTone(
    card.metrics.find((metric) => metric.id === card.primaryMetricId) ?? card.metrics[0]!,
  );
  const secondary = card.metrics
    .filter((metric) => metric.id !== primary.id)
    .map((metric) => withLiveMetricTone(metric));

  let collectedRatio: number | null = null;
  let collectedLabel: string | null = null;
  if (card.id === "income-cash") {
    const total = card.metrics.find((metric) => metric.id === "total-income")?.amount ?? 0;
    const received = card.metrics.find((metric) => metric.id === "received")?.amount ?? 0;
    collectedRatio = total > 0 ? Math.min(1, Math.max(0, received / total)) : 0;
    collectedLabel = `${new Intl.NumberFormat(undefined, {
      style: "percent",
      maximumFractionDigits: 0,
    }).format(collectedRatio)} collected`;
  }

  const signal = moneyStatsPlateSignal(card.id, card.metrics, collectedRatio);

  return {
    id: card.id,
    title: card.title,
    currency: card.currency,
    featured: card.id === "income-cash",
    primary,
    secondary,
    collectedRatio,
    collectedLabel,
    tone: signal.tone,
    glyph: signal.glyph,
  };
}

type MoneyScoreboardPartyNavigate = Partial<Record<"party" | "status" | "expense", string | null>>;

type UseAgencyMoneyScoreboardArgs = {
  teamId: string;
  periodStart: string;
  periodEnd: string;
  isOwner: boolean;
  isRolePending: boolean;
  onNavigateParty: (updates: MoneyScoreboardPartyNavigate) => void;
  onOpenProfitLossShareSettings: () => void;
};

export function useAgencyMoneyScoreboard({
  teamId,
  periodStart,
  periodEnd,
  isOwner,
  isRolePending,
  onNavigateParty,
  onOpenProfitLossShareSettings,
}: UseAgencyMoneyScoreboardArgs) {
  const [lastStatsMetricSelection, setLastStatsMetricSelection] =
    useState<MoneyStatsMetricSelection | null>(null);

  const periodScoreboardQuery = useQuery({
    ...orpc.agencyOps.money.periodScoreboard.queryOptions({
      input: {
        teamId,
        periodStart,
        periodEnd,
      },
    }),
    enabled: Boolean(teamId) && isOwner,
  });

  const scoreboardStatus =
    isRolePending || periodScoreboardQuery.isPending
      ? "loading"
      : periodScoreboardQuery.isError
        ? "error"
        : periodScoreboardQuery.isSuccess && periodScoreboardQuery.data
          ? "ready"
          : "loading";
  const scoreboardErrorMessage = getErrorMessage(
    periodScoreboardQuery.error,
    "Try refreshing the period scoreboard.",
  );

  const statsCards = useMemo(() => {
    const board = periodScoreboardQuery.data;
    if (!board || scoreboardStatus !== "ready") return [];

    const liveMetrics: Partial<Record<MoneyStatsMetricId, number>> = {
      "total-income": amountToMajor(board.totalIncomeAmount),
      received: amountToMajor(board.receivedAmount),
      remaining: amountToMajor(board.remainingAmount),
      salaries: amountToMajor(board.salariesAmount),
      expenses: amountToMajor(board.expensesAmount),
      "debt-discount": amountToMajor(board.debtDiscountAmount),
      "paid-vacation": amountToMajor(board.paidVacationAmount),
      "team-profit": amountToMajor(board.teamProfitAmount),
      "profit-loss-share": amountToMajor(board.profitLossShareAmount),
      roi: board.roi,
      "device-compensation": amountToMajor(board.deviceCompensationAmount),
      charity: amountToMajor(board.charityAmount),
      pbc: amountToMajor(board.pbcAmount),
    };
    const sources = Object.fromEntries(
      Object.keys(liveMetrics).map((id) => [id, "live" as const]),
    ) as Partial<Record<MoneyStatsMetricId, "live" | "fixture">>;

    return buildMoneyStatsCards({
      currency: board.currency,
      metrics: liveMetrics,
      sources,
    }).map((card) => buildCardViewModel(card));
  }, [periodScoreboardQuery.data, scoreboardStatus]);

  const lastStatsMetricHint = useMemo(() => {
    if (!lastStatsMetricSelection) return null;
    const card = statsCards.find((item) => item.id === lastStatsMetricSelection.cardId);
    if (!card) return null;
    const metric =
      card.primary.id === lastStatsMetricSelection.metricId
        ? card.primary
        : card.secondary.find((item) => item.id === lastStatsMetricSelection.metricId);
    if (!metric) return null;
    return {
      label: metric.label,
      value: formatMoneyStatsMetricValue(metric.kind, metric.amount, card.currency),
      destination: moneyStatsMetricDestination(metric.id),
    };
  }, [lastStatsMetricSelection, statsCards]);

  const expensesPeriodSpendLabel = useMemo(() => {
    const board = periodScoreboardQuery.data;
    if (scoreboardStatus !== "ready" || !board) return null;
    return formatMoneyStatsMetricValue(
      "currency",
      amountToMajor(board.expensesAmount),
      board.currency,
    );
  }, [periodScoreboardQuery.data, scoreboardStatus]);

  const billsRemainingLabel = useMemo(() => {
    const board = periodScoreboardQuery.data;
    if (scoreboardStatus !== "ready" || !board) return null;
    return formatMoneyStatsMetricValue(
      "currency",
      amountToMajor(board.remainingAmount),
      board.currency,
    );
  }, [periodScoreboardQuery.data, scoreboardStatus]);

  function onSelectMetric(selection: MoneyStatsMetricSelection) {
    setLastStatsMetricSelection(selection);
    switch (selection.metricId) {
      case "total-income":
        onNavigateParty({ party: "client", status: null });
        break;
      case "received":
        onNavigateParty({ party: "client", status: "paid" });
        break;
      case "remaining":
        onNavigateParty({ party: "client", status: "outstanding" });
        break;
      case "salaries":
      case "paid-vacation":
      case "device-compensation":
        onNavigateParty({ party: "team", status: null });
        break;
      case "expenses":
        onNavigateParty({ party: "expenses", status: null, expense: null });
        break;
      case "debt-discount":
      case "charity":
      case "pbc":
        onNavigateParty({ party: "adjustments", status: null });
        break;
      case "profit-loss-share":
        onOpenProfitLossShareSettings();
        return;
      case "team-profit":
      case "roi":
        onNavigateParty({ party: "adjustments", status: null });
        break;
      default: {
        const _exhaustive: never = selection.metricId;
        void _exhaustive;
      }
    }
    window.requestAnimationFrame(() => {
      const panelHeading = document.getElementById("money-bills-panel-heading");
      panelHeading?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
      panelHeading?.focus({ preventScroll: true });
    });
  }

  return {
    periodScoreboardQuery,
    scoreboardStatus,
    scoreboardErrorMessage,
    statsCards,
    lastStatsMetricHint,
    expensesPeriodSpendLabel,
    billsRemainingLabel,
    currency: periodScoreboardQuery.data?.currency ?? "USD",
    currencyOptional: periodScoreboardQuery.data?.currency,
    onRetryScoreboard: () => void periodScoreboardQuery.refetch(),
    onSelectMetric,
  };
}
