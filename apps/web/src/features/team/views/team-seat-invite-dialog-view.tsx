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
  copy: AgencySeatInviteCopy;
  continuing: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onCancel: () => void;
};

export function TeamSeatInviteDialogView({
  open,
  copy,
  continuing,
  onOpenChange,
  onContinue,
  onCancel,
}: TeamSeatInviteDialogViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={continuing} onClick={onCancel}>
            {copy.secondary}
          </Button>
          <Button type="button" disabled={continuing} onClick={onContinue}>
            {copy.primary}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
