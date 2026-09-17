import type { AgentScopeRef, AgentTextAttachment } from "@orch/agent/types";
import { ArrowUp, Plus, Square, X } from "lucide-react";
import type { FormEvent, KeyboardEvent } from "react";

import { MessageQueue } from "@/components/elements/message-queue";
import { DraftRestore } from "@/components/elements/draft-restore";
import {
  ComposerAttachButton,
  ComposerMenu,
  ComposerMenuItem,
} from "@/components/elements/composer";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import type { KnowledgeCreateKind } from "@/features/workspace-knowledge/knowledge-create";
import { WorkspaceAgentScopeChipView } from "@/features/workspace-agent/scope-chip-view";
import { WorkspaceAgentComposerAttachItem } from "@/features/workspace-agent/workspace-agent-composer-attach";
import { formatComposerDraftSavedAt } from "@/features/workspace-agent/composer-draft-display";
import type { WorkspaceAgentComposerTriggerSuggestion } from "@/features/workspace-agent/hooks/use-workspace-agent";
import {
  ComposerTriggerKeyboard,
  suggestionRowLabel,
} from "@/features/workspace-agent/workspace-agent-composer-trigger-controls";
import type { QueuedAgentMessage } from "@/features/workspace-agent/workspace-agent-message-queue";
import { cn } from "@/lib/utils";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Separator } from "@/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

export type WorkspaceAgentThreadComposerViewProps = {
  layout?: "command" | "thread";
  placeholder: string;
  scopeChips: AgentScopeRef[];
  onRemoveChip: (id: string) => void;
  knowledgeCreateItems: Array<{ kind: KnowledgeCreateKind; label: string }>;
  onCreateKnowledgeKind: (kind: KnowledgeCreateKind) => void;
  toolsMenuOpen: boolean;
  onToolsMenuOpenChange: (open: boolean) => void;
  isStreaming: boolean;
  queuedMessages: readonly QueuedAgentMessage[];
  runningQueueLabel: string;
  onCancelQueuedMessage: (id: string) => void;
  onSend: (input: {
    text: string;
    attachments?: AgentTextAttachment[];
  }) => boolean | Promise<boolean>;
  onStop: () => void;
  draft: string;
  onDraftChange: (value: string) => void;
  pendingAttachments: AgentTextAttachment[];
  onPendingAttachmentsChange: (attachments: AgentTextAttachment[]) => void;
  composerTriggerOpen: boolean;
  composerTriggerSuggestions: readonly WorkspaceAgentComposerTriggerSuggestion[];
  onPickComposerTrigger: (suggestion: WorkspaceAgentComposerTriggerSuggestion) => void;
  onDismissComposerTrigger: () => void;
  serverDraftOffer: { text: string; savedAt: string } | null;
  onRestoreServerDraft: () => void;
  onDiscardServerDraft: () => void;
};

