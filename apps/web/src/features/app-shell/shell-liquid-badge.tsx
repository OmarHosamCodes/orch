import { Liquid } from "liquid-gooey";
import type { ReactNode } from "react";

import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type ShellLiquidBadgeProps = {
  visible: boolean;
  children: ReactNode;
  className?: string;
};

/** Notification overflow badge that melts in/out without blocking the bell hit target. */
export function ShellLiquidBadge({ visible, children, className }: ShellLiquidBadgeProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (!visible) return null;

  if (reducedMotion) {
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

  return (
    <Liquid
      className="pointer-events-none absolute -right-1 -top-1 z-[1]"
      fill="var(--color-primary)"
      blur={4}
      contrast={14}
      filterPadding={8}
    >
      <Liquid.Item transition="snappy">
        <span
          className={cn(
            "inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-4 text-primary-foreground",
            className,
          )}
        >
          {children}
        </span>
      </Liquid.Item>
    </Liquid>
  );
}
