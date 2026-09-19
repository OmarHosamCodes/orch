import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { createPortal } from "react-dom";

import { ErrorState } from "@/components/elements/error-state";
import { AgentCanvasOverlayView } from "@/features/workspace-agent/agent-canvas-overlay-view";
import { WorkspaceAgentChatPanelView } from "@/features/workspace-agent/chat-panel-view";
import type { WorkspaceAgentViewModel } from "@/features/workspace-agent/hooks/use-workspace-agent";
import { OrchCompactPopoverView } from "@/features/workspace-agent/orch-compact-popover-view";
import { OrchExpandableScreenView } from "@/features/workspace-agent/orch-expandable-screen-view";
import { OrchTopbarTriggerView } from "@/features/workspace-agent/orch-topbar-trigger-view";
import { WorkspaceAgentThreadComposerView } from "@/features/workspace-agent/workspace-agent-thread-composer-view";

type WorkspaceAgentViewProps = {
  view: WorkspaceAgentViewModel;
};

export function WorkspaceAgentView({ view }: WorkspaceAgentViewProps) {
  const hideChrome = view.orchPresence === "thread";
  const trigger = (
    <OrchTopbarTriggerView
      mood={view.eclipseMood}
      compactOpen={view.compactOpen}
      expanded={view.expanded}
      badgeCount={view.compactBadgeCount}
      hidden={hideChrome}
      onToggle={view.expanded ? view.onEclipseToggle : undefined}
    />
  );

  const compactComposer = (
    <WorkspaceAgentThreadComposerView
      layout="command"
      placeholder={view.placeholder}
      scopeChips={view.scopeChips}
      onRemoveChip={view.removeScopeChip}
      knowledgeCreateItems={view.knowledgeCreateItems}
      onCreateKnowledgeKind={view.onCreateKnowledgeKind}
      toolsMenuOpen={view.toolsMenuOpen}
      onToolsMenuOpenChange={view.setToolsMenuOpen}
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
      onSend={view.sendCompactMessage}
      onStop={view.stopGeneration}
      serverDraftOffer={view.serverDraftOffer}
      onRestoreServerDraft={view.onRestoreServerDraft}
      onDiscardServerDraft={() => void view.onDiscardServerDraft()}
    />
  );

  const threadComposer = (
    <WorkspaceAgentThreadComposerView
      layout="command"
      placeholder={view.placeholder}
      scopeChips={view.scopeChips}
      onRemoveChip={view.removeScopeChip}
      knowledgeCreateItems={view.knowledgeCreateItems}
      onCreateKnowledgeKind={view.onCreateKnowledgeKind}
      toolsMenuOpen={view.toolsMenuOpen}
      onToolsMenuOpenChange={view.setToolsMenuOpen}
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
  );

  const thread = (
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
      composer={threadComposer}
    />
  );

  const topbarChrome =
    view.topbarSlot && !hideChrome
      ? createPortal(
          view.expanded ? (
            trigger
          ) : (
            <OrchCompactPopoverView
              open={view.compactOpen}
              onOpenChange={view.onCompactOpenChange}
              trigger={trigger}
              composer={compactComposer}
              threads={view.compactThreads}
              onSelectThread={view.onSelectCompactThread}
              onOpenOrch={view.onOpenOrch}
            />
          ),
          view.topbarSlot,
        )
      : null;

  return (
    <LayoutGroup id="orch-companion-screen">
      <MotionConfig reducedMotion="user">
        {topbarChrome}

        {view.expanded && !hideChrome ? (
          <OrchExpandableScreenView
            title={
              view.openThreads.find((thread) => thread.id === view.activeConversationId)?.title ??
              view.settledThreads.find((thread) => thread.id === view.activeConversationId)
                ?.title ??
              "Orch"
            }
            search={view.settleSearch}
            onSearchChange={view.setSettleSearch}
            canSettle
            settlingThreadId={view.settlingThreadId}
            openThreads={view.openThreads}
            settledThreads={view.settledThreads}
            settledOpen={view.settledOpen}
            onSettledOpenChange={view.setSettledOpen}
            activeConversationId={view.activeConversationId}
            onSelectThread={view.onSelectCompactThread}
            onSettleThread={(id) => void view.onSettleThread(id)}
            onUnsettle={(id) => void view.onUnsettle(id)}
            onNewThread={view.startNewConversation}
            onCollapse={view.onCollapseExpanded}
          >
            {thread}
            <AnimatePresence initial={false}>
              {view.error ? (
                <motion.div
                  key="workspace-agent-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
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
          </OrchExpandableScreenView>
        ) : null}

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
    </LayoutGroup>
  );
}