export function WorkspaceAgentThreadComposerView({
  layout = "thread",
  placeholder,
  scopeChips,
  onRemoveChip,
  knowledgeCreateItems,
  onCreateKnowledgeKind,
  toolsMenuOpen,
  onToolsMenuOpenChange,
  isStreaming,
  queuedMessages,
  runningQueueLabel,
  onCancelQueuedMessage,
  onSend,
  onStop,
  draft,
  onDraftChange,
  pendingAttachments,
  onPendingAttachmentsChange,
  composerTriggerOpen,
  composerTriggerSuggestions,
  onPickComposerTrigger,
  onDismissComposerTrigger,
  serverDraftOffer,
  onRestoreServerDraft,
  onDiscardServerDraft,
}: WorkspaceAgentThreadComposerViewProps) {
  const entityChips = scopeChips.filter((chip) => chip.kind !== "surface");
  const canSend = draft.trim().length > 0 || pendingAttachments.length > 0;
  const commandLayout = layout === "command";

  function submitDraft() {
    if (composerTriggerOpen && composerTriggerSuggestions[0]) {
      onPickComposerTrigger(composerTriggerSuggestions[0]);
      return;
    }
    void onSend({ text: draft, attachments: pendingAttachments });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isStreaming) {
      onStop();
      return;
    }
    submitDraft();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (isStreaming) return;
    submitDraft();
  }

  const attachControl = (
    <Popover open={toolsMenuOpen} onOpenChange={onToolsMenuOpenChange}>
      <Tooltip open={toolsMenuOpen ? false : undefined}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <ComposerAttachButton
              aria-label="Attach"
              className={commandLayout ? "size-7" : undefined}
            />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          Attach
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-auto border-0 bg-transparent p-0 shadow-none"
        data-workspace-agent-overlay
      >
        <ComposerMenu open className="relative inset-auto mb-0 w-72 shrink-0">
          <p className="px-2.5 pt-1 pb-0.5 text-[11px] font-medium text-muted-foreground">Attach</p>
          <WorkspaceAgentComposerAttachItem
            onAttachments={(files) => onPendingAttachmentsChange([...pendingAttachments, ...files])}
            onClose={() => onToolsMenuOpenChange(false)}
          />
          {knowledgeCreateItems.length > 0 ? (
            <>
              <Separator className="my-1" />
              <p className="px-2.5 pt-1 pb-0.5 text-[11px] font-medium text-muted-foreground">
                Knowledge
              </p>
              {knowledgeCreateItems.map((item) => (
                <ComposerMenuItem
                  key={item.kind}
                  onClick={() => {
                    onCreateKnowledgeKind(item.kind);
                    onToolsMenuOpenChange(false);
                  }}
                >
                  <Plus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {item.label}
                </ComposerMenuItem>
              ))}
            </>
          ) : null}
        </ComposerMenu>
      </PopoverContent>
    </Popover>
  );

  const submitControl = isStreaming ? (
    <button
      type="button"
      aria-label="Stop"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-foreground text-background",
        commandLayout ? "size-7" : "size-8",
      )}
      onClick={onStop}
    >
      <Square className={cn("fill-current", commandLayout ? "size-3" : "size-3.5")} />
    </button>
  ) : (
    <PromptInputSubmit
      disabled={!canSend}
      aria-label="Send message"
      className={commandLayout ? "size-7 shrink-0" : undefined}
    >
      <ArrowUp className={commandLayout ? "size-3.5" : "size-4"} />
    </PromptInputSubmit>
  );

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col", commandLayout ? "gap-0" : "gap-2")}>
        {serverDraftOffer ? (
          <DraftRestore
            className="mb-2 max-w-none"
            draft={serverDraftOffer.text}
            savedAt={formatComposerDraftSavedAt(serverDraftOffer.savedAt)}
            onRestore={onRestoreServerDraft}
            onDiscard={onDiscardServerDraft}
          />
        ) : null}

        {isStreaming || queuedMessages.length > 0 ? (
          <MessageQueue
            className="mb-2 max-w-none"
            running={runningQueueLabel}
            queued={queuedMessages}
            onCancel={onCancelQueuedMessage}
          />
        ) : null}

        <Popover
          open={composerTriggerOpen}
          onOpenChange={(open) => {
            if (!open) onDismissComposerTrigger();
          }}
        >
          <PopoverAnchor asChild>
            <div className="relative w-full min-w-0">
              <PromptInput
                onSubmit={onSubmit}
                className={
                  commandLayout
                    ? "w-full min-w-0 gap-0 rounded-[14.4px] border-border bg-muted p-1 shadow-none"
                    : "rounded-[14.4px] border-border bg-muted shadow-none"
                }
              >
                {pendingAttachments.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5 px-1.5">
                    {pendingAttachments.map((file) => (
                      <li
                        key={`${file.filename}-${file.mediaType}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs"
                      >
                        {file.filename}
                        <button
                          type="button"
                          aria-label={`Remove ${file.filename}`}
                          onClick={() =>
                            onPendingAttachmentsChange(
                              pendingAttachments.filter((item) => item.filename !== file.filename),
                            )
                          }
                        >
                          <X className="size-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <WorkspaceAgentScopeChipView chips={entityChips} onRemove={onRemoveChip} />
                <ComposerTriggerKeyboard
                  composerTriggerOpen={composerTriggerOpen}
                  composerTriggerSuggestions={composerTriggerSuggestions}
                  onPickComposerTrigger={onPickComposerTrigger}
                  onDismissComposerTrigger={onDismissComposerTrigger}
                />
                {commandLayout ? (
                  <div className="flex h-9 w-full min-w-0 items-center gap-1">
                    <div className="shrink-0">{attachControl}</div>
                    <PromptInputTextarea
                      placeholder={placeholder}
                      value={draft}
                      onChange={(event) => onDraftChange(event.target.value)}
                      onKeyDown={onKeyDown}
                      aria-label="Message input"
                      className="h-9 min-h-0 w-0 min-w-0 flex-1 resize-none overflow-x-hidden px-1.5 py-0 text-sm leading-9"
                    />
                    {submitControl}
                  </div>
                ) : (
                  <>
                    <PromptInputTextarea
                      placeholder={placeholder}
                      value={draft}
                      onChange={(event) => onDraftChange(event.target.value)}
                      onKeyDown={onKeyDown}
                      aria-label="Message input"
                      className="min-h-11 text-sm"
                    />
                    <PromptInputToolbar>
                      <PromptInputTools>{attachControl}</PromptInputTools>
                      {submitControl}
                    </PromptInputToolbar>
                  </>
                )}
              </PromptInput>

              {composerTriggerOpen && composerTriggerSuggestions.length > 0 ? (
                <PopoverContent
                  align="start"
                  side="top"
                  sideOffset={8}
                  className="w-auto border-0 bg-transparent p-0 shadow-none"
                  data-workspace-agent-overlay
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <ComposerMenu open className="relative inset-auto mb-0 w-72 shrink-0">
                    {composerTriggerSuggestions.map((suggestion) => (
                      <ComposerMenuItem
                        key={`${suggestion.kind}-${suggestion.id}`}
                        data-composer-suggestion
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onPickComposerTrigger(suggestion)}
                      >
                        {suggestionRowLabel(suggestion)}
                      </ComposerMenuItem>
                    ))}
                  </ComposerMenu>
                </PopoverContent>
              ) : null}
            </div>
          </PopoverAnchor>
        </Popover>
      </div>
    </TooltipProvider>
  );
}
