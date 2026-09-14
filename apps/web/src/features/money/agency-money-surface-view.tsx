import { Settings } from "lucide-react";

import { RangePresetChooser } from "@/features/shared/command-bar/range-preset-chooser";
import { MemberProfileLeaveRangePicker } from "@/features/shared/date/member-profile-leave-range-picker";
import {
  agencyErrorPanelClass,
  agencyLabelClass,
  agencyPanelClass,
  agencySectionTitleClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

import { BillsSection } from "./agency-money-bills-section-view";
import { MoneySettingsDialog } from "./agency-money-settings-dialog-view";
import { MoneyStatsSection } from "./agency-money-stats-section-view";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

type AgencyMoneySurfaceViewProps = {
  viewModel: AgencyMoneySurfaceViewModel;
};

export function AgencyMoneySurfaceView({ viewModel }: AgencyMoneySurfaceViewProps) {
  const {
    title,
    subtitle,
    period,
    statsCards,
    lastStatsMetricHint,
    onSelectMetric,
    moneySettings,
    bills,
    periodFx,
    isOwner,
    isRolePending,
    isRoleError,
    roleErrorMessage,
    onRetryRole,
    onOpenPeople,
    scoreboardStatus,
    scoreboardErrorMessage,
    onRetryScoreboard,
  } = viewModel;

  if (isRolePending) {
    return <SurfaceShimmer className="min-h-[32rem]" label="Loading money" />;
  }

  return (
    <div className="shimmer-container flex min-h-0 min-w-0 flex-1 flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={cn(agencySectionTitleClass, "text-balance")}>{title}</h1>
          {subtitle ? (
            <p className={cn(agencyLabelClass, "text-muted-foreground max-w-xl text-balance")}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {isOwner ? (
          <div className="flex flex-wrap items-center gap-2">
            {moneySettings.onOpen ? (
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-xl"
                      onClick={moneySettings.onOpen}
                      aria-label="Money settings"
                    >
                      <Settings className="size-4" aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Money settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            <RangePresetChooser
              value={period.rangePreset}
              onChange={period.onRangePresetChange}
              tenureAvailable={period.tenureAvailable}
              tenurePeriodLabel={period.tenurePeriodLabel}
              tenureQuarterLabel={period.tenureQuarterLabel}
              tenureQuarterMonths={period.tenureQuarterMonths}
              tenureMonthIndexes={period.tenureMonthIndexes}
              onTenureMonthIndexesChange={period.onTenureMonthIndexesChange}
            />
            {period.rangePreset === "custom" ? (
              <MemberProfileLeaveRangePicker
                triggerId="money-period-custom-range"
                startDate={period.customFromDate}
                endDate={period.customToDate}
                emptyLabel="Select period dates"
                ariaLabel="Custom period date range"
                triggerClassName="h-9 min-h-9 w-auto max-w-[22rem] py-1.5 text-xs"
                onRangeChange={(next) => {
                  period.onCustomFromChange(next.startDate);
                  period.onCustomToChange(next.endDate);
                }}
              />
            ) : null}
          </div>
        ) : null}
      </header>

      {isRoleError ? (
        <section className={agencyErrorPanelClass} role="alert">
          <h2 className="text-base font-semibold text-highlighted">Couldn’t check Money access</h2>
          <p className="mt-1 text-sm text-muted">{roleErrorMessage}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetryRole}>
            Retry
          </Button>
        </section>
      ) : !isOwner ? (
        <section
          className={cn(agencyPanelClass, "flex flex-col items-start gap-1 p-6")}
          aria-label="Money access"
        >
          <h2 className="text-base font-semibold text-highlighted">Owners manage Money</h2>
          <p className="text-sm text-muted">
            Ask a team owner to review bills, payouts, expenses, and Money settings.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onOpenPeople}>
            Open People
          </Button>
        </section>
      ) : (
        <>
          <MoneyStatsSection
            status={scoreboardStatus}
            errorMessage={scoreboardErrorMessage}
            statsCards={statsCards}
            onSelectMetric={onSelectMetric}
            onRetry={onRetryScoreboard}
            metricHint={lastStatsMetricHint}
            periodFx={periodFx}
          />
          <BillsSection bills={bills} periodFx={periodFx} />
          <MoneySettingsDialog settings={moneySettings} />
        </>
      )}
    </div>
  );
}
