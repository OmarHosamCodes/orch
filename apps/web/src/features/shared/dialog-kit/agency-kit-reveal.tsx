import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AgencyKitRevealProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
};

/** Extra dialog rows morph in via grid-template-rows — no height/layout thrash. */
export function AgencyKitReveal({ open, children, className }: AgencyKitRevealProps) {
  return (
    <div
      data-open={open ? "true" : "false"}
      className={cn(
        "grid transition-[grid-template-rows] duration-[var(--motion-duration-base)] ease-[var(--motion-ease-out)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
