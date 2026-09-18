import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Message({
  from,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { from: "user" | "assistant" | "system" }) {
  return (
    <article
      data-slot="ai-message"
      data-from={from}
      className={cn(
        "mb-3 flex w-full",
        from === "user" ? "justify-end" : "justify-start",
        className,
      )}
      {...props}
    >
      {children}
    </article>
  );
}

export function MessageContent({
  from,
  className,
  children,
}: {
  from: "user" | "assistant" | "system";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-slot="ai-message-content"
      className={cn(
        "max-w-[85%] rounded-xl px-3 py-2 text-sm wrap-break-word",
        from === "user" ? "bg-muted text-foreground" : "bg-transparent text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
