import { Minimize2 } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import {
  OrchSettleListView,
  type OrchSettleThreadRow,
} from "@/features/workspace-agent/orch-settle-list-view";
import { Button } from "@/ui/button";

const ORCH_SCREEN_LAYOUT_ID = "orch-companion-screen";

type OrchExpandableScreenViewProps = {
  search: string;
  onSearchChange: (value: string) => void;
  canSettle: boolean;
  onSettle: () => void;
  settling: boolean;
  openThreads: OrchSettleThreadRow[];
  settledThreads: OrchSettleThreadRow[];
  settledOpen: boolean;
  onSettledOpenChange: (open: boolean) => void;
  activeConversationId: string | null;
  onSelectThread: (id: string) => void;
  onUnsettle: (id: string) => void;
  onCollapse: () => void;
  children: ReactNode;
};

export function OrchExpandableScreenView({
  search,
  onSearchChange,
  canSettle,
  onSettle,
  settling,
  openThreads,
  settledThreads,
  settledOpen,
  onSettledOpenChange,
  activeConversationId,
  onSelectThread,
  onUnsettle,
  onCollapse,
  children,
}: OrchExpandableScreenViewProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center p-3 pt-14 sm:p-6 sm:pt-16">
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 bg-background/40"
        aria-label="Collapse Orch"
        onClick={onCollapse}
      />
      <motion.section
        layoutId={ORCH_SCREEN_LAYOUT_ID}
        role="dialog"
        aria-label="Orch"
        className="pointer-events-auto relative flex h-[min(100vh-5.5rem,44rem)] w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        data-workspace-agent-root
      >
        <OrchSettleListView
          search={search}
          onSearchChange={onSearchChange}
          canSettle={canSettle}
          onSettle={onSettle}
          settling={settling}
          openThreads={openThreads}
          settledThreads={settledThreads}
          settledOpen={settledOpen}
          onSettledOpenChange={onSettledOpenChange}
          activeConversationId={activeConversationId}
          onSelectThread={onSelectThread}
          onUnsettle={onUnsettle}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex justify-end border-b border-border px-2 py-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Collapse"
              onClick={onCollapse}
            >
              <Minimize2 className="size-4" />
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </motion.section>
    </div>
  );
}
