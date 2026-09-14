"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const paper =
  "bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.12)] dark:bg-popover dark:shadow-none";

export const floating =
  "bg-background shadow-[0_2px_8px_rgba(0,0,0,0.05),0_20px_48px_-16px_rgba(0,0,0,0.18)] dark:bg-popover dark:shadow-[0_20px_48px_-16px_rgba(0,0,0,0.55)]";

export const field = "bg-foreground/[0.04] dark:bg-foreground/[0.06]";

export const ghostButton =
  "flex items-center justify-center rounded-full text-foreground/45 outline-none transition-[background-color,color,scale] duration-150 hover:bg-foreground/[0.06] hover:text-foreground/90 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-foreground/20 motion-reduce:transition-none dark:hover:bg-foreground/[0.09]";

export const mono = "font-mono text-[11px] tracking-tight";

export function ShimmerLabel({
  active = true,
  className,
  ...props
}: ComponentProps<"span"> & { active?: boolean }) {
  return (
    <span className={cn(active && "shimmer motion-reduce:animate-none", className)} {...props} />
  );
}
