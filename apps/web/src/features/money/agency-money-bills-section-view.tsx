import { ChevronDown, FileText, Plus, Receipt, SlidersHorizontal, X } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyErrorPanelClass,
  agencyFocusRingClass,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { SurfaceShimmer } from "@/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { MoneyExpensesPanelContent } from "./agency-money-expenses-section-view";
import { AgencyMoneyBillDetailDialog } from "./agency-money-bill-detail-dialog-view";
import { AgencyMoneyBillsDialogs } from "./agency-money-bills-dialogs-view";
import { AgencyMoneyBillsTablesView } from "./agency-money-bills-tables-view";
import { AgencyMoneyExpenseDialogs } from "./agency-money-expense-dialogs-view";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";
import { moneyBaseTransition } from "./money-motion";
import {
  moneyPanelHeaderClass,
  MoneyPanelHeading,
  MoneyPanelNorthStar,
  MoneyPanelSearchField,
  MoneyPanelToolbar,
} from "./money-panel-chrome";

function MoneyPartyPills({
  value,
  options,
  onChange,
}: {
  value: MoneyBillsPartyFilter;
  options: AgencyMoneySurfaceViewModel["bills"]["partyOptions"];
  onChange: (party: MoneyBillsPartyFilter) => void;
}) {
  return (
    <LayoutGroup>
      <div
        className="inline-flex min-w-max items-center gap-0.5 rounded-full bg-default p-0.5 ring-1 ring-border"
        role="tablist"
        aria-label="Bill party"
      >
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                "relative h-7 rounded-full px-3 text-xs font-medium",
                selected ? "text-highlighted" : "text-muted hover:text-highlighted",
                agencyFocusRingClass,
              )}
              onClick={() => onChange(option.id)}
            >
              {selected ? (
                <motion.span
                  layoutId="money-ledger-party-bg"
                  className="absolute inset-0 rounded-full bg-elevated shadow-sm"
                  transition={moneyBaseTransition}
                />
              ) : null}
              <span className="relative z-10">{option.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

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
    <div className="p-4">
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

function BillsSection({ bills }: { bills: AgencyMoneySurfaceViewModel["bills"] }) {
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
      className={cn(
        agencyPanelClass,
        "flex flex-col overflow-hidden max-xl:shrink-0 xl:min-h-0 xl:flex-1",
      )}
      aria-labelledby="money-bills-panel-heading"
    >
      <div className={moneyPanelHeaderClass}>
        <MoneyPanelHeading
          title={panelTitle}
          headingId="money-bills-panel-heading"
          headingTabIndex={-1}
        >
          <MoneyBillsCreateMenu
            onOpenInvoice={bills.createMenu.onOpenInvoice}
            onOpenAdjustment={bills.createMenu.onOpenAdjustment}
            onOpenExpense={bills.createMenu.onOpenExpense}
          />
        </MoneyPanelHeading>

        {metricValue ? (
          <MoneyPanelNorthStar
            value={metricValue}
            label={metricLabel}
            hint={insight ?? undefined}
          />
        ) : insight ? (
          <p className="max-w-2xl text-xs text-muted text-balance" aria-live="polite">
            {insight}
          </p>
        ) : null}

        <MoneyPanelToolbar
          start={
            <MoneyPartyPills
              value={bills.partyFilter}
              options={bills.partyOptions}
              onChange={bills.onPartyFilterChange}
            />
          }
          end={
            <>
              <MoneyPanelSearchField
                value={bills.searchTerm}
                onChange={bills.onSearchTermChange}
                placeholder={isExpensesParty ? "Search expenses" : "Search bills"}
                ariaLabel={isExpensesParty ? "Search expenses" : "Search bills"}
              />
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
                      className="h-9 shrink-0 bg-default"
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
                      className="h-9 shrink-0 bg-default"
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
            </>
          }
        />
      </div>

      <motion.div
        key={bills.partyFilter}
        className="flex min-h-0 flex-1 flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={moneyBaseTransition}
      >
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
            showPartyGlyph={bills.partyFilter === "all"}
            expandedRowIds={bills.expandedLedgerIds}
            onToggleExpand={bills.onToggleLedgerExpand}
            onOpenRow={bills.onOpenRow}
            onOpenSalaryPool={bills.onOpenSalaryPool}
            onSettleGroup={bills.onOpenAdjust}
            onSettleGroupLine={(group, lineId) => {
              const line = group.lines.find((item) => item.id === lineId);
              if (line) bills.onOpenAdjustLine(group, line);
            }}
            onSettleAdjustment={(row) => {
              if (row.canRecordPayment) {
                bills.onOpenPayment(row.id);
                return;
              }
              bills.onMarkPaid(row.id);
            }}
            onOverflow={(rowId, action, childId) => {
              const group =
                clientGroups.find((item) => item.id === rowId) ??
                teamGroups.find((item) => item.id === rowId);
              if (!group) return;
              const line = childId ? group.lines.find((item) => item.id === childId) : undefined;
              switch (action) {
                case "preview":
                  if (line) {
                    bills.onOpenPreviewLine(group, line);
                    return;
                  }
                  bills.onOpenPreview(group);
                  return;
                case "adjust":
                  if (line) {
                    bills.onOpenAdjustLine(group, line, { tab: "adjustments" });
                    return;
                  }
                  bills.onAddAdjustment(group);
                  return;
                case "send": {
                  const sendLine =
                    line ??
                    group.lines.find(
                      (item) =>
                        item.obligationKind === "invoice" && item.statusLabel === "Outstanding",
                    );
                  if (sendLine) bills.onSend(sendLine.id);
                  return;
                }
                default: {
                  const _exhaustive: never = action;
                  void _exhaustive;
                }
              }
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
      </motion.div>

      <AgencyMoneyBillDetailDialog bills={bills} />
      <AgencyMoneyBillsDialogs bills={bills} />
      <AgencyMoneyExpenseDialogs panel={expensesPanel} />
    </section>
  );
}

export { BillsSection };
