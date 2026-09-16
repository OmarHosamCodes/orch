import { type FormEvent } from "react";

import {
  moneyExpensePeriodLabel,
  type MoneyExpenseAmountMode,
  type MoneyExpenseKind,
  type MoneyExpensePeriod,
} from "@/features/billing/money-expense-form";
import { MoneyFxOverrideField } from "@/features/billing/money-fx-override-field-view";
import { AgencySearchSelect } from "@/features/shared/agency-search-select";
import {
  AgencyCompactDialog,
  AgencyCompactDialogBody,
  AgencyCompactDialogFooter,
  AgencyCompactDialogForm,
  AgencyCompactDialogHeader,
  AgencyCompactDialogMeta,
} from "@/features/shared/dialog-kit/agency-compact-dialog-shell";
import { AgencyIdentityField } from "@/features/shared/dialog-kit/agency-identity-field";
import { AgencyModeSegment } from "@/features/shared/dialog-kit/agency-mode-segment";
import { AgencyMomentField } from "@/features/shared/dialog-kit/agency-moment-field";
import { AgencyMoneyPair } from "@/features/shared/dialog-kit/agency-money-pair";
import { AgencyNoteField } from "@/features/shared/dialog-kit/agency-note-field";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { DialogClose } from "@/ui/dialog";

import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

type AgencyMoneyExpenseDialogsProps = {
  panel: AgencyMoneySurfaceViewModel["bills"]["expensesPanel"];
};

