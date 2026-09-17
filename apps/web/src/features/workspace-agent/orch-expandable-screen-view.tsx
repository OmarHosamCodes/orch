import { motion } from "motion/react";
import type { ReactNode } from "react";

import {
  ORCH_COMPANION_SCREEN_LAYOUT_ID,
  orchCompanionScreenContentFade,
  orchCompanionScreenMorphTransition,
} from "@/features/workspace-agent/orch-companion-screen-morph";
import {
  OrchSettleListView,
  type OrchSettleThreadRow,
} from "@/features/workspace-agent/orch-settle-list-view";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

type OrchExpandableScreenViewProps = {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  canSettle: boolean;
  settlingThreadId: string | null;
  openThreads: OrchSettleThreadRow[];
  settledThreads: OrchSettleThreadRow[];
  settledOpen: boolean;
  onSettledOpenChange: (open: boolean) => void;
  activeConversationId: string | null;
  onSelectThread: (id: string) => void;
  onSettleThread: (id: string) => void;
  onUnsettle: (id: string) => void;
  onNewThread: () => void;
  onCollapse: () => void;
  children: ReactNode;
};

export function OrchExpandableScreenView({
  title,
  search,
  onSearchChange,
  canSettle,
  settlingThreadId,
  openThreads,
  settledThreads,
  settledOpen,
  onSettledOpenChange,
  activeConversationId,
  onSelectThread,
  onSettleThread,
  onUnsettle,
  onNewThread,
  onCollapse,
  children,
}: OrchExpandableScreenViewProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed z-50",
        "inset-0 max-md:pt-[env(safe-area-inset-top)]",
        "md:inset-x-0 md:bottom-0 md:top-[var(--app-shell-context-bar-height)] md:ps-[var(--app-shell-rail-width)]",
      )}
      data-workspace-agent-root
    >
      <motion.section
        layoutId={ORCH_COMPANION_SCREEN_LAYOUT_ID}
        transition={orchCompanionScreenMorphTransition}
        role="dialog"
        aria-label="Orch"
        aria-modal="true"
        className={cn(
          "pointer-events-auto absolute flex transform-gpu flex-col overflow-hidden bg-card will-change-transform",
          "inset-0 max-md:rounded-none max-md:border-0 max-md:shadow-none",
          "md:inset-1 md:rounded-[20px] md:border md:border-border/50 md:shadow-2xl md:ring-1 md:ring-foreground/5",
        )}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={orchCompanionScreenContentFade}
          className="flex min-h-0 min-w-0 flex-1"
        >
          <OrchSettleListView
            search={search}
            onSearchChange={onSearchChange}
            canSettle={canSettle}
            settlingThreadId={settlingThreadId}
            openThreads={openThreads}
            settledThreads={settledThreads}
            settledOpen={settledOpen}
            onSettledOpenChange={onSettledOpenChange}
            activeConversationId={activeConversationId}
            onSelectThread={onSelectThread}
            onSettleThread={onSettleThread}
            onUnsettle={onUnsettle}
            onNewThread={onNewThread}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
              <p className="min-w-0 truncate text-sm font-semibold">{title}</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 text-muted-foreground"
                aria-label="Collapse"
                onClick={onCollapse}
              >
                Collapse
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}
