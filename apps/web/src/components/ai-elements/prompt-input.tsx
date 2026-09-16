import type {
  ButtonHTMLAttributes,
  FormEvent,
  HTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

export function PromptInput({
  className,
  children,
  onSubmit,
  ...props
}: HTMLAttributes<HTMLFormElement> & { onSubmit?: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form
      data-slot="ai-prompt-input"
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-sm",
        className,
      )}
      onSubmit={onSubmit}
      {...props}
    >
      {children}
    </form>
  );
}

export function PromptInputTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      data-slot="ai-prompt-input-textarea"
      rows={1}
      className={cn(
        "max-h-32 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base outline-none placeholder:text-muted-foreground/80",
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputToolbar({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-slot="ai-prompt-input-toolbar"
      className={cn("flex items-center justify-between gap-2", className)}
    >
      {children}
    </div>
  );
}

export function PromptInputTools({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("flex min-w-0 items-center gap-1.5", className)}>{children}</div>;
}

export function PromptInputSubmit({
  className,
  disabled,
  children,
  ...props
}: {
  className?: string;
  disabled?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
