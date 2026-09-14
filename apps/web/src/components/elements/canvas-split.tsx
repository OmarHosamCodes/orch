"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { paper } from "./surfaces";

export function CanvasSplit({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="canvas-split"
      className={cn(
        paper,
        "flex w-full max-w-3xl flex-col overflow-hidden rounded-[20px] md:h-80 md:flex-row",
        className,
      )}
      {...props}
    />
  );
}

export function CanvasSplitThread({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="canvas-split-thread"
      className={cn(
        "border-foreground/[0.07] flex flex-col gap-3 border-b p-4 md:w-[15rem] md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

export function CanvasSplitDocument({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="canvas-split-document"
      className={cn("flex min-w-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}
