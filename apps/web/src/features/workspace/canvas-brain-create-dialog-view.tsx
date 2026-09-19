import type { FormEvent } from "react";

import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import { AgencyIdentityField } from "@/features/shared/dialog-kit/agency-identity-field";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";

export type CanvasBrainCreateDialogViewProps = {
  formId: string;
  open: boolean;
  title: string;
  instructions: string;
  iconKey: AgencyEntityIconKey | null;
  colorHueId: number | null;
  errorMessage: string | null;
  isPending: boolean;
  canSubmit: boolean;
  setTitle: (value: string) => void;
  setInstructions: (value: string) => void;
  setIconKey: (value: AgencyEntityIconKey | null) => void;
  setColorHueId: (value: number) => void;
  onOpenChange: (open: boolean) => void;
  handleSubmit: (event: FormEvent) => void;
};

export function CanvasBrainCreateDialogView({
  formId,
  open,
  title,
  instructions,
  iconKey,
  colorHueId,
  errorMessage,
  isPending,
  canSubmit,
  setTitle,
  setInstructions,
  setIconKey,
  setColorHueId,
  onOpenChange,
  handleSubmit,
}: CanvasBrainCreateDialogViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New brain</DialogTitle>
          <DialogDescription>
            A named Canvas with its own board, knowledge, and Orch thread.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-title`}>Name</Label>
            <AgencyIdentityField
              id={`${formId}-title`}
              value={title}
              onChange={setTitle}
              placeholder="Client X"
              autoFocus
              disabled={isPending}
              iconKey={iconKey}
              onIconChange={setIconKey}
              colorHueId={colorHueId}
              onColorHueChange={setColorHueId}
              projectId="canvas-brain-create"
              aria-label="Brain name"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-instructions`}>Instructions</Label>
            <Textarea
              id={`${formId}-instructions`}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Optional. What this brain is for."
              disabled={isPending}
            />
          </div>
          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!canSubmit}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
