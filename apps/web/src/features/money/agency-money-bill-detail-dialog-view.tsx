import { MoreHorizontal } from "lucide-react";

import {
  type MoneyBillPendingAdjustmentItem,
  type MoneyBillPersonGroup,
} from "@/features/billing/money-bill-obligation-rows";
import {
  formatMoneyAmount,
  moneyBillClientHref,
  moneyBillMemberHref,
  moneyBillsAdjustCtaLabel,
  moneyBillsPickAdjustLine,
  type MoneyBillAdjustmentRow,
} from "@/features/billing/money-bills-rows";
import {
  moneyBillGroupCarryCount,
  moneyLedgerParentStatusLabel,
  moneyBillsSheetCaption,
} from "@/features/billing/money-bills-table-columns";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

import { AgencyMoneyLedgerTableView } from "./agency-money-ledger-table-view";
import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";
import { buildMoneyLedgerParents } from "./money-ledger-rows";
import {
  MoneyObligationDialog,
  MoneyObligationDialogActions,
  MoneyObligationDialogBody,
  MoneyObligationDialogFooter,
  MoneyObligationDialogHeader,
  MoneyObligationDialogSection,
  type MoneyObligationMetric,
} from "./money-obligation-dialog-chrome";

type BillsViewModel = AgencyMoneySurfaceViewModel["bills"];

const EMPTY_EXPANDED: ReadonlySet<string> = new Set();

function groupMetrics(
  group: MoneyBillPersonGroup,
  receivedHeading: string,
): MoneyObligationMetric[] {
  return [
    {
      label: "Hours",
      value: group.hoursLabel || "—",
      tone: "muted",
    },
    {
      label: "Total",
      value: group.totalLabel,
    },
    {
      label: receivedHeading,
      value: group.receivedLabel,
    },
    {
      label: "Remaining",
      value: group.remainingLabel,
      tone: group.remainingAmount > 0 ? "warning" : "default",
    },
  ];
}

function adjustmentMetrics(row: MoneyBillAdjustmentRow): MoneyObligationMetric[] {
  return [
    {
      label: "Total",
      value: row.amountLabel,
    },
    {
      label: "Paid",
      value: row.paidLabel,
    },
    {
      label: "Remaining",
      value: row.remainingLabel,
      tone: row.remainingAmount > 0 ? "warning" : "default",
    },
  ];
}

function salaryPoolMetrics(
  pool: NonNullable<BillsViewModel["salaryPool"]["pool"]>,
): MoneyObligationMetric[] {
  return [
    {
      label: "Pool total",
      value: pool.totalLabel,
    },
    {
      label: "Paid",
      value: pool.paidLabel,
    },
    {
      label: "Remaining",
      value: pool.remainingLabel,
      tone: pool.remainingAmount > 0 ? "warning" : "default",
    },
  ];
}

