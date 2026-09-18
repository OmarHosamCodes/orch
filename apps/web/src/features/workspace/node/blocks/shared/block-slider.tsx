import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function BlockSlider({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="range"
      className={cn(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary",
        className,
      )}
      {...props}
    />
  );
}
