import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/navigation";

import {
  agencyManagementPaneLabel,
  agencyManagementPaneSubtitle,
} from "@/features/shared/agency-management-sections";
import { parseAgencyPeriodQuery } from "@/features/shared/agency-period-query";
import { useAgencyPeriodState } from "@/features/shared/use-agency-period-state";
import {
  moneyBillsPartyFilterFromSearch,
  moneyBillsStatusAllowed,
  moneyBillsStatusFilterFromSearch,
} from "@/features/billing/money-bills-filters";
import { expenseStripFilterFromSearch } from "@/features/money/money-expenses-strip";
import { useAgencyMoneyBills } from "@/features/money/hooks/use-agency-money-bills";
import { useAgencyMoneyExpensesPanel } from "@/features/money/hooks/use-agency-money-expenses-panel";
import { useAgencyMoneyScoreboard } from "@/features/money/hooks/use-agency-money-scoreboard";
import { useAgencyMoneySettings } from "@/features/money/hooks/use-agency-money-settings";
import { formatPeriodFxLockLabel } from "@/features/money/money-period-fx-label";
import {
  selectIsInvoiceMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { orpc } from "@/lib/orpc";
export type {
  MoneyStatsCardViewModel,
  MoneyStatsMetricSelection,
} from "@/features/money/hooks/use-agency-money-scoreboard";

export type AgencyMoneySurfaceViewModel = ReturnType<typeof useAgencyMoneySurface>;

export function useAgencyMoneySurface(teamId: string) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPeriodSeed = useMemo(
    () => parseAgencyPeriodQuery(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from the landing URL
    [],
  );

  const periodState = useAgencyPeriodState({
    teamId,
    initialCustomRange: initialPeriodSeed,
  });
  const {
    range: periodRange,
    label: periodLabel,
    rangePreset: effectiveRangePreset,
    onRangePresetChange: setRangePreset,
    customFromDate,
    onCustomFromChange: setCustomFromDate,
    customToDate,
    onCustomToChange: setCustomToDate,
    tenureAvailable,
    tenurePeriodLabel,
    tenureQuarterLabel,
    tenureQuarterMonths,
    tenureMonthIndexes: effectiveTenureMonthIndexes,
    onTenureMonthIndexesChange: setTenureMonthIndexes,
  } = periodState;

  const partyFilter = moneyBillsPartyFilterFromSearch(searchParams.get("party"));
  const parsedStatusFilter = moneyBillsStatusFilterFromSearch(searchParams.get("status"));
  const statusFilter =
    parsedStatusFilter && moneyBillsStatusAllowed(partyFilter, parsedStatusFilter)
      ? parsedStatusFilter
      : null;
  const expenseStripFilter = expenseStripFilterFromSearch(searchParams.get("expense"));
  const searchTerm = searchParams.get("q") ?? "";
  const [remoteSearchTerm, setRemoteSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = window.setTimeout(() => setRemoteSearchTerm(searchTerm), 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  function updateMoneySearch(
    updates: Partial<Record<"party" | "status" | "expense" | "q", string | null>>,
    replace = true,
  ) {
    setSearchParams(
      (current) => {
        for (const [key, value] of Object.entries(updates)) {
          if (value) current.set(key, value);
          else current.delete(key);
        }
        return current;
      },
      { replace },
    );
  }

  const teamQuery = useQuery({
    ...orpc.team.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const isOwner = teamQuery.data?.role === "owner";
  const isRolePending = teamQuery.isPending;
  const isRoleError = teamQuery.isError;
  const canManageMoney = isOwner;

  // Scoreboard needs settings.openProfitLossShareSettings; settings needs scoreboard.currency.
  // Bridge with a ref so each hook is called once in a stable order.
  const openProfitLossShareSettingsRef = useRef<() => void>(() => {});

  const scoreboard = useAgencyMoneyScoreboard({
    teamId,
    periodStart: periodRange.from,
    periodEnd: periodRange.to,
    isOwner,
    isRolePending,
    onNavigateParty: (updates) => updateMoneySearch(updates, false),
    onOpenProfitLossShareSettings: () => openProfitLossShareSettingsRef.current(),
  });

  const { moneySettings, openProfitLossShareSettings } = useAgencyMoneySettings({
    teamId,
    periodStart: periodRange.from,
    periodEnd: periodRange.to,
    isOwner,
    scoreboardCurrency: scoreboard.currency,
  });
  openProfitLossShareSettingsRef.current = openProfitLossShareSettings;

  const expenses = useAgencyMoneyExpensesPanel({
    teamId,
    periodStart: periodRange.from,
    periodEnd: periodRange.to,
    isOwner,
    expenseStripFilter,
    searchTerm,
    expensesPeriodSpendLabel: scoreboard.expensesPeriodSpendLabel,
    updateMoneySearch,
  });

  const bills = useAgencyMoneyBills({
    teamId,
    periodStart: periodRange.from,
    periodEnd: periodRange.to,
    periodLabel,
    isOwner,
    canManageMoney,
    partyFilter,
    statusFilter,
    searchTerm,
    remoteSearchTerm,
    scoreboardCurrency: scoreboard.currency,
    scoreboardCurrencyOptional: scoreboard.currencyOptional,
    billsRemainingLabel: scoreboard.billsRemainingLabel,
    expensesStatus: expenses.expensesStatus,
    expensesErrorMessage: expenses.expensesErrorMessage,
    onOpenExpenseCreate: expenses.onOpenExpenseCreate,
    refetchExpenses: expenses.refetchExpenses,
    updateMoneySearch,
  });

  const periodFxQuery = useQuery({
    ...orpc.agencyOps.fxRates.listPeriod.queryOptions({
      input: {
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
      },
    }),
    enabled: Boolean(teamId) && isOwner,
  });
  const applyCurrentFxToPeriod = useAgencyOpsStore((state) => state.applyCurrentFxToPeriod);
  const applyingPeriodFx = useAgencyOpsStore(selectIsInvoiceMutationPending);
  const periodFx = {
    label: formatPeriodFxLockLabel(periodFxQuery.data?.items ?? []),
    canApplyCurrent: Boolean(isOwner && periodFxQuery.data?.canApplyCurrent),
    applying: applyingPeriodFx,
    onApplyCurrent: () => {
      if (!teamId || !periodFxQuery.data?.canApplyCurrent) return;
      void applyCurrentFxToPeriod({
        teamId,
        periodStart: periodRange.from,
        periodEnd: periodRange.to,
      });
    },
  };

  return {
    teamId,
    isOwner,
    isRolePending,
    isRoleError,
    roleErrorMessage: getErrorMessage(teamQuery.error, "Try again."),
    onRetryRole: () => void teamQuery.refetch(),
    onOpenPeople: () => navigate("/agency/management/people"),
    canManageMoney,
    title: agencyManagementPaneLabel("money"),
    subtitle: agencyManagementPaneSubtitle("money"),
    period: {
      rangePreset: effectiveRangePreset,
      onRangePresetChange: setRangePreset,
      customFromDate,
      onCustomFromChange: setCustomFromDate,
      customToDate,
      onCustomToChange: setCustomToDate,
      tenureAvailable,
      tenurePeriodLabel,
      tenureQuarterLabel,
      tenureQuarterMonths,
      tenureMonthIndexes: effectiveTenureMonthIndexes,
      onTenureMonthIndexesChange: setTenureMonthIndexes,
      label: periodLabel,
    },
    statsCards: scoreboard.statsCards,
    lastStatsMetricHint: scoreboard.lastStatsMetricHint,
    scoreboardStatus: scoreboard.scoreboardStatus,
    scoreboardErrorMessage: scoreboard.scoreboardErrorMessage,
    onRetryScoreboard: scoreboard.onRetryScoreboard,
    onSelectMetric: scoreboard.onSelectMetric,
    moneySettings,
    bills: {
      ...bills,
      expensesPanel: expenses.expensesPanel,
    },
    periodFx,
  };
}
