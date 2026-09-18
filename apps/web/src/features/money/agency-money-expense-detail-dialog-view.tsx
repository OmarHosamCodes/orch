import { moneyBillsSheetCaption } from "@/features/billing/money-bills-table-columns";
import {
  expenseStripMeta,
  findExpenseStripItem,
  type ExpenseStripItem,
} from "@/features/money/money-expenses-strip";
import { Button } from "@/ui/button";

import { AgencyMoneyLedgerTableView } from "./agency-money-ledger-table-view";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";
import { buildMoneyLedgerExpenseParents } from "./money-ledger-rows";
import {
  MoneyObligationDialog,
  MoneyObligationDialogActions,
  MoneyObligationDialogBody,
  MoneyObligationDialogFooter,
  MoneyObligationDialogHeader,
  MoneyObligationDialogSection,
  type MoneyObligationMetric,
} from "./money-obligation-dialog-chrome";

type ExpensesPanelViewModel = AgencyMoneySurfaceViewModel["bills"]["expensesPanel"];

type AgencyMoneyExpenseDetailDialogProps = {
  panel: ExpensesPanelViewModel;
};

const EMPTY_EXPANDED: ReadonlySet<string> = new Set();

function expenseMetrics(item: ExpenseStripItem): MoneyObligationMetric[] {
  const paidLabel =
    item.status === "paid"
      ? item.amountLabel
      : item.status === "partial"
        ? "Partial"
        : "—";

  return [
    {
      label: "Amount",
      value: item.amountLabel,
    },
    {
      label: "Remaining",
      value: item.remainingLabel,
      tone: item.remainingAmount > 0 ? "warning" : "muted",
    },
    {
      label: "Paid",
      value: paidLabel,
      tone: item.status === "paid" ? "success" : item.status === "partial" ? "warning" : "muted",
    },
  ];
}

export function AgencyMoneyExpenseDetailDialog({ panel }: AgencyMoneyExpenseDetailDialogProps) {
  const item = findExpenseStripItem(panel.strip.items, panel.selectedRowId);
  const disabled = panel.create.isPending || panel.payment.isPending;

  return (
    <MoneyObligationDialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) panel.onCloseExpenseDetail();
      }}
      size="lg"
    >
      {item ? (
        <>
          <MoneyObligationDialogHeader
            title={item.name}
            statusLabel={item.statusLabel}
            caption={moneyBillsSheetCaption({
              kind: "expense",
              remainingAmount: item.remainingAmount,
              expenseKind: item.kind,
              expenseStatus: item.status,
            })}
            metrics={expenseMetrics(item)}
          />
          <MoneyObligationDialogBody>
            <div className="flex flex-col gap-4">
              <p className="rounded-xl border border-default bg-elevated/40 px-3 py-2.5 text-xs text-muted">
                {expenseStripMeta(item)}
              </p>
              <MoneyObligationDialogSection title="Expense line">
                <AgencyMoneyLedgerTableView
                  ariaLabel={`${item.name} expense`}
                  rows={buildMoneyLedgerExpenseParents([item])}
                  searchTerm=""
                  receivedHeading="Paid"
                  showPartyGlyph={false}
                  isMutationPending={disabled}
                  expandedRowIds={EMPTY_EXPANDED}
                  onToggleExpand={() => undefined}
                  onOpenRow={() => undefined}
                  onSettle={() => panel.onOpenPayment(item.expenseId)}
                  onOverflow={() => undefined}
                />
              </MoneyObligationDialogSection>
            </div>
          </MoneyObligationDialogBody>
          <MoneyObligationDialogFooter>
            <MoneyObligationDialogActions>
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                onClick={() => panel.onOpenEdit(item.expenseId)}
              >
                Edit
              </Button>
              {item.canRecordPayment ? (
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={() => panel.onOpenPayment(item.expenseId)}
                >
                  {disabled ? "Saving…" : item.kind === "subscription" ? "Pay" : "Record"}
                </Button>
              ) : null}
            </MoneyObligationDialogActions>
          </MoneyObligationDialogFooter>
        </>
      ) : null}
    </MoneyObligationDialog>
  );
}
