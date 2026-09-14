import { type KeyboardEvent } from "react";
import { motion } from "motion/react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { agencyErrorPanelClass } from "@/features/shared/agency-ui";
import {
  expenseStatusVariant,
  expenseStripMeta,
  moneyExpenseSettleLabel,
  type ExpenseStripItem,
} from "@/features/money/money-expenses-strip";
import { ExpenseStripGlyph } from "@/features/money/money-expense-strip-glyphs";
import { moneyBaseTransition } from "@/features/money/money-motion";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { cn } from "@/lib/utils";

import { AgencyMoneyExpenseDetailSheet } from "./agency-money-expense-detail-sheet-view";
import { MoneyTableActionsCell } from "./agency-money-table-actions-view";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

function ExpenseStatusBadge({ item }: { item: ExpenseStripItem }) {
  return <Badge variant={expenseStatusVariant(item.status)}>{item.statusLabel}</Badge>;
}

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
  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, rowId: string) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpenExpenseRow(rowId);
  }

  return (
    <div className="px-4 pt-4">
      <div className="overflow-x-auto rounded-surface border border-default/55 bg-default">
        <Table className="min-w-[48rem]" aria-label="Expenses">
          <TableHeader className="border-b border-default/50">
            <TableRow>
              <TableHead scope="col">Expense</TableHead>
              <TableHead scope="col">Kind</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col">Due</TableHead>
              <TableHead scope="col" className="w-32 text-right">
                Amount
              </TableHead>
              <TableHead scope="col" className="w-32 text-right">
                Remaining
              </TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                tabIndex={0}
                aria-label={`${item.name}. ${item.statusLabel}. Remaining ${item.remainingLabel}.`}
                aria-selected={selectedRowId === item.id}
                className={cn(
                  "cursor-pointer border-b border-default transition-colors last:border-b-0 hover:bg-elevated/35 focus-visible:bg-elevated/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  selectedRowId === item.id && "bg-elevated/40",
                )}
                onClick={() => onOpenExpenseRow(item.id)}
                onKeyDown={(event) => onRowKeyDown(event, item.id)}
              >
                <TableCell>
                  <div className="flex min-w-48 items-center gap-2.5">
                    <ExpenseStripGlyph kind={item.kind} />
                    <span className="min-w-0 truncate font-medium text-highlighted" dir="auto">
                      <AgencySearchHighlight text={item.name} query={searchTerm} />
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted">
                  {item.kind === "subscription" ? "Subscription" : "One-time"}
                </TableCell>
                <TableCell>
                  <ExpenseStatusBadge item={item} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted">
                  <AgencySearchHighlight text={expenseStripMeta(item)} query={searchTerm} />
                </TableCell>
                <TableCell
                  className={cn(
                    "whitespace-nowrap text-right font-mono tabular-nums",
                    item.status === "paid" ? "text-muted" : "text-highlighted",
                  )}
                >
                  {item.amountLabel}
                </TableCell>
                <TableCell
                  className={cn(
                    "whitespace-nowrap text-right font-mono tabular-nums",
                    item.remainingAmount > 0 ? "text-warning" : "text-muted",
                  )}
                >
                  {item.remainingLabel}
                </TableCell>
                <MoneyTableActionsCell
                  settleLabel={moneyExpenseSettleLabel(item)}
                  settleDisabled={settleDisabled}
                  onSettle={() => onSettleExpense(item.expenseId)}
                  detailsLabel={`Details for ${item.name}`}
                  onOpenDetails={() => onOpenExpenseRow(item.id)}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ExpenseTableSkeleton() {
  return (
    <div className="px-4 pt-4">
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
      <div className="flex flex-col">
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

      <AgencyMoneyExpenseDetailSheet panel={panel} />
    </>
  );
}

export { MoneyExpensesPanelContent };
