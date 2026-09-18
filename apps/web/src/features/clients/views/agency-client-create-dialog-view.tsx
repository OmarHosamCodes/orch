import { AGENCY_CURRENCY_OPTIONS } from "@/features/shared/format-rate";
import {
  AgencyCompactDialog,
  AgencyCompactDialogBody,
  AgencyCompactDialogFooter,
  AgencyCompactDialogForm,
  AgencyCompactDialogHeader,
} from "@/features/shared/dialog-kit/agency-compact-dialog-shell";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

import type { AgencyClientCreateDialogViewModel } from "../hooks/use-agency-client-create-dialog";

type AgencyClientCreateDialogViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewModel: AgencyClientCreateDialogViewModel;
};

export function AgencyClientCreateDialogView({
  open,
  onOpenChange,
  viewModel,
}: AgencyClientCreateDialogViewProps) {
  const {
    formId,
    name,
    setName,
    category,
    setCategory,
    billableRate,
    setBillableRate,
    currency,
    setCurrency,
    canEditRates,
    rateInvalid,
    canSubmit,
    isClientMutationPending,
    handleSubmit,
  } = viewModel;

  return (
    <AgencyCompactDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      showCloseButton={!isClientMutationPending}
    >
      <AgencyCompactDialogHeader title="New client" />
      <AgencyCompactDialogForm id={formId} onSubmit={(event) => void handleSubmit(event)}>
        <AgencyCompactDialogBody>
          <Input
            id={`${formId}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Client name"
            aria-label="Client name"
            autoFocus
            disabled={isClientMutationPending}
          />
          {canEditRates ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-category`} className="text-xs font-medium">
                  Category
                </Label>
                <Select
                  value={category}
                  onValueChange={(value) =>
                    setCategory(value === "internal" ? "internal" : "external")
                  }
                  disabled={isClientMutationPending}
                >
                  <SelectTrigger id={`${formId}-category`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-rate`} className="text-xs font-medium">
                  Billable rate / hour
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`${formId}-rate`}
                    value={billableRate}
                    onChange={(event) => setBillableRate(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional"
                    className="min-w-0 flex-1"
                    disabled={isClientMutationPending}
                    aria-invalid={rateInvalid || undefined}
                  />
                  <Select
                    value={currency}
                    onValueChange={setCurrency}
                    disabled={isClientMutationPending}
                  >
                    <SelectTrigger aria-label="Rate currency" className="w-[5.5rem] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENCY_CURRENCY_OPTIONS.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : null}
        </AgencyCompactDialogBody>
        <AgencyCompactDialogFooter>
          <Button type="submit" size="sm" disabled={!canSubmit} form={formId}>
            Create client
          </Button>
        </AgencyCompactDialogFooter>
      </AgencyCompactDialogForm>
    </AgencyCompactDialog>
  );
}
