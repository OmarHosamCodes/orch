import { createContext, useContext, type ReactNode } from "react";
import type { AiUiArtifact } from "@orch/agent/types";
import { Volume2, VolumeX } from "lucide-react";

import { StoppedRun } from "@/components/elements/stopped-run";
import {
  EmptyState,
  EmptyStateGreeting,
  EmptyStateSuggestion,
  EmptyStateSuggestions,
} from "@/components/elements/empty-state";
import {
  getMessageText,
  type OrchAgencyQuestionAnswer,
  type OrchUIDataParts,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";
import { shouldShowStoppedRun } from "@/features/workspace-agent/workspace-agent-continue";
import { Button } from "@/ui/button";
import type { WorkspaceAgentQuickStart } from "@/features/workspace-agent/workspace-agent-quick-starts";
import type { StickyDockItem } from "@/features/workspace-agent/sticky-dock";

export type WorkspaceAgentThreadMessageContextValue = {
  messages: OrchUIMessage[];
  isStreaming: boolean;
  streamingMessageId: string | null;
  streamStopped: boolean;
  proposalBusyId: string | null;
  planConfirmingId: string | null;
  answeredQuestionIds: ReadonlySet<string>;
  resolvedPlanIds: ReadonlySet<string>;
  resolvedProposalIds: ReadonlySet<string>;
  stickyItem: StickyDockItem | null;
  questionSubmittingId: string | null;
  questionDrafts: Record<string, { selectedOptionIds: string[]; freeText: string }>;
  onConfirmPlan: (plan: OrchUIDataParts["orchPlan"]) => void;
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onAnswerQuestion: (answer: OrchAgencyQuestionAnswer) => void;
  onQuestionSelectedOptionIdsChange: (questionId: string, ids: string[]) => void;
  onQuestionFreeTextChange: (questionId: string, value: string) => void;
  onOpenArtifactCanvas: (artifact: AiUiArtifact) => void;
  onOpenBoard?: (href: string) => void;
  onContinueStoppedTurn: () => void;
  onDismissStoppedTurn: () => void;
  emptyHint: string;
  quickStarts: WorkspaceAgentQuickStart[];
  onSelectQuickStart: (start: WorkspaceAgentQuickStart) => void;
  readAloudPlaying: boolean;
  readAloudSupported: boolean;
  onToggleReadAloud: () => void;
};

export const WorkspaceAgentThreadMessageContext =
  createContext<WorkspaceAgentThreadMessageContextValue | null>(null);

export function WorkspaceAgentThreadMessageProvider({
  value,
  children,
}: {
  value: WorkspaceAgentThreadMessageContextValue;
  children: ReactNode;
}) {
  return (
    <WorkspaceAgentThreadMessageContext.Provider value={value}>
      {children}
    </WorkspaceAgentThreadMessageContext.Provider>
  );
}

export function WorkspaceAgentThreadWelcome() {
  const ctx = useContext(WorkspaceAgentThreadMessageContext);
  if (!ctx) return null;
  return (
    <EmptyState className="mx-auto py-6">
      <EmptyStateGreeting className="text-base text-foreground">{ctx.emptyHint}</EmptyStateGreeting>
      {ctx.quickStarts.length > 0 ? (
        <EmptyStateSuggestions>
          {ctx.quickStarts.map((start, index) => (
            <EmptyStateSuggestion
              key={start.id}
              index={index}
              onClick={() => ctx.onSelectQuickStart(start)}
            >
              {start.label}
            </EmptyStateSuggestion>
          ))}
        </EmptyStateSuggestions>
      ) : null}
    </EmptyState>
  );
}

export function WorkspaceAgentReadAloudSlot() {
  const ctx = useContext(WorkspaceAgentThreadMessageContext);
  if (!ctx || !ctx.readAloudSupported) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 rounded-lg"
      aria-label={ctx.readAloudPlaying ? "Stop reading" : "Read aloud"}
      onClick={ctx.onToggleReadAloud}
    >
      {ctx.readAloudPlaying ? <VolumeX /> : <Volume2 />}
    </Button>
  );
}

export function WorkspaceAgentStoppedRunSlot() {
  const ctx = useContext(WorkspaceAgentThreadMessageContext);
  if (!ctx) return null;
  if (!shouldShowStoppedRun({ streamStopped: ctx.streamStopped, isStreaming: ctx.isStreaming })) {
    return null;
  }
  const lastAssistant = [...ctx.messages].reverse().find((message) => message.role === "assistant");
  const lastAssistantText = lastAssistant ? getMessageText(lastAssistant) : "";
  return (
    <StoppedRun
      className="max-w-none px-4"
      words={lastAssistantText.split(/\s+/).filter(Boolean).slice(-24)}
      reason="Stopped"
      onContinue={ctx.onContinueStoppedTurn}
      onDiscard={ctx.onDismissStoppedTurn}
    />
  );
}
