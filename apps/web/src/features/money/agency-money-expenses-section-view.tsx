import { motion } from "motion/react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { agencyErrorPanelClass } from "@/features/shared/agency-ui";
import { type ExpenseStripItem } from "@/features/money/money-expenses-strip";
import { moneyBaseTransition } from "@/features/money/money-motion";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

import { AgencyMoneyExpenseDetailDialog } from "./agency-money-expense-detail-dialog-view";
import { AgencyMoneyLedgerTableView } from "./agency-money-ledger-table-view";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";
import { buildMoneyLedgerExpenseParents } from "./money-ledger-rows";

const EMPTY_EXPANDED: ReadonlySet<string> = new Set();

function ExpenseTable({
  items,
  searchTerm,
  selectedRowId,
  settleDisabled,
  onOpenExpenseRow,
  onSettleExpense,
}: {
  items: ExpenseStripItem[];
  searchTerm: string;
  selectedRowId: string | null;
  settleDisabled: boolean;
  onOpenExpenseRow: (rowId: string) => void;
  onSettleExpense: (expenseId: string) => void;
}) {
  const rows = buildMoneyLedgerExpenseParents(items);
  const itemsById = new Map(items.map((item) => [item.id, item]));

  return (
    <div className="min-h-0 flex-1">
      <AgencyMoneyLedgerTableView
        ariaLabel="Expenses"
        rows={rows}
        searchTerm={searchTerm}
        receivedHeading="Paid"
        showPartyGlyph={false}
        isMutationPending={settleDisabled}
        selectedRowId={selectedRowId}
        expandedRowIds={EMPTY_EXPANDED}
        onToggleExpand={() => undefined}
        onOpenRow={onOpenExpenseRow}
        onSettle={(rowId) => {
          const item = itemsById.get(rowId);
          if (item) onSettleExpense(item.expenseId);
        }}
        onOverflow={() => undefined}
      />
    </div>
  );
}

function ExpenseTableSkeleton() {
  return (
    <div className="p-4">
      <SurfaceShimmer className="min-h-64" label="Loading expenses" />
    </div>
  );
}

function MoneyExpensesPanelContent({
  panel,
  searchTerm,
}: {
  panel: AgencyMoneySurfaceViewModel["bills"]["expensesPanel"];
  searchTerm: string;
}) {
  const create = panel.create;
  const payment = panel.payment;
  const strip = panel.strip;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {panel.status === "loading" ? (
          <ExpenseTableSkeleton />
        ) : panel.status === "error" ? (
          <div className={cn(agencyErrorPanelClass, "m-5")} role="alert">
            <p className="text-sm font-medium text-highlighted">Couldn’t load expenses</p>
            <p className="mt-1 text-xs text-muted">{panel.errorMessage}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={panel.onRetry}
            >
              Retry
            </Button>
          </div>
        ) : strip.items.length > 0 ? (
          <ExpenseTable
            items={strip.items}
            searchTerm={searchTerm}
            selectedRowId={panel.selectedRowId}
            settleDisabled={create.isPending || payment.isPending}
            onOpenExpenseRow={panel.onOpenExpenseRow}
            onSettleExpense={panel.onOpenPayment}
          />
        ) : strip.empty ? (
          <motion.div
            key={`${strip.filter}-empty`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={moneyBaseTransition}
            className="mx-5 my-6 rounded-2xl border border-dashed border-default px-4 py-8 text-center"
          >
            <p className="text-sm font-semibold text-highlighted text-balance">
              <AgencySearchHighlight text={strip.empty.title} query={searchTerm} />
            </p>
            <p className="mt-1 text-xs text-muted text-balance">
              <AgencySearchHighlight text={strip.empty.body} query={searchTerm} />
            </p>
            {!searchTerm.trim() && strip.filter === "all" ? (
              <Button type="button" size="sm" className="mt-3" onClick={panel.onOpenCreate}>
                Add expense
              </Button>
            ) : null}
          </motion.div>
        ) : null}
      </div>

      <AgencyMoneyExpenseDetailDialog panel={panel} />
    </>
  );
}

export { MoneyExpensesPanelContent };
