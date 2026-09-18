import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ShellLiquidBadgeProps = {
  visible: boolean;
  children: ReactNode;
  className?: string;
};

/** Notification overflow badge without blocking the bell hit target. */
export function ShellLiquidBadge({ visible, children, className }: ShellLiquidBadgeProps) {
  if (!visible) return null;

  return (
    <span
      className={cn(
        "absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
