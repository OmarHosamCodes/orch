import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { ErrorState } from "@/components/elements/error-state";
import { AgentCanvasOverlayView } from "@/features/workspace-agent/agent-canvas-overlay-view";
import { WorkspaceAgentChatPanelView } from "@/features/workspace-agent/chat-panel-view";
import { EclipsePetView } from "@/features/workspace-agent/eclipse-pet-view";
import type { WorkspaceAgentViewModel } from "@/features/workspace-agent/hooks/use-workspace-agent";
import { OrchAssistantPanelView } from "@/features/workspace-agent/orch-assistant-panel-view";
import { OrchInboxView } from "@/features/workspace-agent/orch-inbox-view";
import { WorkspaceAgentThreadComposerView } from "@/features/workspace-agent/workspace-agent-thread-composer-view";
import { WorkspaceAgentThreadHistory } from "@/features/workspace-agent/workspace-agent-thread-history";
import { cn } from "@/lib/utils";

type WorkspaceAgentViewProps = {
  view: WorkspaceAgentViewModel;
};

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];
const contentFade = { duration: 0.16, delay: 0.05, ease: EASE_OUT_QUART };

export function WorkspaceAgentView({ view }: WorkspaceAgentViewProps) {
  const showArtifactSplit = Boolean(view.activeArtifact);
  const expanded = view.expanded;

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-workspace-agent-root
        className={cn(
          "pointer-events-none fixed z-40 flex flex-col items-end gap-3",
          view.bottomOffsetClass,
          "end-4",
        )}
      >
        <AnimatePresence>
          {expanded ? (
            <motion.div
              key="workspace-agent-panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.14, ease: EASE_OUT_QUART } }}
              transition={contentFade}
              className={cn(
                "pointer-events-auto w-[min(100vw-2rem,960px)]",
                showArtifactSplit && "w-[min(100vw-2rem,1200px)]",
              )}
            >
              <OrchAssistantPanelView
                tab={view.panelTab}
                unreadCount={view.inboxUnreadCount}
                onTabChange={view.setPanelTab}
              >
                {view.panelTab === "inbox" ? (
                  <OrchInboxView
                    notes={view.inboxNotes}
                    emptyHint="Nothing in the inbox."
                    onMarkRead={view.onMarkInboxRead}
                  />
                ) : null}
                {view.panelTab === "history" ? (
                  <WorkspaceAgentThreadHistory
                    className="flex h-full"
                    conversationOptions={view.conversationOptions}
                    conversationsLoading={view.conversationsLoading}
                    historyQuery={view.historyQuery}
                    onHistoryQueryChange={view.setHistoryQuery}
                    activeConversationId={view.activeConversationId}
                    deletingConversationId={view.deletingConversationId}
                    onSelectConversation={(id) => {
                      view.switchConversation(id);
                      view.setPanelTab("chat");
                    }}
                    onStartNewConversation={() => {
                      view.startNewConversation();
                      view.setPanelTab("chat");
                    }}
                    onDeleteConversation={(id) => void view.deleteConversationById(id)}
                    onRenameConversation={view.openRenameConversation}
                  />
                ) : null}
                {view.panelTab === "chat" ? (
                  <WorkspaceAgentChatPanelView
                    messages={view.messages}
                    threadSearchOpen={view.threadSearchOpen}
                    onToggleThreadSearch={view.onToggleThreadSearch}
                    threadSearchQuery={view.threadSearchQuery}
                    onThreadSearchQueryChange={view.onThreadSearchQueryChange}
                    threadSearchHits={view.threadSearchHits}
                    threadSearchIndex={view.threadSearchIndex}
                    onThreadSearchStep={view.onThreadSearchStep}
                    isRenameDialogOpen={view.isRenameDialogOpen}
                    isDeleteDialogOpen={view.isDeleteDialogOpen}
                    renameDraft={view.renameDraft}
                    onRenameDraftChange={view.setRenameDraft}
                    onCloseRename={view.closeRenameDialog}
                    onSubmitRename={() => void view.submitRenameConversation()}
                    onCloseDelete={view.closeDeleteDialog}
                    onConfirmDelete={() => void view.confirmDeleteConversation()}
                    isRenaming={view.isRenamingConversation}
                    isDeleting={view.isDeletingConversation}
                    isStreaming={view.isStreaming}
                    streamingMessageId={view.streamingMessageId}
                    streamStopped={view.streamStopped}
                    activeArtifact={view.activeArtifact}
                    onExpandArtifact={view.openCanvas}
                    onDismissArtifact={view.dismissArtifact}
                    onOpenArtifactCanvas={view.openArtifactCanvas}
                    proposalBusyId={view.proposalBusyId}
                    proposalActionError={view.proposalActionError}
                    planConfirmingId={view.planConfirmingId}
                    answeredQuestionIds={view.answeredQuestionIds}
                    resolvedPlanIds={view.resolvedPlanIds}
                    resolvedProposalIds={view.resolvedProposalIds}
                    dismissedStickyKeys={view.dismissedStickyKeys}
                    onDismissStickyDock={view.onDismissStickyDock}
                    questionSubmittingId={view.questionSubmittingId}
                    questionDrafts={view.questionDrafts}
                    onConfirmPlan={view.onConfirmPlan}
                    onApproveProposal={view.onApproveProposal}
                    onRejectProposal={view.onRejectProposal}
                    onOpenBoard={view.onOpenBoard}
                    onAnswerQuestion={view.onAnswerQuestion}
                    onQuestionSelectedOptionIdsChange={view.onQuestionSelectedOptionIdsChange}
                    onQuestionFreeTextChange={view.onQuestionFreeTextChange}
                    quickStarts={view.quickStarts}
                    onSelectQuickStart={view.onSelectQuickStart}
                    emptyHint={view.emptyHint}
                    onContinueStoppedTurn={view.onContinueStoppedTurn}
                    onDismissStoppedTurn={view.onDismissStoppedTurn}
                    readAloudPlaying={view.readAloudPlaying}
                    readAloudSupported={view.readAloudSupported}
                    onToggleReadAloud={view.onToggleReadAloud}
                    composer={
                      <WorkspaceAgentThreadComposerView
                        placeholder={view.placeholder}
                        scopeChips={view.scopeChips}
                        onRemoveChip={view.removeScopeChip}
                        crossSurfaceUnlockLabel={view.crossSurfaceUnlockLabel}
                        onUnlockCrossSurface={view.onUnlockCrossSurface}
                        knowledgeCreateItems={view.knowledgeCreateItems}
                        onCreateKnowledgeKind={view.onCreateKnowledgeKind}
                        scopeModeActive={view.scopeModeActive}
                        onToggleScopeMode={view.toggleScopeMode}
                        scopeHintSeen={view.scopeHintSeen}
                        toolsMenuOpen={view.toolsMenuOpen}
                        onToolsMenuOpenChange={view.setToolsMenuOpen}
                        tools={view.tools}
                        toolsLoading={view.toolsLoading}
                        isStreaming={view.isStreaming}
                        queuedMessages={view.queuedMessages}
                        runningQueueLabel={view.runningQueueLabel}
                        onCancelQueuedMessage={view.onCancelQueuedMessage}
                        draft={view.draft}
                        onDraftChange={view.setDraft}
                        pendingAttachments={view.pendingAttachments}
                        onPendingAttachmentsChange={view.setPendingAttachments}
                        composerTriggerOpen={view.composerTriggerOpen}
                        composerTriggerSuggestions={view.composerTriggerSuggestions}
                        onPickComposerTrigger={view.onPickComposerTrigger}
                        onDismissComposerTrigger={view.onDismissComposerTrigger}
                        onSend={view.sendMessage}
                        onStop={view.stopGeneration}
                        serverDraftOffer={view.serverDraftOffer}
                        onRestoreServerDraft={view.onRestoreServerDraft}
                        onDiscardServerDraft={() => void view.onDiscardServerDraft()}
                      />
                    }
                  />
                ) : null}

                <AnimatePresence initial={false}>
                  {view.error ? (
                    <motion.div
                      key="workspace-agent-error"
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{
                        opacity: 0,
                        height: 0,
                        transition: { duration: 0.14, ease: EASE_OUT_QUART },
                      }}
                      transition={{ duration: 0.18, ease: EASE_OUT_QUART }}
                      className="overflow-hidden border-t border-border px-3 py-2"
                    >
                      <ErrorState
                        title="Couldn't complete that turn"
                        detail={view.error}
                        retrying={view.isPending}
                        onRetry={view.retryLastTurn}
                        className="max-w-none"
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </OrchAssistantPanelView>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="pointer-events-auto">
          <EclipsePetView
            mood={view.eclipseMood}
            expanded={expanded}
            oneLiner={view.inboxOneLiner}
            onOpen={view.onEclipseOpen}
          />
        </div>
      </div>

      <AnimatePresence>
        {view.canvasOpen && view.activeArtifact ? (
          <AgentCanvasOverlayView
            key="workspace-agent-canvas"
            artifact={view.activeArtifact}
            onClose={view.closeCanvas}
            closeRef={view.canvasCloseRef}
          />
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}
