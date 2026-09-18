import { ChevronDown, Plus } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";

import { cn } from "@/lib/utils";
import type { OrchThreadRow } from "@/features/workspace-agent/orch-thread-row";
import {
  orchSettleRowExitTransition,
  orchSettleRowLayoutTransition,
} from "@/features/workspace-agent/orch-settle-row-morph";
import { OrchThreadRowView } from "@/features/workspace-agent/orch-thread-row-view";
import { Button } from "@/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import { Input } from "@/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

export type OrchSettleThreadRow = OrchThreadRow;

type OrchSettleListViewProps = {
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
};

export function OrchSettleListView({
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
}: OrchSettleListViewProps) {
  return (
    <div className="relative z-10 flex h-full min-h-0 w-[15.5rem] shrink-0 flex-col overflow-hidden border-e border-border bg-muted/40 max-md:w-44">
      <div className="border-b border-border p-2.5">
        <div className="flex items-center gap-1.5">
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            aria-label="Search threads"
            className="h-8 min-w-0 flex-1 rounded-[14.4px]"
          />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8 shrink-0 rounded-[14.4px]"
                  aria-label="New thread"
                  onClick={onNewThread}
                >
                  <Plus className="size-3.5" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">New thread</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {openThreads.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">No open threads.</p>
        ) : (
          <LayoutGroup id="orch-settle-open-threads">
            <AnimatePresence initial={false} mode="popLayout">
              {openThreads.map((thread) => (
                <motion.div
                  key={thread.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    scale: 0.96,
                    height: 0,
                    marginBottom: 0,
                    filter: "blur(2px)",
                    transition: orchSettleRowExitTransition,
                  }}
                  transition={orchSettleRowLayoutTransition}
                  className="mb-1 overflow-hidden"
                >
                  <OrchThreadRowView
                    thread={thread}
                    variant="settle"
                    active={thread.id === activeConversationId}
                    canSettle={canSettle}
                    settling={settlingThreadId === thread.id}
                    onSelect={() => onSelectThread(thread.id)}
                    onSettle={() => onSettleThread(thread.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </LayoutGroup>
        )}
      </div>
      <Collapsible open={settledOpen} onOpenChange={onSettledOpenChange}>
        <CollapsibleTrigger className="flex w-full items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted">
          Settled ({settledThreads.length})
          <ChevronDown
            className={cn("size-3.5 transition-transform", settledOpen && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="max-h-48 overflow-y-auto px-1 pb-2">
          {settledThreads.map((thread) => (
            <div key={thread.id} className="flex flex-col">
              <OrchThreadRowView
                thread={thread}
                active={thread.id === activeConversationId}
                onSelect={() => onSelectThread(thread.id)}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mb-1 h-7 self-start px-2 text-[11px] text-muted-foreground"
                onClick={() => onUnsettle(thread.id)}
              >
                Restore
              </Button>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
