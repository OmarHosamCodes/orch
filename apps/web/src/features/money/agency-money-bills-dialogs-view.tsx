import { MemberProfileLeaveRangePicker } from "@/features/shared/date/member-profile-leave-range-picker";
import { AgencyMultiSelectFilter } from "@/features/shared/filters/agency-multi-select-filter";
import {
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyMetricClass,
} from "@/features/shared/agency-ui";
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
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Separator } from "@/ui/separator";
import { Textarea } from "@/ui/textarea";
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
      <Dialog open={markPaidConfirm.open} onOpenChange={markPaidConfirm.onOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as fully paid?</DialogTitle>
            <DialogDescription>
              Record {markPaidConfirm.amountLabel} for {markPaidConfirm.partyName} as paid. This
              updates the bill status immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={markPaidConfirm.isPending}
              onClick={() => markPaidConfirm.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={markPaidConfirm.isPending}
              onClick={markPaidConfirm.onConfirm}
            >
              {markPaidConfirm.isPending ? "Recording…" : "Mark paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dismissConfirm.open} onOpenChange={dismissConfirm.onOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this adjustment?</DialogTitle>
            <DialogDescription>
              Delete {dismissConfirm.partyName}
              {dismissConfirm.amountLabel ? ` (${dismissConfirm.amountLabel})` : ""} from this
              period, including any paid amount recorded on it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={dismissConfirm.isPending}
              onClick={() => dismissConfirm.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={dismissConfirm.isPending}
              onClick={dismissConfirm.onConfirm}
            >
              {dismissConfirm.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={preview.open} onOpenChange={preview.onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted uppercase">
              Preview only · not saved
              {preview.periodLabel ? ` · ${preview.periodLabel}` : null}
            </p>
            <DialogTitle>{preview.title}</DialogTitle>
            <DialogDescription>
              Choose lines for {preview.partyTitle}, then export to create the document.
            </DialogDescription>
          </DialogHeader>
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
                  <li key={line.id} className="flex items-center gap-3 py-2">
                    <Checkbox
                      checked={line.checked}
                      onCheckedChange={() => preview.onToggleObligationSelect(line.id)}
                      aria-label={`Include ${line.subtitle}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-highlighted">{line.subtitle}</p>
                      <p className="text-xs text-muted">
                        {line.isCarry ? "Prior · " : null}
                        {line.statusLabel}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-highlighted">
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
              <Tabs
                value={preview.exportMode}
                onValueChange={(value) => preview.onExportModeChange(value as "combine" | "split")}
                className="mt-3"
              >
                <TabsList className="h-9 w-full">
                  <TabsTrigger value="combine" className="flex-1">
                    One document
                  </TabsTrigger>
                  <TabsTrigger value="split" className="flex-1">
                    Split by period
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="rounded-xl border border-default bg-elevated/20 px-3 py-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted">Selected</span>
                <span className="font-mono tabular-nums text-highlighted">
                  {preview.selectedTotalLabel}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-2 border-t border-default pt-2 font-medium">
                <span className="text-highlighted">Due</span>
                <span className="font-mono tabular-nums text-highlighted">{preview.dueLabel}</span>
              </div>
            </div>
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

      <Dialog open={adjust.open} onOpenChange={adjust.onOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="space-y-2 border-b border-default px-5 py-4 pr-14 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-base font-bold text-highlighted">
                Adjust {adjust.partyTitle}
              </DialogTitle>
              <Badge variant="secondary">{adjust.partyType === "client" ? "Collect" : "Pay"}</Badge>
              {adjust.statusLabel ? <Badge variant="outline">{adjust.statusLabel}</Badge> : null}
            </div>
            <DialogDescription className="text-xs text-muted text-pretty">
              {adjust.lineSubtitle ||
                (adjust.partyType === "client"
                  ? "Settle what this client still owes"
                  : "Settle what the team is owed")}
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              adjust.onSubmit();
            }}
          >
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4">
              {adjust.isReady ? (
                <div className="rounded-xl border border-default bg-muted/30 px-3 py-2.5 text-xs text-muted text-pretty">
                  Ready lines export the original-period document first, then{" "}
                  {adjust.partyType === "client" ? "record the collection" : "record the payment"}.
                  Refund is available only after the document exists.
                </div>
              ) : null}

              {adjust.obligationOptions.length > 1 ? (
                <div className={agencyFormFieldClass}>
                  <Label htmlFor="money-adjust-obligation" className={agencyFormLabelClass}>
                    Bill line
                  </Label>
                  <Select value={adjust.obligationId} onValueChange={adjust.onObligationIdChange}>
                    <SelectTrigger
                      id="money-adjust-obligation"
                      className="h-9 w-full rounded-xl border-default bg-default"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {adjust.obligationOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <Tabs
                value={adjust.tab}
                onValueChange={(value) => adjust.onTabChange(value as typeof adjust.tab)}
              >
                <TabsList className="h-9 w-full">
                  <TabsTrigger value="pay" className="flex-1">
                    {adjust.partyType === "client" ? "Collect" : "Pay"}
                  </TabsTrigger>
                  <TabsTrigger value="partial" className="flex-1">
                    Partial
                  </TabsTrigger>
                  {adjust.canRefund ? (
                    <TabsTrigger value="refund" className="flex-1">
                      {adjust.partyType === "client" ? "Uncollect" : "Refund"}
                    </TabsTrigger>
                  ) : null}
                  <TabsTrigger value="adjustments" className="flex-1">
                    Adjust
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pay" className="mt-4">
                  <div className="rounded-surface border border-default bg-card px-surface py-surface text-center">
                    <p className="text-xs text-muted">
                      {adjust.partyType === "client" ? "Amount to collect" : "Amount to pay"}
                    </p>
                    <p
                      className={cn(
                        agencyMetricClass,
                        "mt-1 font-mono text-2xl font-semibold tabular-nums text-highlighted",
                      )}
                    >
                      {adjust.remainingLabel}
                    </p>
                    <p className="mt-2 text-[11px] text-muted">
                      Settles the full open balance in one step.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="partial" className="mt-4 flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
                    <span>
                      {adjust.partyType === "client" ? "Still to collect" : "Still to pay"}
                    </span>
                    <span className="font-mono tabular-nums text-highlighted">
                      {adjust.remainingLabel}
                    </span>
                  </div>
                  <Separator />
                  <div className={agencyFormFieldClass}>
                    <Label htmlFor="money-adjust-amount" className={agencyFormLabelClass}>
                      Amount ({adjust.currency})
                    </Label>
                    <Input
                      id="money-adjust-amount"
                      inputMode="decimal"
                      value={adjust.amount}
                      onChange={(event) => adjust.onAmountChange(event.target.value)}
                      className="h-9 rounded-xl border-default bg-default text-sm tabular-nums"
                      required
                      aria-invalid={Boolean(adjust.amountError)}
                      aria-describedby={
                        adjust.amountError ? "money-adjust-amount-error" : undefined
                      }
                      autoFocus
                    />
                    {adjust.amountError ? (
                      <p
                        id="money-adjust-amount-error"
                        className="text-xs text-destructive"
                        role="alert"
                      >
                        {adjust.amountError}
                      </p>
                    ) : null}
                  </div>
                </TabsContent>

                <TabsContent value="refund" className="mt-4">
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
                </TabsContent>

                <TabsContent value="adjustments" className="mt-4 flex flex-col gap-3">
                  <div className={agencyFormFieldClass}>
                    <Label htmlFor="money-adjust-kind" className={agencyFormLabelClass}>
                      Kind
                    </Label>
                    <Select
                      value={adjust.kind}
                      onValueChange={(value) => adjust.onKindChange(value as typeof adjust.kind)}
                    >
                      <SelectTrigger
                        id="money-adjust-kind"
                        className="h-9 w-full rounded-xl border-default bg-default"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="surcharge">Surcharge</SelectItem>
                        <SelectItem value="debt">Debt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={agencyFormFieldClass}>
                    <Label htmlFor="money-adjust-adj-amount" className={agencyFormLabelClass}>
                      Amount ({adjust.currency})
                    </Label>
                    <Input
                      id="money-adjust-adj-amount"
                      inputMode="decimal"
                      value={adjust.amount}
                      onChange={(event) => adjust.onAmountChange(event.target.value)}
                      placeholder="0.00"
                      className="h-9 rounded-xl border-default bg-default text-sm tabular-nums"
                      required
                      aria-invalid={Boolean(adjust.amountError)}
                      aria-describedby={
                        adjust.amountError ? "money-adjust-adj-amount-error" : undefined
                      }
                    />
                    {adjust.amountError ? (
                      <p
                        id="money-adjust-adj-amount-error"
                        className="text-xs text-destructive"
                        role="alert"
                      >
                        {adjust.amountError}
                      </p>
                    ) : null}
                  </div>
                  <div className={agencyFormFieldClass}>
                    <Label htmlFor="money-adjust-note" className={agencyFormLabelClass}>
                      Note <span className="font-normal text-muted">(optional)</span>
                    </Label>
                    <Textarea
                      id="money-adjust-note"
                      value={adjust.note}
                      onChange={(event) => adjust.onNoteChange(event.target.value)}
                      placeholder="Shown on the next export"
                      className="min-h-20 rounded-xl border-default bg-default text-sm"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={create.open} onOpenChange={create.onOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create invoice</DialogTitle>
            <DialogDescription>
              Draft a client invoice from tracked time in the selected period.
            </DialogDescription>
          </DialogHeader>
          <form
            id={create.formId}
            className="flex min-h-0 flex-col gap-4 overflow-y-auto"
            noValidate
            onSubmit={create.onSubmit}
          >
            <div className="flex flex-col gap-1.5">
              <Label className={agencyFormLabelClass}>Client</Label>
              <AgencyMultiSelectFilter
                label="Select client"
                selectionMode="single"
                values={create.clientId ? [create.clientId] : []}
                options={create.clients.map((client) => ({
                  value: client.id,
                  label: client.name,
                }))}
                onValuesChange={(ids) => create.onClientIdChange(ids[0] ?? "")}
                searchPlaceholder="Search clients"
                triggerClassName="h-10 max-w-none w-full rounded-xl text-sm"
                contentClassName="w-[var(--radix-popover-trigger-width)]"
              />
              {create.errors.client ? (
                <p className="text-xs text-destructive" role="alert">
                  {create.errors.client}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="money-bill-period" className={agencyFormLabelClass}>
                Period
              </Label>
              <MemberProfileLeaveRangePicker
                triggerId="money-bill-period"
                startDate={create.periodStart}
                endDate={create.periodEnd}
                emptyLabel="Select invoice period"
                ariaLabel="Invoice period"
                onRangeChange={(next) => {
                  create.onPeriodStartChange(next.startDate);
                  create.onPeriodEndChange(next.endDate);
                }}
              />
              {create.errors.period ? (
                <p className="text-xs text-destructive" role="alert">
                  {create.errors.period}
                </p>
              ) : null}
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => create.onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form={create.formId} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustmentCreate.open} onOpenChange={adjustmentCreate.onOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add adjustment or cost</DialogTitle>
            <DialogDescription>
              {adjustmentCreate.isSalaryPool
                ? "Set the manual Team salaries total for this period."
                : adjustmentCreate.sectionKey === "extra"
                  ? "Add extra period income. It raises Total income and ROI for this period."
                  : "Create a Debt / Discount, Extra, Charity, or formula-driven PBC line for this period."}
            </DialogDescription>
          </DialogHeader>
          <form
            id={adjustmentCreate.formId}
            className="flex min-h-0 flex-col gap-4 overflow-y-auto"
            noValidate
            onSubmit={adjustmentCreate.onSubmit}
          >
            <div className={agencyFormFieldClass}>
              <Label
                htmlFor={`${adjustmentCreate.formId}-section`}
                className={agencyFormLabelClass}
              >
                Section
              </Label>
              <Select
                value={adjustmentCreate.sectionKey}
                onValueChange={(value) =>
                  adjustmentCreate.onSectionKeyChange(
                    value as (typeof adjustmentCreate.sectionOptions)[number]["id"],
                  )
                }
              >
                <SelectTrigger
                  id={`${adjustmentCreate.formId}-section`}
                  className="h-9 w-full rounded-xl border-default bg-default"
                >
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {adjustmentCreate.sectionOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!adjustmentCreate.isSalaryPool ? (
              <div className={agencyFormFieldClass}>
                <Label
                  htmlFor={`${adjustmentCreate.formId}-label`}
                  className={agencyFormLabelClass}
                >
                  Label
                </Label>
                <Input
                  id={`${adjustmentCreate.formId}-label`}
                  value={adjustmentCreate.label}
                  onChange={(event) => adjustmentCreate.onLabelChange(event.target.value)}
                  placeholder="e.g. Client discount, donation"
                  className="h-9 rounded-xl border-default bg-default text-sm"
                  required
                  aria-invalid={Boolean(adjustmentCreate.errors.label)}
                  aria-describedby={
                    adjustmentCreate.errors.label
                      ? `${adjustmentCreate.formId}-label-error`
                      : undefined
                  }
                />
                {adjustmentCreate.errors.label ? (
                  <p
                    id={`${adjustmentCreate.formId}-label-error`}
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {adjustmentCreate.errors.label}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className={agencyFormFieldClass}>
              <Label htmlFor={`${adjustmentCreate.formId}-amount`} className={agencyFormLabelClass}>
                Amount
              </Label>
              <Input
                id={`${adjustmentCreate.formId}-amount`}
                inputMode="decimal"
                value={adjustmentCreate.amount}
                onChange={(event) => adjustmentCreate.onAmountChange(event.target.value)}
                placeholder="0.00"
                className="h-9 rounded-xl border-default bg-default text-sm tabular-nums"
                required
                aria-invalid={Boolean(adjustmentCreate.errors.amount)}
                aria-describedby={
                  adjustmentCreate.errors.amount
                    ? `${adjustmentCreate.formId}-amount-error`
                    : undefined
                }
              />
              {adjustmentCreate.errors.amount ? (
                <p
                  id={`${adjustmentCreate.formId}-amount-error`}
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {adjustmentCreate.errors.amount}
                </p>
              ) : null}
            </div>
          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => adjustmentCreate.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={adjustmentCreate.formId}
              disabled={adjustmentCreate.isPending}
            >
              {adjustmentCreate.isPending
                ? "Saving…"
                : adjustmentCreate.isSalaryPool
                  ? "Save total"
                  : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payment.open} onOpenChange={payment.onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {payment.partyName} · {payment.referenceLabel}. Remaining {payment.remainingLabel}.
            </DialogDescription>
          </DialogHeader>
          <form id={payment.formId} className="flex flex-col gap-4" onSubmit={payment.onSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="money-bill-payment-amount" className={agencyFormLabelClass}>
                Amount ({payment.currency})
              </Label>
              <Input
                id="money-bill-payment-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={payment.amount}
                onChange={(event) => payment.onAmountChange(event.target.value)}
                className={agencyFormFieldClass}
                required
                aria-invalid={Boolean(payment.validationMessage)}
                aria-describedby={
                  payment.validationMessage ? "money-bill-payment-amount-error" : undefined
                }
              />
              {payment.validationMessage ? (
                <p
                  id="money-bill-payment-amount-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {payment.validationMessage}
                </p>
              ) : null}
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => payment.onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form={payment.formId} disabled={bills.isMutationPending}>
              {bills.isMutationPending ? "Recording…" : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
