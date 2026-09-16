import { ArrowUp, Plus, Square } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import type { AgentTextAttachment } from "@orch/agent/types";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

type OrchCompactThreadRow = {
  id: string;
  title: string;
  preview: string;
  running: boolean;
  unread: boolean;
};

type OrchCompactPopoverViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  draft: string;
  onDraftChange: (draft: string) => void;
  canSend: boolean;
  isStreaming: boolean;
  pendingAttachments: AgentTextAttachment[];
  onPickFiles: (files: File[]) => void;
  onSend: () => void;
  onStop: () => void;
  threads: OrchCompactThreadRow[];
  onSelectThread: (id: string) => void;
  onOpenOrch: () => void;
};

export function OrchCompactPopoverView({
  open,
  onOpenChange,
  trigger,
  draft,
  onDraftChange,
  canSend,
  isStreaming,
  pendingAttachments,
  onPickFiles,
  onSend,
  onStop,
  threads,
  onSelectThread,
  onOpenOrch,
}: OrchCompactPopoverViewProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSend || isStreaming) return;
    onSend();
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-[min(calc(100vw-1rem),22rem)] p-0"
        data-workspace-agent-overlay
      >
        <form onSubmit={handleSubmit} className="border-b border-border p-2">
          {pendingAttachments.length > 0 ? (
            <p className="mb-1.5 truncate px-1 text-[11px] text-muted-foreground">
              {pendingAttachments.map((file) => file.filename).join(", ")}
            </p>
          ) : null}
          <div className="flex items-end gap-1.5">
            <label className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <Plus className="size-4" aria-hidden />
              <span className="sr-only">Attach</span>
              <input
                type="file"
                className="sr-only"
                tabIndex={-1}
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 0) onPickFiles(files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <textarea
              rows={1}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canSend && !isStreaming) onSend();
                }
              }}
              placeholder="Message Orch"
              aria-label="Compact message"
              className="min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            {isStreaming ? (
              <button
                type="button"
                aria-label="Stop"
                className="inline-flex size-8 items-center justify-center rounded-full bg-foreground text-background"
                onClick={onStop}
              >
                <Square className="size-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send"
                disabled={!canSend}
                className="inline-flex size-8 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40"
              >
                <ArrowUp className="size-3.5" />
              </button>
            )}
          </div>
        </form>

        <div className="max-h-64 overflow-y-auto py-1">
          {threads.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Nothing running.</p>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelectThread(thread.id)}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-start hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {thread.title}
                  </span>
                  {thread.running ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-[#5b5bd6] motion-safe:animate-pulse" />
                  ) : thread.unread ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-[#5b5bd6]" />
                  ) : null}
                </span>
                {thread.preview ? (
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {thread.preview}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>

        <div className="border-t border-border p-2">
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-full justify-center text-sm"
            onClick={onOpenOrch}
          >
            Open Orch
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
