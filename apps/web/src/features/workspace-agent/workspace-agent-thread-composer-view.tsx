import type { AgentScopeRef, AgentTextAttachment, AgentToolCatalogEntry } from "@orch/agent/types";
import { ArrowUp, Clock, Crosshair, LayoutGrid, Plus, Square, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
import { WorkspaceAgentToolMenuView } from "@/features/workspace-agent/tool-menu-view";
import { formatComposerDraftSavedAt } from "@/features/workspace-agent/composer-draft-display";
import type { WorkspaceAgentComposerTriggerSuggestion } from "@/features/workspace-agent/hooks/use-workspace-agent";
import {
  ComposerTriggerKeyboard,
  suggestionRowLabel,
} from "@/features/workspace-agent/workspace-agent-composer-trigger-controls";
import type { QueuedAgentMessage } from "@/features/workspace-agent/workspace-agent-message-queue";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Separator } from "@/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

function ComposerPillTag({
  icon: Icon,
  label,
  activateLabel,
  dismissLabel,
  tooltip,
  onActivate,
  onDismiss,
}: {
  icon: typeof Crosshair;
  label: string;
  activateLabel: string;
  dismissLabel: string;
  tooltip: string;
  onActivate: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      key={`pill-${label}`}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
      transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
      className="inline-flex h-7 items-center gap-0.5 rounded-full border border-border bg-secondary pr-1 pl-2 text-xs font-medium text-secondary-foreground"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 motion-safe:transition-colors motion-safe:duration-150 hover:text-foreground"
            aria-label={activateLabel}
            onClick={onActivate}
          >
            <Icon className="size-3.5 text-muted-foreground" aria-hidden />
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="rounded-full p-0.5 text-muted-foreground motion-safe:transition-colors motion-safe:duration-150 hover:bg-accent hover:text-accent-foreground"
            aria-label={dismissLabel}
            onClick={onDismiss}
          >
            <X className="size-3" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{dismissLabel}</TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

export type WorkspaceAgentThreadComposerViewProps = {
  placeholder: string;
  scopeChips: AgentScopeRef[];
  onRemoveChip: (id: string) => void;
  crossSurfaceUnlockLabel: "Agency" | "Canvas" | null;
  onUnlockCrossSurface: () => void;
  knowledgeCreateItems: Array<{ kind: KnowledgeCreateKind; label: string }>;
  onCreateKnowledgeKind: (kind: KnowledgeCreateKind) => void;
  scopeModeActive: boolean;
  onToggleScopeMode: () => void;
  scopeHintSeen: boolean;
  toolsMenuOpen: boolean;
  onToolsMenuOpenChange: (open: boolean) => void;
  tools: AgentToolCatalogEntry[];
  toolsLoading: boolean;
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
  placeholder,
  scopeChips,
  onRemoveChip,
  crossSurfaceUnlockLabel,
  onUnlockCrossSurface,
  knowledgeCreateItems,
  onCreateKnowledgeKind,
  scopeModeActive,
  onToggleScopeMode,
  scopeHintSeen,
  toolsMenuOpen,
  onToolsMenuOpenChange,
  tools,
  toolsLoading,
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
  const surfaceUnlockChip = scopeChips.find((chip) => chip.kind === "surface") ?? null;
  const UnlockSurfaceIcon = crossSurfaceUnlockLabel === "Agency" ? Clock : LayoutGrid;
  const canSend = draft.trim().length > 0 || pendingAttachments.length > 0;

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

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {!scopeHintSeen && scopeModeActive ? (
            <motion.p
              key="scope-hint"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="px-1 text-xs text-foreground/70"
            >
              Click a page item to add it to scope.
            </motion.p>
          ) : null}
        </AnimatePresence>

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
            <div className="relative w-full">
              <PromptInput onSubmit={onSubmit}>
                {pendingAttachments.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5 px-2.5">
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
                <PromptInputTextarea
                  placeholder={placeholder}
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  onKeyDown={onKeyDown}
                  aria-label="Message input"
                />
                <PromptInputToolbar>
                  <PromptInputTools>
                    <Popover open={toolsMenuOpen} onOpenChange={onToolsMenuOpenChange}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <ComposerAttachButton aria-label="Attach and tools" />
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">Attach and tools</TooltipContent>
                      </Tooltip>
                      <PopoverContent
                        align="start"
                        side="top"
                        sideOffset={8}
                        className="w-auto border-0 bg-transparent p-0 shadow-none"
                        data-workspace-agent-overlay
                      >
                        <ComposerMenu open className="relative inset-auto mb-0 w-72 shrink-0">
                          <p className="px-2.5 pt-1 pb-0.5 text-[11px] font-medium text-muted-foreground">
                            Attach
                          </p>
                          <WorkspaceAgentComposerAttachItem
                            onAttachments={(files) =>
                              onPendingAttachmentsChange([...pendingAttachments, ...files])
                            }
                            onClose={() => onToolsMenuOpenChange(false)}
                          />
                          {crossSurfaceUnlockLabel ? (
                            <ComposerMenuItem
                              onClick={() => {
                                onUnlockCrossSurface();
                                onToolsMenuOpenChange(false);
                              }}
                            >
                              <UnlockSurfaceIcon
                                className="size-3.5 shrink-0 text-muted-foreground"
                                aria-hidden
                              />
                              Include {crossSurfaceUnlockLabel} tools
                            </ComposerMenuItem>
                          ) : null}
                          <ComposerMenuItem
                            active={scopeModeActive}
                            aria-pressed={scopeModeActive}
                            onClick={() => {
                              onToggleScopeMode();
                              onToolsMenuOpenChange(false);
                            }}
                          >
                            <Crosshair
                              className="size-3.5 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                            {scopeModeActive ? "Stop adding to scope" : "Add to scope"}
                          </ComposerMenuItem>

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
                                  <Plus
                                    className="size-3.5 shrink-0 text-muted-foreground"
                                    aria-hidden
                                  />
                                  {item.label}
                                </ComposerMenuItem>
                              ))}
                            </>
                          ) : null}

                          <Separator className="my-1" />
                          <p className="px-2.5 pt-1 pb-0.5 text-[11px] font-medium text-muted-foreground">
                            Tools
                          </p>
                          <WorkspaceAgentToolMenuView tools={tools} loading={toolsLoading} />
                        </ComposerMenu>
                      </PopoverContent>
                    </Popover>

                    <AnimatePresence initial={false}>
                      {scopeModeActive ? (
                        <ComposerPillTag
                          icon={Crosshair}
                          label="Scope"
                          activateLabel="Scope mode active. Open tools menu"
                          dismissLabel="Exit scope mode"
                          tooltip="Click page items to add it to scope"
                          onActivate={() => onToolsMenuOpenChange(true)}
                          onDismiss={onToggleScopeMode}
                        />
                      ) : null}
                      {surfaceUnlockChip ? (
                        <ComposerPillTag
                          icon={surfaceUnlockChip.id === "agency" ? Clock : LayoutGrid}
                          label={surfaceUnlockChip.label}
                          activateLabel={`${surfaceUnlockChip.label} tools included. Open tools menu`}
                          dismissLabel={`Stop including ${surfaceUnlockChip.label} tools`}
                          tooltip={`${surfaceUnlockChip.label} tools are included in this chat`}
                          onActivate={() => onToolsMenuOpenChange(true)}
                          onDismiss={() => onRemoveChip(surfaceUnlockChip.id)}
                        />
                      ) : null}
                    </AnimatePresence>
                  </PromptInputTools>
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
                    <PromptInputSubmit disabled={!canSend} aria-label="Send message">
                      <ArrowUp className="size-4" />
                    </PromptInputSubmit>
                  )}
                </PromptInputToolbar>
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
