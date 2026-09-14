import { ChevronDown, FileText, Plus, Receipt, Search, SlidersHorizontal, X } from "lucide-react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import {
  moneyBillsSalaryPoolDetailVisible,
  type MoneyBillsPartyFilter,
  type MoneyBillsStatusFilter,
} from "@/features/billing/money-bills-filters";
import {
  moneyBillComposeListInsight,
  type MoneyBillPersonGroup,
} from "@/features/billing/money-bill-obligation-rows";
import { type MoneyBillAdjustmentRow } from "@/features/billing/money-bills-rows";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { SurfaceShimmer } from "@/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { MoneyExpensesPanelContent } from "./agency-money-expenses-section-view";
import { AgencyMoneyBillDetailSheet } from "./agency-money-bill-detail-sheet-view";
import { AgencyMoneyBillsDialogs } from "./agency-money-bills-dialogs-view";
import { AgencyMoneyBillsTablesView } from "./agency-money-bills-tables-view";
import { AgencyMoneyExpenseDialogs } from "./agency-money-expense-dialogs-view";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";
import {
  moneyPanelHeaderClass,
  MoneyPanelMetricBlock,
  MoneyPanelTitleRow,
  MoneyPeriodFxLine,
} from "./money-panel-chrome";

function ActiveBillFilterChip({
  label,
  clearLabel,
  onClear,
}: {
  label: string;
  clearLabel: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-0.5 rounded-full bg-elevated py-0 pl-2.5 pr-0.5 text-xs font-medium text-highlighted ring-1 ring-border">
      <span className="max-w-40 truncate">{label}</span>
      <button
        type="button"
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150",
          "hover:bg-default hover:text-highlighted",
          "motion-reduce:transition-none",
          agencyFocusRingClass,
        )}
        onClick={onClear}
        aria-label={clearLabel}
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

function BillsTableSkeleton() {
  return (
    <div className="px-4 pt-4">
      <SurfaceShimmer className="min-h-64" label="Loading this period's bills" />
    </div>
  );
}

