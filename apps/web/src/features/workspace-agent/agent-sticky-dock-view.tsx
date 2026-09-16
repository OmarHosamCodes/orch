import type { AiUiArtifact } from "@orch/agent/types";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";

import { AgencyPlanCardView } from "@/features/workspace-agent/agency-plan-card-view";
import { AgencyProposalCardView } from "@/features/workspace-agent/agency-proposal-card-view";
import { AgencyQuestionCardView } from "@/features/workspace-agent/agency-question-card-view";
import { AgentMessageArtifactCardView } from "@/features/workspace-agent/agent-message-artifact-card-view";
import type {
  OrchAgencyQuestionAnswer,
  OrchUIDataParts,
} from "@/features/workspace-agent/orch-ui-message";
import { stickyDockItemKey, type StickyDockItem } from "@/features/workspace-agent/sticky-dock";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

const DOCK_SPRING = { type: "spring" as const, stiffness: 380, damping: 36, mass: 0.9 };

function dockActLabel(kind: StickyDockItem["kind"]): string {
  switch (kind) {
    case "question":
      return "Answer this question";
    case "plan":
      return "Confirm this plan";
    case "proposal":
      return "Approve this change";
    case "artifact":
      return "Open this canvas";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

type AgentStickyDockViewProps = {
  item: StickyDockItem | null;
  questionDraft: { selectedOptionIds: string[]; freeText: string } | null;
  questionAnswered: boolean;
  questionSubmitting: boolean;
  questionCanSubmit: boolean;
  planConfirming: boolean;
  proposalBusy: boolean;
  proposalError?: string | null;
  onQuestionSelectedOptionIdsChange: (ids: string[]) => void;
  onQuestionFreeTextChange: (value: string) => void;
  onAnswerQuestion: (answer: OrchAgencyQuestionAnswer) => void;
  onConfirmPlan: (plan: OrchUIDataParts["orchPlan"]) => void;
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onOpenArtifact: (artifact: AiUiArtifact) => void;
  onDismiss: () => void;
  className?: string;
};

/** Cursor-like sticky actionable dock — Approach A joined chrome above composer. */
export function AgentStickyDockView({
  item,
  questionDraft,
  questionAnswered,
  questionSubmitting,
  questionCanSubmit,
  planConfirming,
  proposalBusy,
  proposalError = null,
  onQuestionSelectedOptionIdsChange,
  onQuestionFreeTextChange,
  onAnswerQuestion,
  onConfirmPlan,
  onApproveProposal,
  onRejectProposal,
  onOpenArtifact,
  onDismiss,
  className,
}: AgentStickyDockViewProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {item ? (
        <motion.aside
          key={stickyDockItemKey(item)}
          role="region"
          aria-label={dockActLabel(item.kind)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
          transition={DOCK_SPRING}
          className={cn(
            "shrink-0 overflow-hidden border-t border-border border-b-0 bg-card",
            className,
          )}
          data-workspace-agent-sticky-dock
        >
          <header className="flex min-h-10 items-center gap-2 border-b border-border bg-muted/30 ps-3.5 pe-1.5">
            <p className="text-sm font-semibold tracking-tight text-foreground">
              {dockActLabel(item.kind)}
            </p>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="ms-auto size-8 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
              onClick={onDismiss}
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          </header>

          <div className="max-h-[min(42vh,340px)] overflow-auto px-4 py-3.5">
            {item.kind === "question" ? (
              <AgencyQuestionCardView
                question={item.question}
                selectedOptionIds={questionDraft?.selectedOptionIds ?? []}
                freeText={questionDraft?.freeText ?? ""}
                answered={questionAnswered}
                submitting={questionSubmitting}
                canSubmit={questionCanSubmit}
                onSelectedOptionIdsChange={onQuestionSelectedOptionIdsChange}
                onFreeTextChange={onQuestionFreeTextChange}
                onSubmit={() => {
                  const selectedOptionIds = questionDraft?.selectedOptionIds ?? [];
                  const freeText = (questionDraft?.freeText ?? "").trim();
                  const selectedLabels = item.question.options
                    .filter((option) => selectedOptionIds.includes(option.id))
                    .map((option) => option.label);
                  onAnswerQuestion({
                    questionId: item.question.questionId,
                    selectedOptionIds,
                    selectedLabels,
                    freeText,
                  });
                }}
                embedded
                className="max-w-none"
              />
            ) : null}

            {item.kind === "plan" ? (
              <AgencyPlanCardView
                plan={item.plan}
                confirming={planConfirming}
                onConfirm={() => onConfirmPlan(item.plan)}
                embedded
                className="max-w-none"
              />
            ) : null}

            {item.kind === "proposal" ? (
              <AgencyProposalCardView
                proposal={item.proposal}
                busy={proposalBusy}
                error={proposalError}
                onApprove={() => onApproveProposal(item.proposal.proposalId)}
                onReject={() => onRejectProposal(item.proposal.proposalId)}
                embedded
                className="max-w-none"
              />
            ) : null}

            {item.kind === "artifact" ? (
              <AgentMessageArtifactCardView
                artifact={item.artifact}
                onOpen={() => onOpenArtifact(item.artifact)}
              />
            ) : null}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

/** Compact receipt left in the transcript after a sticky action resolves. */
export function AgentStickyArchiveReceiptView({
  label,
  detail,
  actionLabel,
  onAction,
}: {
  label: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
      className="flex max-w-[min(100%,36rem)] items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs"
    >
      <span
        aria-hidden
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
      >
        <Check className="size-3 stroke-[2.5]" />
      </span>
      <span className="min-w-0 font-medium text-foreground">{label}</span>
      <span className="min-w-0 truncate text-muted-foreground">{detail}</span>
      {actionLabel && onAction ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ms-auto h-7 shrink-0 rounded-full px-2.5 text-xs"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </motion.div>
  );
}
