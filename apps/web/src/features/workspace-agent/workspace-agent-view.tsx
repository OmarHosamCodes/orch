import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { ErrorState } from "@/components/elements/error-state";
import {
  ORCH_PRESENCE_COLLAPSED_RADIUS_PX,
  ORCH_PRESENCE_EXPANDED_RADIUS_PX,
  ORCH_PRESENCE_LAYOUT_ID,
  orchPresenceMorphTransition,
} from "@/features/shared/orch-presence-morph";
import { AgentCanvasOverlayView } from "@/features/workspace-agent/agent-canvas-overlay-view";
import { WorkspaceAgentChatPanelView } from "@/features/workspace-agent/chat-panel-view";
import type { WorkspaceAgentViewModel } from "@/features/workspace-agent/hooks/use-workspace-agent";
import { WorkspaceAgentModelLibraryView } from "@/features/workspace-agent/model-library-view";
import { WorkspaceAgentThreadComposerView } from "@/features/workspace-agent/workspace-agent-thread-composer-view";
import { cn } from "@/lib/utils";

type WorkspaceAgentViewProps = {
  view: WorkspaceAgentViewModel;
};

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

const shellLayout = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.85,
};
const contentFade = { duration: 0.16, delay: 0.05, ease: EASE_OUT_QUART };

