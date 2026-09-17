import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import { AGENCY_CURRENCY_OPTIONS, formatRate } from "@/features/shared/format-rate";
import {
  AgencyCompactDialog,
  AgencyCompactDialogBody,
  AgencyCompactDialogFooter,
  AgencyCompactDialogForm,
  AgencyCompactDialogHeader,
  AgencyCompactDialogMeta,
} from "@/features/shared/dialog-kit/agency-compact-dialog-shell";
import { AgencyIdentityField } from "@/features/shared/dialog-kit/agency-identity-field";
import { AgencyMoneyPair } from "@/features/shared/dialog-kit/agency-money-pair";
import type { AgencyMyTasksEditDialogViewModel } from "@/features/task-management/hooks/use-agency-my-tasks-edit-dialog";
import { AgencyMyTasksEstimatePopover } from "@/features/task-management/my-tasks-rail/agency-my-tasks-estimate-popover";
import { Button } from "@/ui/button";

type AgencyMyTasksEditDialogViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEditRecords: boolean;
  viewModel: AgencyMyTasksEditDialogViewModel;
};

export function AgencyMyTasksEditDialogView({
  open,
  onOpenChange,
  canEditRecords,
  viewModel,
}: AgencyMyTasksEditDialogViewProps) {
  const {
    formId,
    projectLabel,
    members,
    title,
    setTitle,
    iconKey,
    setIconKey,
    assignedToTeam,
    setAssignedToTeam,
    assigneeUserIds,
    setAssigneeUserIds,
    estimateMinutes,
    setEstimateMinutes,
    isOwner,
    billableRateDraft,
    setBillableRateDraft,
    billableRateCurrency,
    setBillableRateCurrency,
    parentRateAmount,
    parentRateCurrency,
    effectiveRateAmount,
    effectiveRateCurrency,
    agencyCurrency,
    ratePreviewAmount,
    canSubmit,
    pending,
    editError,
    handleSubmit,
    onCancel,
  } = viewModel;

  const fieldsDisabled = pending || !canEditRecords;

  return (
    <AgencyCompactDialog open={open} onOpenChange={onOpenChange} showCloseButton={!pending}>
      <AgencyCompactDialogHeader title="Edit task" description={projectLabel} />
      <AgencyCompactDialogForm
        id={formId}
        onSubmit={(event) => {
          if (!canEditRecords) {
            event.preventDefault();
            return;
          }
          void handleSubmit(event);
        }}
      >
        <AgencyCompactDialogBody>
          <AgencyIdentityField
            value={title}
            onChange={setTitle}
            placeholder="Task name"
            autoFocus={canEditRecords}
            disabled={fieldsDisabled}
            iconKey={iconKey}
            onIconChange={setIconKey}
            aria-label="Task name"
            error={editError}
          />

          <AgencyCompactDialogMeta>
            <AgencyMemberChooser
              mode="multiple"
              assignedToTeam={assignedToTeam}
              selectedUserIds={assigneeUserIds}
              onAssignedToTeamChange={(nextAssignedToTeam) => {
                setAssignedToTeam(nextAssignedToTeam);
              }}
              onSelectedUserIdsChange={(nextIds) => {
                setAssigneeUserIds(nextIds);
              }}
              members={members}
              placeholder="Assignees"
              triggerVariant="stack"
              contentAlign="start"
              disabled={fieldsDisabled}
              className="shrink-0"
            />
            <AgencyMyTasksEstimatePopover
              value={estimateMinutes}
              disabled={fieldsDisabled}
              onChange={setEstimateMinutes}
            />
          </AgencyCompactDialogMeta>

          {isOwner ? (
            <AgencyMoneyPair
              id={`${formId}-task-rate`}
              label="Task rate / hour"
              amount={billableRateDraft}
              onAmountChange={setBillableRateDraft}
              currency={billableRateCurrency}
              onCurrencyChange={setBillableRateCurrency}
              currencyOptions={AGENCY_CURRENCY_OPTIONS}
              placeholder="Inherit"
              disabled={fieldsDisabled}
              preview={
                ratePreviewAmount != null
                  ? `≈ ${formatRate(ratePreviewAmount, agencyCurrency, { perHour: true })}`
                  : `Parent ${formatRate(parentRateAmount, parentRateCurrency, { perHour: true })} · now ${formatRate(effectiveRateAmount, effectiveRateCurrency, { perHour: true })}`
              }
            />
          ) : (
            <p className="text-[11px] text-muted">
              Effective rate:{" "}
              {formatRate(effectiveRateAmount, effectiveRateCurrency, { perHour: true })}
            </p>
          )}
        </AgencyCompactDialogBody>
        <AgencyCompactDialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            {canEditRecords ? "Cancel" : "Close"}
          </Button>
          {canEditRecords ? (
            <Button type="submit" size="sm" disabled={!canSubmit} form={formId}>
              Save
            </Button>
          ) : null}
        </AgencyCompactDialogFooter>
      </AgencyCompactDialogForm>
    </AgencyCompactDialog>
  );
}
