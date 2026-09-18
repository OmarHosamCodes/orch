import type { AgencySeatInviteCopy } from "@/features/billing/agency-paywall-copy";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

type TeamSeatInviteDialogViewProps = {
  open: boolean;
  copy: AgencySeatInviteCopy | null;
  copyPending: boolean;
  continuing: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onCancel: () => void;
};

export function TeamSeatInviteDialogView({
  open,
  copy,
  copyPending,
  continuing,
  onOpenChange,
  onContinue,
  onCancel,
}: TeamSeatInviteDialogViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{copy?.title ?? "Add a seat"}</DialogTitle>
          <DialogDescription>
            {copyPending ? "Checking team billing…" : (copy?.body ?? "")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={continuing} onClick={onCancel}>
            {copy?.secondary ?? "Cancel"}
          </Button>
          <Button type="button" disabled={continuing || copyPending || !copy} onClick={onContinue}>
            {copy?.primary ?? "Continue to checkout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
