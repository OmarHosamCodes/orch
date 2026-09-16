import { MemberProfileLeaveRangePicker } from "@/features/shared/date/member-profile-leave-range-picker";
import { AgencySearchSelect } from "@/features/shared/agency-search-select";
import { agencyMetricClass } from "@/features/shared/agency-ui";
import {
  agencyDialogChipTriggerClass,
  AgencyCompactDialog,
  AgencyCompactDialogBody,
  AgencyCompactDialogFooter,
  AgencyCompactDialogForm,
  AgencyCompactDialogHeader,
  AgencyCompactDialogMeta,
} from "@/features/shared/dialog-kit/agency-compact-dialog-shell";
import { AgencyIdentityField } from "@/features/shared/dialog-kit/agency-identity-field";
import { AgencyKitReveal } from "@/features/shared/dialog-kit/agency-kit-reveal";
import { AgencyModeSegment } from "@/features/shared/dialog-kit/agency-mode-segment";
import { AgencyMoneyPair } from "@/features/shared/dialog-kit/agency-money-pair";
import { AgencyNoteField } from "@/features/shared/dialog-kit/agency-note-field";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { cn } from "@/lib/utils";

import { type AgencyMoneySurfaceViewModel } from "./hooks/use-agency-money-surface";

type BillsDialogsProps = {
  bills: AgencyMoneySurfaceViewModel["bills"];
};

