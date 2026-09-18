import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Conversation({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="ai-conversation"
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

export function ConversationContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="ai-conversation-content"
      className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-3", className)}
      {...props}
    />
  );
}

export function ConversationEmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full items-center justify-center px-4 text-center", className)}>
      {children}
    </div>
  );
}