function MoneyBillsCreateMenu({
  onOpenInvoice,
  onOpenAdjustment,
  onOpenExpense,
}: {
  onOpenInvoice: () => void;
  onOpenAdjustment: () => void;
  onOpenExpense: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 rounded-xl px-3 sm:h-9"
          aria-label="Add"
        >
          <Plus className="size-4" aria-hidden />
          <span>Add</span>
          <ChevronDown className="size-3.5 text-muted" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => window.setTimeout(onOpenInvoice, 0)}>
          <FileText className="size-4" aria-hidden />
          Invoice
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.setTimeout(onOpenAdjustment, 0)}>
          <SlidersHorizontal className="size-4" aria-hidden />
          Adjustment
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.setTimeout(onOpenExpense, 0)}>
          <Receipt className="size-4" aria-hidden />
          Expense
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BillsSection({
  bills,
  periodFx,
}: {
  bills: AgencyMoneySurfaceViewModel["bills"];
  periodFx: AgencyMoneySurfaceViewModel["periodFx"];
}) {
  const isExpensesParty = bills.partyFilter === "expenses";
  const panelTitle = isExpensesParty ? "Expenses" : "Bills";
  const expensesPanel = bills.expensesPanel;
  const hasStatusFilters = !isExpensesParty && bills.statusOptions.length > 0;
  const hasExpenseFilters = isExpensesParty && expensesPanel.status === "ready";
  const showExternalClientFilter =
    (bills.partyFilter === "all" || bills.partyFilter === "client") &&
    bills.clientCategoryFilter === "external";
  const visibleSalaryPool = moneyBillsSalaryPoolDetailVisible(
    bills.partyFilter,
    Boolean(bills.salaryPool.pool),
  )
    ? bills.salaryPool
    : { ...bills.salaryPool, pool: null };
  const showEmpty =
    !isExpensesParty &&
    !bills.isLoading &&
    !bills.isError &&
    bills.rows.length === 0 &&
    !visibleSalaryPool.pool;
  const emptyAction =
    bills.partyFilter === "adjustments" || bills.partyFilter === "team"
      ? { label: "Add adjustment or cost", onClick: bills.createMenu.onOpenAdjustment }
      : { label: "Create invoice", onClick: bills.createMenu.onOpenInvoice };
  const clientGroups = bills.rows.filter(
    (row): row is MoneyBillPersonGroup => row.kind === "person-group" && row.party === "client",
  );
  const teamGroups = bills.rows.filter(
    (row): row is MoneyBillPersonGroup => row.kind === "person-group" && row.party === "team",
  );
  const adjustments = bills.rows.filter(
    (row): row is MoneyBillAdjustmentRow => row.kind === "adjustment",
  );
  const insight = isExpensesParty
    ? expensesPanel.strip.insight
    : moneyBillComposeListInsight(bills.rows);
  const metricLabel = isExpensesParty ? "Period spend" : "Remaining";
  const metricValue = isExpensesParty ? expensesPanel.periodSpendLabel : bills.remainingLabel;

  return (
    <section
      className={cn(agencyPanelClass, "flex shrink-0 flex-col overflow-hidden")}
      aria-labelledby="money-bills-panel-heading"
    >
      <div className={moneyPanelHeaderClass}>
        <MoneyPanelTitleRow
          title={panelTitle}
          headingId="money-bills-panel-heading"
          headingTabIndex={-1}
        >
          <div className="flex min-w-48 flex-1 items-center gap-2 sm:max-w-md sm:flex-none">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={bills.searchTerm}
                onChange={(event) => bills.onSearchTermChange(event.target.value)}
                placeholder={isExpensesParty ? "Search expenses" : "Search bills"}
                aria-label={isExpensesParty ? "Search expenses" : "Search bills"}
                className={cn(
                  "h-9 rounded-xl border-default bg-default pl-9 text-sm",
                  agencyInputPlaceholderClass,
                  bills.searchTerm.trim() ? "text-highlighted" : undefined,
                )}
              />
            </div>
          </div>
          <MoneyBillsCreateMenu
            onOpenInvoice={bills.createMenu.onOpenInvoice}
            onOpenAdjustment={bills.createMenu.onOpenAdjustment}
            onOpenExpense={bills.createMenu.onOpenExpense}
          />
        </MoneyPanelTitleRow>

        <MoneyPeriodFxLine
          label={periodFx.label}
          canApplyCurrent={periodFx.canApplyCurrent}
          applying={periodFx.applying}
          onApplyCurrent={periodFx.onApplyCurrent}
        />

        {metricValue || insight ? (
          <MoneyPanelMetricBlock label={metricLabel} value={metricValue} hint={insight} />
        ) : null}

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <Tabs
              value={bills.partyFilter}
              onValueChange={(value) => bills.onPartyFilterChange(value as MoneyBillsPartyFilter)}
            >
              <TabsList aria-label="Bill party" className="min-w-max">
                {bills.partyOptions.map((option) => (
                  <TabsTrigger key={option.id} value={option.id} className="px-3 text-xs">
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          {hasStatusFilters ? (
            <>
              <label htmlFor="money-bills-status-filter" className="sr-only">
                Status
              </label>
              <Select
                value={bills.statusFilter ?? "all"}
                onValueChange={(value) => {
                  if (value === "all") {
                    bills.onClearStatusFilter();
                    return;
                  }
                  bills.onStatusFilterChange(value as MoneyBillsStatusFilter);
                }}
              >
                <SelectTrigger
                  id="money-bills-status-filter"
                  size="sm"
                  className="ml-auto shrink-0 bg-default"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">All statuses</SelectItem>
                  {bills.statusOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : null}
          {hasExpenseFilters ? (
            <>
              <label htmlFor="money-expenses-filter" className="sr-only">
                Expense filter
              </label>
              <Select
                value={expensesPanel.strip.filter}
                onValueChange={(value) =>
                  expensesPanel.strip.onFilterChange(value as typeof expensesPanel.strip.filter)
                }
              >
                <SelectTrigger
                  id="money-expenses-filter"
                  size="sm"
                  className="ml-auto shrink-0 bg-default"
                >
                  <SelectValue placeholder="All expenses" />
                </SelectTrigger>
                <SelectContent align="end">
                  {expensesPanel.strip.filterOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : null}
          {showExternalClientFilter ? (
            <ActiveBillFilterChip
              label="External"
              clearLabel="Show internal clients too"
              onClear={bills.onClearClientCategoryFilter}
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col pb-5">
        {isExpensesParty ? (
          <MoneyExpensesPanelContent panel={expensesPanel} searchTerm={bills.searchTerm} />
        ) : null}

        {!isExpensesParty && bills.isLoading ? <BillsTableSkeleton /> : null}

        {!isExpensesParty && bills.isError ? (
          <div className={cn(agencyErrorPanelClass, "m-4")} role="alert">
            <p className="text-sm font-medium text-highlighted">Couldn’t load bills</p>
            <p className="mt-1 text-xs text-muted">{bills.errorMessage}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={bills.onRetry}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!isExpensesParty &&
        !bills.isLoading &&
        !bills.isError &&
        (bills.rows.length > 0 || visibleSalaryPool.pool) ? (
          <AgencyMoneyBillsTablesView
            clientGroups={clientGroups}
            teamGroups={teamGroups}
            adjustments={adjustments}
            salaryPool={visibleSalaryPool}
            searchTerm={bills.searchTerm}
            isMutationPending={bills.isMutationPending}
            selectedRowId={bills.selectedRowId}
            onOpenRow={bills.onOpenRow}
            onOpenSalaryPool={bills.onOpenSalaryPool}
            onSettleGroup={bills.onOpenAdjust}
            onSettleAdjustment={(row) => {
              if (row.canRecordPayment) {
                bills.onOpenPayment(row.id);
                return;
              }
              bills.onMarkPaid(row.id);
            }}
          />
        ) : null}

        {showEmpty ? (
          <div className="mx-4 mt-4 flex flex-col items-center gap-2 rounded-surface border border-default bg-default px-surface py-surface text-center">
            <Receipt className="size-6 text-muted" aria-hidden />
            <p className="text-sm font-semibold text-highlighted">
              <AgencySearchHighlight text={bills.emptyCopy.title} query={bills.searchTerm} />
            </p>
            <p className="max-w-sm text-xs text-muted text-balance">
              <AgencySearchHighlight text={bills.emptyCopy.body} query={bills.searchTerm} />
            </p>
            {!bills.searchTerm.trim() ? (
              <Button type="button" size="sm" className="mt-1" onClick={emptyAction.onClick}>
                {emptyAction.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <AgencyMoneyBillDetailSheet bills={bills} />
      <AgencyMoneyBillsDialogs bills={bills} />
      <AgencyMoneyExpenseDialogs panel={expensesPanel} />
    </section>
  );
}

export { BillsSection };
