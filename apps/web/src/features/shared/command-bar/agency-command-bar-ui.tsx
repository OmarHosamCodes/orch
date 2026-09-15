import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

export const agencyCommandBarFilterTriggerClass = cn(
  "inline-flex h-9 min-w-32 max-w-44 overflow-hidden items-center justify-between gap-2 rounded-xl border border-default bg-default px-3 text-left text-xs font-semibold transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
  agencyFocusRingClass,
);