function AdjustmentsPanel({
  group,
  bills,
  disabled,
}: {
  group: MoneyBillPersonGroup;
  bills: BillsViewModel;
  disabled: boolean;
}) {
  const items = group.pendingAdjustments;
  const baseCents = group.totalCents - group.pendingAdjustmentCents;

  return (
    <MoneyObligationDialogSection
      title="Period adjustments"
      action={
        group.party === "client" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={disabled || group.lines.length === 0}
            onClick={() => bills.onAddAdjustment(group)}
          >
            Add
          </Button>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-default px-3 py-4 text-xs text-muted">
          No period adjustments on this bill.
        </p>
      ) : (
        <ul className="divide-y divide-default overflow-hidden rounded-xl border border-default">
          {items.map((item: MoneyBillPendingAdjustmentItem) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm text-highlighted">{item.kindLabel}</span>
                  {item.applied ? <Badge variant="outline">On invoice</Badge> : null}
                </div>
                {item.note ? <p className="text-xs text-muted">{item.note}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="font-mono text-sm tabular-nums text-highlighted">
                  {item.amountLabel}
                </span>
                {group.party === "client" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={disabled}
                        aria-label={`Actions for ${item.kindLabel}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onSelect={() => bills.onEditPendingAdjustment(group, item)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => bills.onDeletePendingAdjustment(item.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {group.pendingAdjustmentCents !== 0 ? (
        <dl className="grid grid-cols-3 gap-2 rounded-xl border border-default bg-elevated/40 px-3 py-3">
          <div>
            <dt className="text-[0.6875rem] text-muted">Base</dt>
            <dd className="font-mono text-xs tabular-nums text-highlighted">
              {formatMoneyAmount(baseCents, group.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] text-muted">Adjustments</dt>
            <dd className="font-mono text-xs tabular-nums text-highlighted">
              {formatMoneyAmount(group.pendingAdjustmentCents, group.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] text-muted">Invoice total</dt>
            <dd className="font-mono text-xs tabular-nums text-highlighted">{group.totalLabel}</dd>
          </div>
        </dl>
      ) : null}
    </MoneyObligationDialogSection>
  );
}

function GroupDetail({ group, bills }: { group: MoneyBillPersonGroup; bills: BillsViewModel }) {
  const disabled = bills.isMutationPending;
  const adjustLine = moneyBillsPickAdjustLine(group.lines);
  const adjustLabel = adjustLine ? moneyBillsAdjustCtaLabel(group.party, adjustLine) : "Adjust";
  const partyHref =
    group.party === "client" && group.clientId
      ? moneyBillClientHref(group.clientId)
      : group.party === "team" && group.userId
        ? moneyBillMemberHref(group.userId)
        : null;
  const receivedHeading = group.party === "client" ? "Received" : "Paid";
  const ledgerRows = buildMoneyLedgerParents({
    clientGroups: group.party === "client" ? [group] : [],
    teamGroups: group.party === "team" ? [group] : [],
    adjustments: [],
    salaryPool: { pool: null, canPay: false },
  });

  return (
    <>
      <MoneyObligationDialogHeader
        title={group.title}
        titleHref={partyHref}
        statusLabel={moneyLedgerParentStatusLabel(group)}
        caption={moneyBillsSheetCaption({
          kind: "group",
          remainingAmount: group.remainingAmount,
          carryCount: moneyBillGroupCarryCount(group),
          party: group.party,
        })}
        metrics={groupMetrics(group, receivedHeading)}
      />
      <MoneyObligationDialogBody>
        <div className="flex flex-col gap-6">
          <MoneyObligationDialogSection title="Bill lines">
            <AgencyMoneyLedgerTableView
              ariaLabel={`${group.title} bill lines`}
              rows={ledgerRows}
              searchTerm=""
              receivedHeading={receivedHeading}
              showPartyGlyph={false}
              isMutationPending={disabled}
              expandedRowIds={EMPTY_EXPANDED}
              onToggleExpand={() => undefined}
              onOpenRow={() => undefined}
              alwaysShowChildren
              hideParentRow
              onSettle={(_rowId, childId) => {
                const line = group.lines.find((item) => item.id === childId);
                if (line) bills.onOpenAdjustLine(group, line);
              }}
              onOverflow={(_rowId, action, childId) => {
                const line = childId ? group.lines.find((item) => item.id === childId) : undefined;
                switch (action) {
                  case "preview":
                    if (line) bills.onOpenPreviewLine(group, line);
                    else bills.onOpenPreview(group);
                    return;
                  case "adjust":
                    if (line) bills.onOpenAdjustLine(group, line, { tab: "adjustments" });
                    else bills.onAddAdjustment(group);
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
          </MoneyObligationDialogSection>
          <AdjustmentsPanel group={group} bills={bills} disabled={disabled} />
        </div>
      </MoneyObligationDialogBody>
      <MoneyObligationDialogFooter>
        <MoneyObligationDialogActions>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => bills.onOpenPreview(group)}
          >
            {group.party === "client" ? "Preview invoice" : "Preview payslip"}
          </Button>
          {group.party === "client" ? (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || group.lines.length === 0}
              onClick={() => bills.onAddAdjustment(group)}
            >
              Add adjustment
            </Button>
          ) : null}
          <Button type="button" disabled={disabled} onClick={() => bills.onOpenAdjust(group)}>
            {disabled ? "Saving…" : adjustLabel}
          </Button>
        </MoneyObligationDialogActions>
      </MoneyObligationDialogFooter>
    </>
  );
}

function AdjustmentDetail({ row, bills }: { row: MoneyBillAdjustmentRow; bills: BillsViewModel }) {
  const disabled = bills.isMutationPending;
  const markPaidIsPrimary = !row.canRecordPayment && row.canMarkPaid;
  const dismissIsPrimary = row.canDismiss && !row.canRecordPayment && !row.canMarkPaid;

  return (
    <>
      <MoneyObligationDialogHeader
        title={row.title}
        statusLabel={row.statusLabel}
        caption={moneyBillsSheetCaption({
          kind: "adjustment",
          remainingAmount: row.remainingAmount,
          sectionTitle: row.sectionTitle,
        })}
        metrics={adjustmentMetrics(row)}
      />
      <MoneyObligationDialogBody>
        <MoneyObligationDialogSection title="Adjustment">
          <AgencyMoneyLedgerTableView
            ariaLabel={`${row.title} adjustment`}
            rows={buildMoneyLedgerParents({
              clientGroups: [],
              teamGroups: [],
              adjustments: [row],
              salaryPool: { pool: null, canPay: false },
            })}
            searchTerm=""
            receivedHeading="Paid"
            showPartyGlyph={false}
            isMutationPending={disabled}
            expandedRowIds={EMPTY_EXPANDED}
            onToggleExpand={() => undefined}
            onOpenRow={() => undefined}
            onSettle={() => {
              if (row.canRecordPayment) {
                bills.onOpenPayment(row.id);
                return;
              }
              if (row.canMarkPaid) bills.onMarkPaid(row.id);
            }}
            onOverflow={() => undefined}
          />
        </MoneyObligationDialogSection>
      </MoneyObligationDialogBody>
      <MoneyObligationDialogFooter>
        <MoneyObligationDialogActions>
          {row.canDismiss ? (
            <Button
              type="button"
              variant={dismissIsPrimary ? "default" : "ghost"}
              disabled={disabled}
              onClick={() => bills.onDismissAdjustment(row.id)}
            >
              {dismissIsPrimary && disabled ? "Saving…" : "Dismiss"}
            </Button>
          ) : null}
          {row.canMarkPaid && !markPaidIsPrimary ? (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => bills.onMarkPaid(row.id)}
            >
              Mark paid
            </Button>
          ) : null}
          {row.canRecordPayment ? (
            <Button type="button" disabled={disabled} onClick={() => bills.onOpenPayment(row.id)}>
              {disabled ? "Saving…" : "Record payment"}
            </Button>
          ) : null}
          {markPaidIsPrimary ? (
            <Button type="button" disabled={disabled} onClick={() => bills.onMarkPaid(row.id)}>
              {disabled ? "Saving…" : "Mark paid"}
            </Button>
          ) : null}
        </MoneyObligationDialogActions>
      </MoneyObligationDialogFooter>
    </>
  );
}

function SalaryPoolDetail({ bills }: { bills: BillsViewModel }) {
  const salaryPool = bills.salaryPool;
  const pool = salaryPool.pool;
  if (!pool) return null;
  const disabled = bills.isMutationPending || salaryPool.isPending;

  return (
    <>
      <MoneyObligationDialogHeader
        title="Team salaries"
        statusLabel={pool.statusLabel}
        caption={moneyBillsSheetCaption({
          kind: "salary-pool",
          remainingAmount: pool.remainingAmount,
        })}
        metrics={salaryPoolMetrics(pool)}
      />
      <MoneyObligationDialogBody>
        <MoneyObligationDialogSection title="Salary pool">
          <AgencyMoneyLedgerTableView
            ariaLabel="Team salaries"
            rows={buildMoneyLedgerParents({
              clientGroups: [],
              teamGroups: [],
              adjustments: [],
              salaryPool,
            })}
            searchTerm=""
            receivedHeading="Paid"
            showPartyGlyph={false}
            isMutationPending={disabled}
            expandedRowIds={EMPTY_EXPANDED}
            onToggleExpand={() => undefined}
            onOpenRow={() => undefined}
            onSettle={() => undefined}
            onOverflow={() => undefined}
          />
        </MoneyObligationDialogSection>
      </MoneyObligationDialogBody>
      {salaryPool.canPay ? (
        <MoneyObligationDialogFooter>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="money-salary-pool-payment">Payment amount ({pool.currency})</Label>
              <Input
                id="money-salary-pool-payment"
                inputMode="decimal"
                value={salaryPool.payAmount}
                disabled={disabled}
                onChange={(event) => salaryPool.onPayAmountChange(event.target.value)}
                aria-invalid={Boolean(salaryPool.validationMessage)}
                aria-describedby={
                  salaryPool.validationMessage ? "money-salary-pool-payment-error" : undefined
                }
              />
              {salaryPool.validationMessage ? (
                <p
                  id="money-salary-pool-payment-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {salaryPool.validationMessage}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              disabled={disabled || !salaryPool.canSubmitPay}
              onClick={salaryPool.onPay}
            >
              {disabled ? "Saving…" : "Pay"}
            </Button>
          </div>
        </MoneyObligationDialogFooter>
      ) : null}
    </>
  );
}

export function AgencyMoneyBillDetailDialog({ bills }: { bills: BillsViewModel }) {
  const selection = bills.detailSelection;
  const group =
    selection?.kind === "group" && bills.detailRow?.kind === "person-group"
      ? bills.detailRow
      : null;
  const adjustment =
    selection?.kind === "adjustment" && bills.detailRow?.kind === "adjustment"
      ? bills.detailRow
      : null;
  const isSalaryPool = selection?.kind === "salary-pool";

  return (
    <MoneyObligationDialog
      open={selection !== null}
      onOpenChange={(open) => {
        if (!open) bills.onCloseDetail();
      }}
      size={group ? "xl" : "lg"}
    >
      {group ? <GroupDetail group={group} bills={bills} /> : null}
      {adjustment ? <AdjustmentDetail row={adjustment} bills={bills} /> : null}
      {isSalaryPool ? <SalaryPoolDetail bills={bills} /> : null}
    </MoneyObligationDialog>
  );
}
