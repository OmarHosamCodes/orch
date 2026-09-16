import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import { Input } from "@/ui/input";

export type OrchSettleThreadRow = {
  id: string;
  title: string;
  preview: string;
  running: boolean;
  unread: boolean;
};

type OrchSettleListViewProps = {
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
};

export function OrchSettleListView({
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
}: OrchSettleListViewProps) {
  return (
    <div className="flex h-full min-h-0 w-full max-w-[16rem] shrink-0 flex-col border-e border-border">
      <div className="flex items-center gap-2 border-b border-border p-2">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search"
          aria-label="Search threads"
          className="h-8"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          disabled={!canSettle || settling}
          onClick={onSettle}
        >
          Settle
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {openThreads.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">No open threads.</p>
        ) : (
          openThreads.map((thread) => (
            <SettleRow
              key={thread.id}
              thread={thread}
              active={thread.id === activeConversationId}
              onSelect={() => onSelectThread(thread.id)}
            />
          ))
        )}
      </div>
      <Collapsible open={settledOpen} onOpenChange={onSettledOpenChange}>
        <CollapsibleTrigger className="flex w-full items-center justify-between border-t border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent">
          Settled ({settledThreads.length})
          <ChevronDown
            className={cn("size-3.5 transition-transform", settledOpen && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="max-h-40 overflow-y-auto pb-2">
          {settledThreads.map((thread) => (
            <div key={thread.id} className="flex items-center gap-1 px-1">
              <SettleRow
                thread={thread}
                active={thread.id === activeConversationId}
                onSelect={() => onSelectThread(thread.id)}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 px-2 text-[11px]"
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

function SettleRow({
  thread,
  active,
  onSelect,
}: {
  thread: OrchSettleThreadRow;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 rounded-md px-2 py-1.5 text-start",
        active ? "bg-accent" : "hover:bg-accent/70",
      )}
    >
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px]">{thread.title}</span>
        {thread.running ? (
          <span className="size-1.5 shrink-0 rounded-full bg-[#5b5bd6] motion-safe:animate-pulse" />
        ) : thread.unread ? (
          <span className="size-1.5 shrink-0 rounded-full bg-[#5b5bd6]" />
        ) : null}
      </span>
      {thread.preview ? (
        <span className="line-clamp-1 text-[11px] text-muted-foreground">{thread.preview}</span>
      ) : null}
    </button>
  );
}