export function WorkspaceAgentView({ view }: WorkspaceAgentViewProps) {
  const isWorking = view.isPending;
  const collapsedLabel = isWorking ? "Working..." : "Message Orch";
  const showArtifactSplit = Boolean(view.activeArtifact);
  const expanded = view.expanded;
  const showDock = view.orchPresence === "dock";

  return (
    <AssistantRuntimeProvider runtime={view.runtime}>
      <MotionConfig reducedMotion="user">
        {showDock ? (
          <div
            data-workspace-agent-root
            className={cn(
              "pointer-events-none fixed inset-x-0 z-40 flex items-end justify-center px-4",
              view.bottomOffsetClass,
              expanded ? "pb-0" : "pb-3",
            )}
          >
            <motion.div
              layout
              layoutId={expanded ? undefined : ORCH_PRESENCE_LAYOUT_ID}
              layoutDependency={expanded}
              style={{
                borderRadius: expanded
                  ? ORCH_PRESENCE_EXPANDED_RADIUS_PX
                  : ORCH_PRESENCE_COLLAPSED_RADIUS_PX,
              }}
              transition={{
                layout: expanded ? shellLayout : orchPresenceMorphTransition,
                borderRadius: expanded
                  ? { duration: 0.22, ease: EASE_OUT_QUART }
                  : orchPresenceMorphTransition,
              }}
              className={cn(
                "pointer-events-auto origin-bottom overflow-hidden text-card-foreground",
                expanded
                  ? cn(
                      "flex w-full flex-col rounded-2xl border border-border bg-card shadow-lg",
                      showArtifactSplit ? "max-w-[1200px]" : "max-w-[960px]",
                    )
                  : cn(
                      "group/orch mx-auto flex w-full justify-center rounded-full border",
                      isWorking
                        ? "workspace-agent-pill-shimmer h-2 w-44 border-transparent bg-foreground/40"
                        : "h-2 w-52 border-transparent bg-foreground/35",
                      "motion-safe:transition-[width,height,max-width,padding,background-color,border-color,box-shadow] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.25,1,0.5,1)]",
                      "hover:h-12 hover:w-full hover:max-w-[22rem] hover:border-border hover:bg-card hover:px-4 hover:shadow-md",
                      "focus-within:h-12 focus-within:w-full focus-within:max-w-[22rem] focus-within:border-border focus-within:bg-card focus-within:px-4 focus-within:shadow-md",
                      view.dockLandPulse && !expanded && "orch-presence-land",
                    ),
              )}
            >
              {expanded ? (
                <motion.div
                  key="workspace-agent-panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={contentFade}
                  className="flex min-h-0 w-full flex-col"
                >
                  <WorkspaceAgentChatPanelView
                    messages={view.messages}
                    conversationOptions={view.conversationOptions}
                    conversationsLoading={view.conversationsLoading}
                    historyQuery={view.historyQuery}
                    onHistoryQueryChange={view.setHistoryQuery}
                    historyRailOpen={view.historyRailOpen}
                    onToggleHistoryRail={view.onToggleHistoryRail}
                    onCloseHistoryRail={view.onCloseHistoryRail}
                    threadSearchOpen={view.threadSearchOpen}
                    onToggleThreadSearch={view.onToggleThreadSearch}
                    threadSearchQuery={view.threadSearchQuery}
                    onThreadSearchQueryChange={view.onThreadSearchQueryChange}
                    threadSearchHits={view.threadSearchHits}
                    threadSearchIndex={view.threadSearchIndex}
                    onThreadSearchStep={view.onThreadSearchStep}
                    activeConversationId={view.activeConversationId}
                    onSelectConversation={view.switchConversation}
                    onStartNewConversation={view.startNewConversation}
                    onDeleteConversation={(id) => void view.deleteConversationById(id)}
                    onRenameConversation={view.openRenameConversation}
                    deletingConversationId={view.deletingConversationId}
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
                        selectedToolPreset={view.selectedToolPreset}
                        onSelectToolPreset={view.setSelectedToolPreset}
                        planModeEnabled={view.planModeEnabled}
                        crossSurfaceUnlockLabel={view.crossSurfaceUnlockLabel}
                        onUnlockCrossSurface={view.onUnlockCrossSurface}
                        knowledgeCreateItems={view.knowledgeCreateItems}
                        onCreateKnowledgeKind={view.onCreateKnowledgeKind}
                        selectedModelLabel={view.selectedModelLabel}
                        selectedModelButtonLabel={view.selectedModelButtonLabel}
                        resolvedModelLabel={view.resolvedModelLabel}
                        modelTier={view.modelTier}
                        modelAuto={view.modelAuto}
                        modelFree={view.modelFree}
                        modelEffort={view.modelEffort}
                        onModelTierChange={view.setModelTier}
                        onModelAutoChange={view.setModelAuto}
                        onModelFreeChange={view.setModelFree}
                        onModelEffortChange={view.setModelEffort}
                        modelMenuOpen={view.modelMenuOpen}
                        onModelMenuOpenChange={view.setModelMenuOpen}
                        onOpenModelLibrary={() => view.setModelLibraryOpen(true)}
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
                        composerTriggerOpen={view.composerTriggerOpen}
                        composerTriggerSuggestions={view.composerTriggerSuggestions}
                        onPickComposerTrigger={view.onPickComposerTrigger}
                        onDismissComposerTrigger={view.onDismissComposerTrigger}
                        onSend={view.sendMessage}
                        serverDraftOffer={view.serverDraftOffer}
                        onRestoreServerDraft={view.onRestoreServerDraft}
                        onDiscardServerDraft={() => void view.onDiscardServerDraft()}
                      />
                    }
                  />

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
                </motion.div>
              ) : (
                <button
                  type="button"
                  aria-label={collapsedLabel}
                  aria-expanded={false}
                  title={isWorking ? "Working..." : "Message Orch (Ctrl+J)"}
                  aria-busy={isWorking || undefined}
                  className="flex size-full min-h-2 items-center justify-between whitespace-nowrap text-sm focus-visible:outline-none"
                  onClick={() => view.setExpanded(true)}
                >
                  <span className="hidden w-full items-center justify-between group-hover/orch:flex group-focus-within/orch:flex">
                    {isWorking ? (
                      <span className="workspace-agent-pill-shimmer-text text-foreground">
                        {collapsedLabel}
                      </span>
                    ) : (
                      <>
                        <span className="text-foreground">{collapsedLabel}</span>
                        <kbd className="text-xs text-muted-foreground">Ctrl+J</kbd>
                      </>
                    )}
                  </span>
                </button>
              )}
            </motion.div>

            <WorkspaceAgentModelLibraryView
              open={view.modelLibraryOpen}
              onOpenChange={view.setModelLibraryOpen}
              modelSearch={view.modelSearch}
              onModelSearchChange={view.setModelSearch}
              filteredModelOptions={view.filteredModelOptions}
              selectedModelId={view.selectedModelId}
              onSelectModel={(modelId) => {
                view.pinModel(modelId);
                view.setModelLibraryOpen(false);
              }}
              onToggleFavorite={view.toggleFavoriteModel}
              isFavoriteModel={view.isFavoriteModel}
              favoritesOnly={view.favoritesOnly}
              onFavoritesOnlyChange={view.setFavoritesOnly}
            />
          </div>
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
    </AssistantRuntimeProvider>
  );
}
