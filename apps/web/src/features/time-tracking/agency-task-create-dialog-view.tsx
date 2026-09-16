import { Button } from "@/ui/button";
import {
  AgencyCompactDialog,
  AgencyCompactDialogBody,
  AgencyCompactDialogFooter,
  AgencyCompactDialogForm,
  AgencyCompactDialogHeader,
} from "@/features/shared/dialog-kit/agency-compact-dialog-shell";
import { AgencyIdentityField } from "@/features/shared/dialog-kit/agency-identity-field";
import type { AgencyTaskCreateDialogViewModel } from "@/features/time-tracking/hooks/use-agency-task-create-dialog";

type AgencyTaskCreateDialogViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewModel: AgencyTaskCreateDialogViewModel;
};

export function AgencyTaskCreateDialogView({
  open,
  onOpenChange,
  viewModel,
}: AgencyTaskCreateDialogViewProps) {
  const { formId, title, setTitle, iconKey, setIconKey, canSubmit, isPending, handleSubmit } =
    viewModel;

  return (
    <AgencyCompactDialog open={open} onOpenChange={onOpenChange} showCloseButton={!isPending}>
      <AgencyCompactDialogHeader title="Create Task" />
      <AgencyCompactDialogForm id={formId} onSubmit={(event) => void handleSubmit(event)}>
        <AgencyCompactDialogBody>
          <AgencyIdentityField
            value={title}
            onChange={setTitle}
            placeholder="Task name"
            autoFocus
            disabled={isPending}
            iconKey={iconKey}
            onIconChange={setIconKey}
            aria-label="Task name"
          />
        </AgencyCompactDialogBody>
        <AgencyCompactDialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canSubmit} form={formId}>
            Save
          </Button>
        </AgencyCompactDialogFooter>
      </AgencyCompactDialogForm>
    </AgencyCompactDialog>
  );
}