export function AgencyMoneyBillsDialogs({ bills }: BillsDialogsProps) {
  const create = bills.create;
  const adjustmentCreate = bills.adjustmentCreate;
  const payment = bills.payment;
  const markPaidConfirm = bills.markPaidConfirm;
  const dismissConfirm = bills.dismissConfirm;
  const preview = bills.preview;
  const adjust = bills.adjust;

  return (
    <>
      <AgencyCompactDialog open={markPaidConfirm.open} onOpenChange={markPaidConfirm.onOpenChange}>
        <AgencyCompactDialogHeader
          title="Mark as fully paid?"
          description={`Record ${markPaidConfirm.amountLabel} for ${markPaidConfirm.partyName} as paid. This updates the bill status immediately.`}
        />
        <AgencyCompactDialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={markPaidConfirm.isPending}
            onClick={() => markPaidConfirm.onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={markPaidConfirm.isPending}
            onClick={markPaidConfirm.onConfirm}
          >
            {markPaidConfirm.isPending ? "Recording…" : "Mark paid"}
          </Button>
        </AgencyCompactDialogFooter>
      </AgencyCompactDialog>

      <AgencyCompactDialog open={dismissConfirm.open} onOpenChange={dismissConfirm.onOpenChange}>
        <AgencyCompactDialogHeader
          title="Remove this adjustment?"
          description={`Delete ${dismissConfirm.partyName}${dismissConfirm.amountLabel ? ` (${dismissConfirm.amountLabel})` : ""} from this period, including any paid amount recorded on it.`}
        />
        <AgencyCompactDialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={dismissConfirm.isPending}
            onClick={() => dismissConfirm.onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={dismissConfirm.isPending}
            onClick={dismissConfirm.onConfirm}
          >
            {dismissConfirm.isPending ? "Removing…" : "Remove"}
          </Button>
        </AgencyCompactDialogFooter>
      </AgencyCompactDialog>

      <Dialog open={preview.open} onOpenChange={preview.onOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{preview.title}</DialogTitle>
            <DialogDescription>
              Choose lines for {preview.partyTitle}. The document on the right is a preview only and
              is not saved until you export.
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 gap-4 overflow-y-auto lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-default bg-elevated/30 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-highlighted">Include lines</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={preview.onSelectAllObligations}
                  >
                    {preview.allSelected ? "Clear all" : "Select all"}
                  </Button>
                </div>
                <ul className="mt-2 divide-y divide-border">
                  {preview.lines.map((line) => (
                    <li key={line.id} className="flex items-start gap-3 py-2">
                      <Checkbox
                        checked={line.checked}
                        onCheckedChange={() => preview.onToggleObligationSelect(line.id)}
                        aria-label={`Include ${line.periodLabel}`}
                        className="mt-0.5"
                      />
                      <div className={cn("min-w-0 flex-1", line.isCarry && "pl-3")}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm text-highlighted">{line.periodLabel}</p>
                          {line.isCarry ? (
                            <span className="rounded-md border border-default px-1.5 py-px text-[0.625rem] font-medium tracking-wide text-muted uppercase">
                              Prior
                            </span>
                          ) : null}
                          {line.wasteLabel ? (
                            <span className="rounded-md border border-default px-1.5 py-px text-[0.625rem] font-medium tracking-wide text-muted uppercase">
                              Waste
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
                          {line.hoursLabel ? `${line.hoursLabel} · ` : null}
                          {line.statusLabel}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-xs tabular-nums",
                          line.remainingAmount > 0 ? "text-warning" : "text-highlighted",
                        )}
                      >
                        {line.amountLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-default px-3 py-3">
                <p className="text-sm font-medium text-highlighted">Export shape</p>
                <p className="mt-1 text-xs text-muted">
                  How selected periods become persisted documents.
                </p>
                <AgencyModeSegment
                  aria-label="Export shape"
                  stretch
                  className="mt-3"
                  value={preview.exportMode}
                  options={[
                    { value: "combine", label: "One document" },
                    { value: "split", label: "Split by period" },
                  ]}
                  onChange={preview.onExportModeChange}
                />
              </div>
            </div>

            <article className="rounded-xl border border-default bg-card px-5 py-5">
              <p className="text-[0.6875rem] font-medium tracking-wide text-muted uppercase">
                Preview only · not saved
                {preview.periodLabel ? ` · ${preview.periodLabel}` : null}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-highlighted">
                {preview.documentKind === "payslip" ? "Payslip" : "Invoice"}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {preview.documentKind === "payslip" ? "Prepared for" : "Billed to"}{" "}
                <span className="font-medium text-highlighted">{preview.partyTitle}</span>
              </p>
              {preview.documentLines.length === 0 ? (
                <p className="mt-6 text-sm text-muted">Select at least one line to preview.</p>
              ) : (
                <table className="mt-5 w-full text-sm">
                  <thead>
                    <tr className="border-b border-default text-left text-xs text-muted">
                      <th className="py-2 font-medium">Period</th>
                      <th className="py-2 text-right font-medium">Hours</th>
                      <th className="py-2 text-right font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.documentLines.map((line) => (
                      <tr key={line.id} className="border-b border-default/70">
                        <td className="py-2">
                          <span className="text-highlighted">{line.periodLabel}</span>
                          {line.isCarry ? (
                            <span className="ml-1.5 text-[0.625rem] tracking-wide text-muted uppercase">
                              Prior
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums text-muted">
                          {line.hoursLabel}
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums text-highlighted">
                          {line.remainingLabel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-default pt-3">
                <span className="text-sm text-muted">
                  Due
                  {preview.hoursLabel ? ` · ${preview.hoursLabel}` : null}
                </span>
                <span className="font-mono text-lg font-semibold tabular-nums text-highlighted">
                  {preview.dueLabel}
                </span>
              </div>
            </article>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={preview.onClose}>
              Close
            </Button>
            <Button
              type="button"
              disabled={!preview.canExport || bills.isMutationPending}
              onClick={preview.onExport}
            >
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AgencyCompactDialog
        open={adjust.open}
        onOpenChange={adjust.onOpenChange}
        size="md"
        showCloseButton={!adjust.isPending}
      >
        <AgencyCompactDialogHeader
          title={`Adjust ${adjust.partyTitle}`}
          description={
            adjust.lineSubtitle ||
            (adjust.partyType === "client"
              ? "Settle what this client still owes"
              : "Settle what the team is owed")
          }
          badge={
            <>
              <Badge variant="secondary">{adjust.partyType === "client" ? "Collect" : "Pay"}</Badge>
              {adjust.statusLabel ? <Badge variant="outline">{adjust.statusLabel}</Badge> : null}
            </>
          }
        />
        <AgencyCompactDialogForm
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            adjust.onSubmit();
          }}
        >
          <AgencyCompactDialogBody>
            {adjust.isReady ? (
              <div className="rounded-xl border border-default bg-muted/30 px-3 py-2.5 text-xs text-muted text-pretty">
                Ready lines export the original-period document first, then{" "}
                {adjust.partyType === "client" ? "record the collection" : "record the payment"}.
                Refund is available only after the document exists.
              </div>
            ) : null}

            {adjust.obligationOptions.length > 1 ? (
              <AgencyCompactDialogMeta>
                <AgencySearchSelect
                  id="money-adjust-obligation"
                  value={adjust.obligationId}
                  onValueChange={adjust.onObligationIdChange}
                  options={adjust.obligationOptions.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                  placeholder="Bill line"
                  searchPlaceholder="Search lines…"
                  aria-label="Bill line"
                  variant="chip"
                />
              </AgencyCompactDialogMeta>
            ) : null}

            <AgencyModeSegment
              aria-label="Adjust action"
              stretch
              value={adjust.tab}
              options={[
                { value: "pay" as const, label: adjust.partyType === "client" ? "Collect" : "Pay" },
                { value: "partial" as const, label: "Partial" },
                ...(adjust.canRefund
                  ? [
                      {
                        value: "refund" as const,
                        label: adjust.partyType === "client" ? "Uncollect" : "Refund",
                      },
                    ]
                  : []),
                { value: "adjustments" as const, label: "Adjust" },
              ]}
              onChange={adjust.onTabChange}
              disabled={adjust.isPending}
            />

            <AgencyKitReveal open={adjust.tab === "pay"}>
              <div className="py-2 text-center">
                <p className="text-xs text-muted">
                  {adjust.partyType === "client" ? "Amount to collect" : "Amount to pay"}
                </p>
                <p
                  className={cn(
                    agencyMetricClass,
                    "mt-1 font-mono text-3xl font-semibold tracking-tight tabular-nums text-highlighted",
                  )}
                >
                  {adjust.remainingLabel}
                </p>
                <p className="mt-2 text-[11px] text-muted">
                  Settles the full open balance in one step.
                </p>
              </div>
            </AgencyKitReveal>

            <AgencyKitReveal open={adjust.tab === "partial"}>
              <div className="flex flex-col gap-2">
                <AgencyMoneyPair
                  id="money-adjust-amount"
                  emphasis="hero"
                  amount={adjust.amount}
                  onAmountChange={adjust.onAmountChange}
                  currency={adjust.currency}
                  currencyOptions={[adjust.currency]}
                  error={adjust.amountError}
                  autoFocus={adjust.tab === "partial"}
                  required
                  preview={
                    adjust.partyType === "client"
                      ? `Still to collect ${adjust.remainingLabel}`
                      : `Still to pay ${adjust.remainingLabel}`
                  }
                />
              </div>
            </AgencyKitReveal>

            <AgencyKitReveal open={adjust.tab === "refund"}>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-pretty">
                <p className="font-medium text-highlighted">
                  {adjust.partyType === "client"
                    ? "Uncollect this invoice"
                    : "Refund this obligation"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {adjust.partyType === "client"
                    ? "Moves received amount back to remaining so the bill is outstanding again."
                    : "Clears paid amount and returns the line to outstanding."}
                </p>
              </div>
            </AgencyKitReveal>

            <AgencyKitReveal open={adjust.tab === "adjustments"}>
              <div className="flex flex-col gap-2.5">
                <AgencyCompactDialogMeta>
                  <AgencySearchSelect
                    id="money-adjust-kind"
                    value={adjust.kind}
                    onValueChange={(value) => adjust.onKindChange(value as typeof adjust.kind)}
                    options={[
                      { value: "discount", label: "Discount" },
                      { value: "surcharge", label: "Surcharge" },
                      { value: "debt", label: "Debt" },
                    ]}
                    aria-label="Adjustment kind"
                    variant="chip"
                  />
                </AgencyCompactDialogMeta>
                <AgencyMoneyPair
                  id="money-adjust-adj-amount"
                  amount={adjust.amount}
                  onAmountChange={adjust.onAmountChange}
                  currency={adjust.currency}
                  currencyOptions={[adjust.currency]}
                  error={adjust.amountError}
                  required
                />
                <AgencyNoteField
                  id="money-adjust-note"
                  value={adjust.note}
                  onChange={adjust.onNoteChange}
                  placeholder="Shown on the next export"
                />
              </div>
            </AgencyKitReveal>
          </AgencyCompactDialogBody>
          <AgencyCompactDialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => adjust.onOpenChange(false)}
              disabled={adjust.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={adjust.tab === "refund" ? "destructive" : "default"}
              disabled={adjust.isPending}
            >
              {adjust.isPending
                ? "Working…"
                : adjust.tab === "adjustments"
                  ? "Save adjustment"
                  : adjust.tab === "refund"
                    ? adjust.partyType === "client"
                      ? "Uncollect"
                      : "Confirm refund"
                    : adjust.tab === "pay"
                      ? adjust.partyType === "client"
                        ? "Collect"
                        : "Pay"
                      : adjust.partyType === "client"
                        ? "Collect partial"
                        : "Record partial"}
            </Button>
          </AgencyCompactDialogFooter>
        </AgencyCompactDialogForm>
      </AgencyCompactDialog>

      <AgencyCompactDialog
        open={create.open}
        onOpenChange={create.onOpenChange}
        showCloseButton={!create.isPending}
      >
        <AgencyCompactDialogHeader
          title="Create invoice"
          description="Draft a client invoice from tracked time in the selected period."
        />
        <AgencyCompactDialogForm id={create.formId} noValidate onSubmit={create.onSubmit}>
          <AgencyCompactDialogBody>
            <AgencyCompactDialogMeta>
              <AgencySearchSelect
                value={create.clientId}
                onValueChange={create.onClientIdChange}
                options={create.clients.map((client) => ({
                  value: client.id,
                  label: client.name,
                }))}
                placeholder="Client"
                searchPlaceholder="Search clients"
                aria-label="Client"
                variant="chip"
              />
              <MemberProfileLeaveRangePicker
                triggerId="money-bill-period"
                startDate={create.periodStart}
                endDate={create.periodEnd}
                emptyLabel="Invoice period"
                ariaLabel="Invoice period"
                triggerClassName={agencyDialogChipTriggerClass}
                onRangeChange={(next) => {
                  create.onPeriodStartChange(next.startDate);
                  create.onPeriodEndChange(next.endDate);
                }}
              />
            </AgencyCompactDialogMeta>
            {create.errors.client ? (
              <p className="text-xs text-destructive" role="alert">
                {create.errors.client}
              </p>
            ) : null}
            {create.errors.period ? (
              <p className="text-xs text-destructive" role="alert">
                {create.errors.period}
              </p>
            ) : null}
          </AgencyCompactDialogBody>
          <AgencyCompactDialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => create.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" form={create.formId} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create draft"}
            </Button>
          </AgencyCompactDialogFooter>
        </AgencyCompactDialogForm>
      </AgencyCompactDialog>

      <AgencyCompactDialog
        open={adjustmentCreate.open}
        onOpenChange={adjustmentCreate.onOpenChange}
        showCloseButton={!adjustmentCreate.isPending}
      >
        <AgencyCompactDialogHeader
          title="Add adjustment or cost"
          description={
            adjustmentCreate.isSalaryPool
              ? "Set the manual Team salaries total for this period."
              : adjustmentCreate.sectionKey === "extra"
                ? "Add extra period income. It raises Total income and ROI for this period."
                : "Create a Debt / Discount, Extra, Charity, or formula-driven PBC line for this period."
          }
        />
        <AgencyCompactDialogForm
          id={adjustmentCreate.formId}
          noValidate
          onSubmit={adjustmentCreate.onSubmit}
        >
          <AgencyCompactDialogBody>
            {!adjustmentCreate.isSalaryPool ? (
              <AgencyCompactDialogMeta>
                <AgencySearchSelect
                  id={`${adjustmentCreate.formId}-section`}
                  value={adjustmentCreate.sectionKey}
                  onValueChange={(value) =>
                    adjustmentCreate.onSectionKeyChange(
                      value as (typeof adjustmentCreate.sectionOptions)[number]["id"],
                    )
                  }
                  options={adjustmentCreate.sectionOptions.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                  placeholder="Section"
                  searchPlaceholder="Search sections…"
                  aria-label="Section"
                  variant="chip"
                />
              </AgencyCompactDialogMeta>
            ) : null}
            {!adjustmentCreate.isSalaryPool ? (
              <AgencyIdentityField
                id={`${adjustmentCreate.formId}-label`}
                value={adjustmentCreate.label}
                onChange={adjustmentCreate.onLabelChange}
                placeholder="e.g. Client discount, donation"
                error={adjustmentCreate.errors.label ?? null}
                aria-label="Label"
              />
            ) : null}
            <AgencyMoneyPair
              id={`${adjustmentCreate.formId}-amount`}
              amount={adjustmentCreate.amount}
              onAmountChange={adjustmentCreate.onAmountChange}
              currency=""
              currencyOptions={[]}
              showCurrency={false}
              error={adjustmentCreate.errors.amount ?? null}
              required
              emphasis={adjustmentCreate.isSalaryPool ? "hero" : "field"}
            />
          </AgencyCompactDialogBody>
          <AgencyCompactDialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => adjustmentCreate.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              form={adjustmentCreate.formId}
              disabled={adjustmentCreate.isPending}
            >
              {adjustmentCreate.isPending
                ? "Saving…"
                : adjustmentCreate.isSalaryPool
                  ? "Save total"
                  : "Add"}
            </Button>
          </AgencyCompactDialogFooter>
        </AgencyCompactDialogForm>
      </AgencyCompactDialog>

      <AgencyCompactDialog
        open={payment.open}
        onOpenChange={payment.onOpenChange}
        showCloseButton={!bills.isMutationPending}
      >
        <AgencyCompactDialogHeader
          title="Record payment"
          description={`${payment.partyName} · ${payment.referenceLabel}. Remaining ${payment.remainingLabel}.`}
        />
        <AgencyCompactDialogForm id={payment.formId} onSubmit={payment.onSubmit}>
          <AgencyCompactDialogBody>
            <AgencyMoneyPair
              id="money-bill-payment-amount"
              emphasis="hero"
              amount={payment.amount}
              onAmountChange={payment.onAmountChange}
              currency={payment.currency}
              currencyOptions={[payment.currency]}
              error={payment.validationMessage}
              required
              autoFocus
              preview={`Remaining ${payment.remainingLabel}`}
            />
          </AgencyCompactDialogBody>
          <AgencyCompactDialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => payment.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              form={payment.formId}
              disabled={bills.isMutationPending}
            >
              {bills.isMutationPending ? "Recording…" : "Record"}
            </Button>
          </AgencyCompactDialogFooter>
        </AgencyCompactDialogForm>
      </AgencyCompactDialog>
    </>
  );
}