function formatExpenseStartPreview(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AgencyMoneyExpenseDialogs({ panel }: AgencyMoneyExpenseDialogsProps) {
  const create = panel.create;
  const payment = panel.payment;

  return (
    <>
      <AgencyCompactDialog open={create.open} onOpenChange={create.onOpenChange}>
        <AgencyCompactDialogHeader
          title={create.title}
          description={
            create.kind === "subscription" && create.amountMode === "variable"
              ? "First amount is optional; later cycles you enter when you Pay."
              : undefined
          }
          badge={
            <AgencyModeSegment
              aria-label="Expense type"
              value={create.kind}
              options={create.kindOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
              onChange={(value) => create.onKindChange(value as MoneyExpenseKind)}
              disabled={create.kindLocked}
            />
          }
        />
        <AgencyCompactDialogForm
          id={create.formId}
          noValidate
          onSubmit={(event: FormEvent<HTMLFormElement>) => create.onSubmit(event)}
        >
          <AgencyCompactDialogBody>
            <AgencyIdentityField
              id={`${create.formId}-name`}
              value={create.name}
              onChange={create.onNameChange}
              placeholder="e.g. Notion, office rent"
              autoFocus
              error={create.errors.name ?? null}
              aria-label="Expense name"
            />

            {create.kindLocked ? (
              <p className="text-[11px] text-muted">
                Type can't change after a payment has been recorded.
              </p>
            ) : null}

            <AgencyCompactDialogMeta>
              {create.kind === "one_time" ? (
                <AgencyMomentField
                  dateId={`${create.formId}-occurred-at`}
                  dateValue={create.occurredAt}
                  onDateChange={create.onOccurredAtChange}
                  dateAriaLabel="One-time expense date"
                  timeId={`${create.formId}-occurred-time`}
                  timeValue={create.occurredTime}
                  onTimeChange={create.onOccurredTimeChange}
                  variant="chip"
                />
              ) : null}
              {create.kind === "subscription" && create.amountModeOptions.length > 0 ? (
                <AgencyModeSegment
                  aria-label="Amount type"
                  value={create.amountMode}
                  options={create.amountModeOptions.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                  onChange={(value) => create.onAmountModeChange(value as MoneyExpenseAmountMode)}
                />
              ) : null}
              {create.kind === "subscription" ? (
                <AgencySearchSelect
                  id={`${create.formId}-period`}
                  value={create.period ?? ""}
                  onValueChange={(value) => create.onPeriodChange(value as MoneyExpensePeriod)}
                  options={create.periodOptions.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                  placeholder="Period"
                  searchPlaceholder="Search periods…"
                  aria-label="Period"
                  variant="chip"
                />
              ) : null}
              {create.kind === "subscription" ? (
                <AgencyMomentField
                  dateId={`${create.formId}-starts-at`}
                  dateValue={create.startsAt}
                  onDateChange={create.onStartsAtChange}
                  dateAriaLabel="Subscription start date"
                  variant="chip"
                />
              ) : null}
            </AgencyCompactDialogMeta>
            {create.errors.period ? (
              <p className="text-xs text-destructive" role="alert">
                {create.errors.period}
              </p>
            ) : null}
            {create.kind === "subscription" && create.startsAt ? (
              <p className="text-[11px] text-muted">
                First due {formatExpenseStartPreview(create.startsAt)}
                {create.period
                  ? ` · then ${moneyExpensePeriodLabel(create.period)?.toLowerCase()}`
                  : ""}
                .
              </p>
            ) : null}

            <AgencyMoneyPair
              id={`${create.formId}-amount`}
              label={
                create.kind === "subscription" && create.amountMode === "variable"
                  ? "First amount"
                  : "Amount"
              }
              amount={create.amount}
              onAmountChange={create.onAmountChange}
              currency={create.currency}
              onCurrencyChange={create.onCurrencyChange}
              currencyOptions={create.currencyOptions}
              preview={create.amountPreview}
              error={create.errors.amount ?? null}
              required={create.kind !== "subscription" || create.amountMode === "fixed"}
              hint={
                create.kind === "subscription" && create.amountMode === "variable"
                  ? "Leave blank to enter the amount when you Pay."
                  : null
              }
              fxSlot={create.fxOverride ? <MoneyFxOverrideField {...create.fxOverride} /> : null}
            />

            <AgencyNoteField
              id={`${create.formId}-note`}
              value={create.note}
              onChange={create.onNoteChange}
              placeholder="Anything to remember about this expense"
            />
          </AgencyCompactDialogBody>
          <AgencyCompactDialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={create.isPending} form={create.formId}>
              {create.isPending
                ? create.mode === "edit"
                  ? "Saving…"
                  : "Adding…"
                : create.submitLabel}
            </Button>
          </AgencyCompactDialogFooter>
        </AgencyCompactDialogForm>
      </AgencyCompactDialog>

      <AgencyCompactDialog open={payment.open} onOpenChange={payment.onOpenChange}>
        <AgencyCompactDialogHeader
          title={payment.kind === "subscription" ? "Pay subscription" : "Record payment"}
          description={payment.name}
          badge={
            payment.kind === "subscription" ? (
              <Badge variant="secondary">Advances next due</Badge>
            ) : null
          }
        />
        <AgencyCompactDialogForm
          id={payment.formId}
          noValidate
          onSubmit={(event: FormEvent<HTMLFormElement>) => payment.onSubmit(event)}
        >
          <AgencyCompactDialogBody>
            <AgencyMoneyPair
              id="money-expense-payment-amount"
              emphasis="hero"
              amount={payment.amount}
              onAmountChange={payment.onAmountChange}
              currency={payment.currency}
              currencyOptions={[payment.currency]}
              autoFocus
              required
              preview={
                payment.heroValue ? `${payment.heroLabel}: ${payment.heroValue}` : payment.heroHint
              }
              error={payment.validationMessage}
            />
          </AgencyCompactDialogBody>
          <AgencyCompactDialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={payment.isPending} form={payment.formId}>
              {payment.isPending
                ? "Recording…"
                : payment.kind === "subscription"
                  ? "Pay"
                  : "Record"}
            </Button>
          </AgencyCompactDialogFooter>
        </AgencyCompactDialogForm>
      </AgencyCompactDialog>
    </>
  );
}
