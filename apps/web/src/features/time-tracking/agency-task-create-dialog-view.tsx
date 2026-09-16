import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { AgencyEntityIconPickerView } from "@/features/shared/agency-entity-icon-picker-view";
import { agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 border-b border-default px-5 py-4 text-left">
          <DialogTitle className="text-base font-bold text-highlighted">Create Task</DialogTitle>
        </DialogHeader>

        <form id={formId} onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-4 px-5 py-4">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task name"
              autoFocus
              disabled={isPending}
              className={cn(
                "h-9 rounded-lg border-default bg-default text-sm",
                agencyInputPlaceholderClass,
              )}
            />
            <AgencyEntityIconPickerView
              name={title}
              value={iconKey}
              onChange={setIconKey}
              disabled={isPending}
            />
          </div>

          <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
