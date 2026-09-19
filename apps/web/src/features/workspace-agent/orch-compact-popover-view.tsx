import { motion } from "motion/react";
import type { ReactNode } from "react";

import {
  ORCH_COMPANION_SCREEN_LAYOUT_ID,
  orchCompanionScreenMorphTransition,
} from "@/features/workspace-agent/orch-companion-screen-morph";
import type { OrchThreadRow } from "@/features/workspace-agent/orch-thread-row";
import { OrchThreadRowView } from "@/features/workspace-agent/orch-thread-row-view";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

type OrchCompactPopoverViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  composer: ReactNode;
  threads: OrchThreadRow[];
  onSelectThread: (id: string) => void;
  onOpenOrch: () => void;
};

export function OrchCompactPopoverView({
  open,
  onOpenChange,
  trigger,
  composer,
  threads,
  onSelectThread,
  onOpenOrch,
}: OrchCompactPopoverViewProps) {
  const liveCount = threads.length;
  const hint =
    liveCount === 0 ? "Enter to send" : `${liveCount} live · Enter to send · Open Orch for threads`;
  // Staged entrance cascade (ms): composer → hint/body → CTA. Capped so a
  // long thread list still settles with the panel.
  const bodyDelay = (index: number) => 140 + Math.min(index, 4) * 45;
  const ctaDelay = 200 + Math.min(liveCount, 3) * 45;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="orch-compact-morph w-[min(calc(100vw-1rem),22.5rem)] overflow-hidden rounded-[20.8px] p-0"
        data-workspace-agent-overlay
      >
        <div
          className="orch-compact-rise border-b border-border px-3 py-2"
          style={{ animationDelay: "30ms" }}
        >
          {composer}
        </div>
        <p
          className="orch-compact-rise px-3 py-1.5 font-mono text-[11px] leading-4 text-muted-foreground"
          style={{ animationDelay: "90ms" }}
        >
          {hint}
        </p>

        <div className="max-h-64 overflow-y-auto px-1.5 pb-1">
          {threads.length === 0 ? (
            <p
              className="orch-compact-rise px-2 py-2.5 text-sm text-muted-foreground"
              style={{ animationDelay: "140ms" }}
            >
              Send to start a thread.
            </p>
          ) : (
            threads.map((thread, index) => (
              <div
                key={thread.id}
                className="orch-compact-rise"
                style={{ animationDelay: `${bodyDelay(index)}ms` }}
              >
                <OrchThreadRowView thread={thread} onSelect={() => onSelectThread(thread.id)} />
              </div>
            ))
          )}
        </div>

        <div
          className="orch-compact-rise border-t border-border p-2.5"
          style={{ animationDelay: `${ctaDelay}ms` }}
        >
          <motion.button
            type="button"
            layoutId={ORCH_COMPANION_SCREEN_LAYOUT_ID}
            transition={orchCompanionScreenMorphTransition}
            className={cn(
              "inline-flex h-8 w-full transform-gpu items-center justify-center rounded-[14.4px]",
              "bg-foreground text-sm font-semibold text-background will-change-transform",
              "transition-colors hover:bg-foreground/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            onClick={onOpenOrch}
          >
            Open Orch
          </motion.button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
