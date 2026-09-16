import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { AgencyEntityIconPickerView } from "@/features/shared/agency-entity-icon-picker-view";
import { agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import { AGENCY_CURRENCY_OPTIONS, formatRate } from "@/features/shared/format-rate";
import type { AgencyMyTasksEditDialogViewModel } from "@/features/task-management/hooks/use-agency-my-tasks-edit-dialog";
import { AgencyMyTasksEstimatePopover } from "@/features/task-management/my-tasks-rail/agency-my-tasks-estimate-popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

type AgencyMyTasksEditDialogViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewModel: AgencyMyTasksEditDialogViewModel;
};

export function AgencyMyTasksEditDialogView({
  open,
  onOpenChange,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader className="space-y-1 border-b border-default px-5 py-4 text-left">
          <DialogTitle className="text-base font-bold text-highlighted">Edit task</DialogTitle>
        </DialogHeader>

        <form id={formId} onSubmit={(event) => void handleSubmit(event)}>
          <div className="flex flex-col gap-3 px-5 py-4">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task name"
              autoFocus
              disabled={pending}
              className={cn(
                "h-9 rounded-lg border-default bg-default text-sm",
                agencyInputPlaceholderClass,
              )}
            />

            <AgencyEntityIconPickerView
              name={title}
              value={iconKey}
              onChange={setIconKey}
              disabled={pending}
            />

            <div className="flex flex-wrap items-center gap-2">
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
                disabled={pending}
                className="shrink-0"
              />
              <p
                className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
                title={projectLabel}
              >
                {projectLabel}
              </p>
              <AgencyMyTasksEstimatePopover
                value={estimateMinutes}
                disabled={pending}
                onChange={setEstimateMinutes}
              />
            </div>

            {isOwner ? (
              <div className="space-y-1.5 border-t border-default pt-3">
                <Label htmlFor={`${formId}-task-rate`} className="text-[11px] font-bold">
                  Task rate / hour
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`${formId}-task-rate`}
                    value={billableRateDraft}
                    onChange={(event) => setBillableRateDraft(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Inherit project/client rate"
                    disabled={pending}
                    className="h-9 min-w-0 flex-1"
                  />
                  <Select
                    value={billableRateCurrency}
                    onValueChange={setBillableRateCurrency}
                    disabled={pending}
                  >
                    <SelectTrigger aria-label="Rate currency" className="h-9 w-[5.5rem] shrink-0">
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
                {ratePreviewAmount != null ? (
                  <p className="text-[11px] text-muted">
                    ≈ {formatRate(ratePreviewAmount, agencyCurrency, { perHour: true })}
                  </p>
                ) : null}
                <p className="text-[11px] text-muted">
                  Parent default:{" "}
                  {formatRate(parentRateAmount, parentRateCurrency, { perHour: true })}
                </p>
                <p className="text-[11px] text-muted">
                  Effective now:{" "}
                  {formatRate(effectiveRateAmount, effectiveRateCurrency, { perHour: true })}
                </p>
              </div>
            ) : (
              <div className="space-y-1 border-t border-default pt-3 text-[11px] text-muted">
                <p>
                  Effective rate:{" "}
                  {formatRate(effectiveRateAmount, effectiveRateCurrency, { perHour: true })}
                </p>
              </div>
            )}

            {editError ? (
              <p className="text-xs text-destructive" role="alert">
                {editError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit} form={formId}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
