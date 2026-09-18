import { Paperclip, Plus, Send, X } from "lucide-react";
import { motion } from "motion/react";
import type { FormEvent, KeyboardEvent, RefObject } from "react";

import {
  ORCH_PRESENCE_LAYOUT_ID,
  orchPresenceContentFade,
  orchPresenceMorphTransition,
} from "@/features/shared/orch-presence-morph";
import { taskMessageReplyPreview } from "@/features/task-management/task-thread/agency-task-thread-message-actions";
import type { AgencyTaskMessage } from "@orch/api/routers/agency-ops/task-messages/schemas";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

type AgencyTaskThreadComposerViewProps = {
  canPost: boolean;
  pending: boolean;
  content: string;
  files: File[];
  replyTo: AgencyTaskMessage | null;
  orchMentioned: boolean;
  /** True after cover handoff — mounts shared layoutId for dock ↔ badge morph. */
  orchPresenceActive: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onContentChange: (value: string) => void;
  onPickFiles: (files: File[]) => void;
  onClearFiles: () => void;
  onClearReply: () => void;
  onToggleOrchMention: () => void;
  onSend: () => void;
};

export function AgencyTaskThreadComposerView({
  canPost,
  pending,
  content,
  files,
  replyTo,
  orchMentioned,
  orchPresenceActive,
  fileInputRef,
  textareaRef,
  onContentChange,
  onPickFiles,
  onClearFiles,
  onClearReply,
  onToggleOrchMention,
  onSend,
}: AgencyTaskThreadComposerViewProps) {
  if (!canPost) {
    return <p className="px-3 py-2.5 text-xs text-muted-foreground">Only assignees can post</p>;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    onSend();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    onSend();
  }

  const canSend = !pending && (content.trim().length > 0 || files.length > 0);

  return (
    <form onSubmit={onSubmit} className="px-3 pb-3 pt-2">
      <div
        className={cn(
          "flex flex-col gap-2 rounded-[min(var(--radius-4xl),24px)] bg-muted/40 p-2 ring-1 ring-foreground/5",
          "transition-[box-shadow,background-color,ring-color] duration-200 ease-out",
          "motion-reduce:transition-none",
          "focus-within:bg-background/80 focus-within:ring-ring/40 focus-within:ring-3",
          orchMentioned && "bg-chart-2/[0.07] ring-chart-2/30 focus-within:ring-chart-2/45",
          pending && "opacity-80",
        )}
      >
        {replyTo ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-xl bg-background/50 px-2.5 py-1.5",
              "animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-200 ease-out",
              "motion-reduce:animate-none",
            )}
          >
            <span
              className="mt-0.5 w-px shrink-0 self-stretch rounded-full bg-chart-2"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium leading-tight text-foreground">
                {replyTo.userName}
              </p>
              <p className="truncate text-[11px] leading-snug text-muted-foreground">
                {taskMessageReplyPreview(replyTo)}
              </p>
            </div>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Cancel reply"
              className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onClearReply}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : null}

        <div className="flex min-h-6 items-center gap-2 px-0.5">
          {orchPresenceActive ? (
            <motion.div
              layoutId={ORCH_PRESENCE_LAYOUT_ID}
              transition={orchPresenceMorphTransition}
              style={{ borderRadius: 9999 }}
              className="orch-presence-land inline-flex w-fit"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, filter: "blur(3px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={orchPresenceContentFade}
                className="inline-flex"
              >
                <OrchMentionBadge
                  pending={pending}
                  orchMentioned={orchMentioned}
                  onToggleOrchMention={onToggleOrchMention}
                />
              </motion.div>
            </motion.div>
          ) : (
            <OrchMentionBadge
              pending={pending}
              orchMentioned={orchMentioned}
              onToggleOrchMention={onToggleOrchMention}
            />
          )}
          {orchMentioned ? (
            orchPresenceActive ? (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...orchPresenceContentFade, delay: 0.18 }}
                className="text-[11px] leading-none text-muted-foreground"
              >
                Opens Orch
              </motion.span>
            ) : (
              <span className="text-[11px] leading-none text-muted-foreground">Opens Orch</span>
            )
          ) : null}
        </div>

        {files.length > 0 ? (
          <ul
            className={cn(
              "flex flex-wrap gap-1.5 px-0.5",
              "animate-in fade-in duration-150 ease-out motion-reduce:animate-none",
            )}
          >
            {files.map((file) => (
              <li
                key={`${file.name}-${file.size}`}
                className="rounded-md border border-border/60 bg-background/50 px-2 py-0.5 text-xs text-muted-foreground"
              >
                {file.name}
              </li>
            ))}
            <li>
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                onClick={onClearFiles}
              >
                Clear
              </button>
            </li>
          </ul>
        ) : null}

        <div className="flex items-end gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              const next = Array.from(event.target.files ?? []);
              if (next.length) onPickFiles(next);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Attach files"
            disabled={pending}
            className="mb-0.5 size-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip />
          </Button>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={replyTo ? "Reply" : orchMentioned ? "Ask Orch…" : "Message"}
            disabled={pending}
            rows={1}
            className={cn(
              "field-sizing-content max-h-40 min-h-9 flex-1 resize-none overflow-y-auto",
              "border-0 bg-transparent px-1 py-2 text-sm leading-5 outline-none",
              "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />

          <Button
            type="submit"
            size="icon-sm"
            variant={canSend ? "default" : "ghost"}
            aria-label="Send message"
            disabled={!canSend}
            className={cn(
              "mb-0.5 size-8 shrink-0 transition-[transform,opacity,background-color] duration-150 ease-out",
              "motion-reduce:transition-none",
              canSend && "hover:scale-105 active:scale-95",
              !canSend && "opacity-45",
            )}
          >
            <Send />
          </Button>
        </div>
      </div>
    </form>
  );
}

function OrchMentionBadge({
  pending,
  orchMentioned,
  onToggleOrchMention,
}: {
  pending: boolean;
  orchMentioned: boolean;
  onToggleOrchMention: () => void;
}) {
  return (
    <Badge
      asChild
      variant="secondary"
      className={cn(
        "h-auto gap-1 rounded-full border py-0.5 pl-2 pr-1 transition-[border-color,background-color,box-shadow,color] duration-200 ease-out",
        "motion-reduce:transition-none",
        orchMentioned
          ? "border-chart-2/30 bg-chart-2/15 text-foreground shadow-[0_0_0_1px_color-mix(in_oklch,var(--chart-2)_14%,transparent)]"
          : "border-border/70 bg-background/40 text-muted-foreground hover:border-border hover:bg-background/70 hover:text-foreground",
      )}
    >
      <button
        type="button"
        disabled={pending}
        aria-pressed={orchMentioned}
        aria-label={orchMentioned ? "Remove Orch mention" : "Mention Orch"}
        onClick={onToggleOrchMention}
        className="inline-flex items-center gap-1"
      >
        <span className={cn("text-xs font-medium", orchMentioned && "text-foreground")}>Orch</span>
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 ease-out",
            "motion-reduce:transition-none",
            orchMentioned
              ? "rotate-45 bg-chart-2/25 text-chart-2"
              : "bg-muted/80 text-muted-foreground",
          )}
          aria-hidden
        >
          <Plus className="size-3.5" />
        </span>
      </button>
    </Badge>
  );
}
