import type { FormEventHandler, ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

const SIZE_CLASS = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-xl",
} as const;

export const agencyDialogChipTriggerClass =
  "h-8 min-h-8 w-fit max-w-full rounded-full border-default bg-elevated px-2.5 py-0 text-xs font-semibold";

type AgencyCompactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: keyof typeof SIZE_CLASS;
  showCloseButton?: boolean;
  children: ReactNode;
  className?: string;
};

export function AgencyCompactDialog({
  open,
  onOpenChange,
  size = "sm",
  showCloseButton = true,
  children,
  className,
}: AgencyCompactDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          "flex max-h-[min(90vh,44rem)] flex-col gap-0 overflow-hidden p-0",
          "duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] motion-reduce:duration-0",
          SIZE_CLASS[size],
          className,
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

type AgencyCompactDialogHeaderProps = {
  title: string;
  description?: string;
  badge?: ReactNode;
};

export function AgencyCompactDialogHeader({
  title,
  description,
  badge,
}: AgencyCompactDialogHeaderProps) {
  return (
    <DialogHeader className="space-y-1 border-b border-default px-4 py-3 pr-14 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <DialogTitle className="text-base font-semibold tracking-tight text-highlighted">
          {title}
        </DialogTitle>
        {badge}
      </div>
      {description ? (
        <DialogDescription className="text-xs text-muted text-pretty">
          {description}
        </DialogDescription>
      ) : (
        <DialogDescription className="sr-only">{title}</DialogDescription>
      )}
    </DialogHeader>
  );
}

type AgencyCompactDialogFormProps = {
  id?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  noValidate?: boolean;
  children: ReactNode;
};

export function AgencyCompactDialogForm({
  id,
  onSubmit,
  noValidate,
  children,
}: AgencyCompactDialogFormProps) {
  return (
    <form
      id={id}
      className="flex min-h-0 flex-1 flex-col"
      noValidate={noValidate}
      onSubmit={onSubmit}
    >
      {children}
    </form>
  );
}

export function AgencyCompactDialogBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3.5">
      {children}
    </div>
  );
}

/** Meta chips under the hero: client, mode, date, people. */
export function AgencyCompactDialogMeta({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}

export function AgencyCompactDialogFooter({ children }: { children: ReactNode }) {
  return (
    <DialogFooter className="border-t border-default px-4 py-2.5 sm:justify-end">
      {children}
    </DialogFooter>
  );
}
