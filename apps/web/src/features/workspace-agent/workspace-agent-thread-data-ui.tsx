import { useContext, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AgencyPlanCardView } from "@/features/workspace-agent/agency-plan-card-view";
import { AgencyProposalCardView } from "@/features/workspace-agent/agency-proposal-card-view";
import { AgencyQuestionCardView } from "@/features/workspace-agent/agency-question-card-view";
import { AgentMessageArtifactCardView } from "@/features/workspace-agent/agent-message-artifact-card-view";
import { AgentStickyArchiveReceiptView } from "@/features/workspace-agent/agent-sticky-dock-view";
import { OrchChainOfThoughtView } from "@/features/workspace-agent/orch-chain-of-thought-view";
import {
  OrchCitationsView,
  citationsFromToolOutput,
} from "@/features/workspace-agent/orch-citations-view";
import { OrchCreatedObjectCardView } from "@/features/workspace-agent/orch-created-object-card-view";
import { OrchTodoListView } from "@/features/workspace-agent/orch-todo-list-view";
import { OrchToolActivityView } from "@/features/workspace-agent/orch-tool-activity-view";
import {
  resolveCreatedObjectHref,
  type OrchAgencyQuestionAnswer,
  type OrchUIDataParts,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";
import { getWorkspaceAgentToolTraceViewModel } from "@/features/workspace-agent/workspace-agent-view-models";
import { isPartStickyDocked } from "@/features/workspace-agent/sticky-dock";
import { WorkspaceAgentThreadMessageContext } from "@/features/workspace-agent/workspace-agent-thread-slots";

function asPlan(data: unknown): OrchUIDataParts["orchPlan"] {
  return data as OrchUIDataParts["orchPlan"];
}

function asProposal(data: unknown): OrchUIDataParts["orchProposal"] {
  return data as OrchUIDataParts["orchProposal"];
}

function asQuestion(data: unknown): OrchUIDataParts["orchQuestion"] {
  return data as OrchUIDataParts["orchQuestion"];
}

function asArtifact(data: unknown): OrchUIDataParts["orchArtifact"] {
  return data as OrchUIDataParts["orchArtifact"];
}

function asCreatedObject(data: unknown): OrchUIDataParts["orchCreatedObject"] {
  return data as OrchUIDataParts["orchCreatedObject"];
}

function OrchPlanDataPart({ data }: { data: unknown }) {
  const ctx = useContext(WorkspaceAgentThreadMessageContext);
  if (!ctx) return null;
  const plan = asPlan(data);
  if (isPartStickyDocked(ctx.stickyItem, "plan", plan.planId)) return null;
  if (ctx.resolvedPlanIds.has(plan.planId)) {
    return <AgentStickyArchiveReceiptView label="Plan confirmed" detail={plan.title} />;
  }
  return (
    <AgencyPlanCardView
      plan={plan}
      confirming={ctx.planConfirmingId === plan.planId}
      onConfirm={() => ctx.onConfirmPlan(plan)}
    />
  );
}

function OrchProposalDataPart({ data }: { data: unknown }) {
  const ctx = useContext(WorkspaceAgentThreadMessageContext);
  if (!ctx) return null;
  const proposal = asProposal(data);
  if (isPartStickyDocked(ctx.stickyItem, "proposal", proposal.proposalId)) return null;
  if (ctx.resolvedProposalIds.has(proposal.proposalId)) {
    return (
      <AgentStickyArchiveReceiptView
        label="Proposal resolved"
        detail={proposal.label}
        actionLabel={proposal.boardHref ? "Open on board" : undefined}
        onAction={
          proposal.boardHref && ctx.onOpenBoard
            ? () => ctx.onOpenBoard?.(proposal.boardHref!)
            : undefined
        }
      />
    );
  }
  return (
    <AgencyProposalCardView
      proposal={proposal}
      busy={ctx.proposalBusyId === proposal.proposalId}
      error={
        ctx.proposalActionError?.proposalId === proposal.proposalId
          ? ctx.proposalActionError.message
          : null
      }
      onApprove={() => ctx.onApproveProposal(proposal.proposalId)}
      onReject={() => ctx.onRejectProposal(proposal.proposalId)}
    />
  );
}

function questionCanSubmit(
  question: OrchUIDataParts["orchQuestion"],
  draft: { selectedOptionIds: string[]; freeText: string },
  answered: boolean,
  submitting: boolean,
): boolean {
  if (answered || submitting) return false;
  const freeText = draft.freeText;
  const selectedOptionIds = draft.selectedOptionIds;
  if (question.kind === "text") return freeText.trim().length > 0;
  if (question.kind === "single") {
    return selectedOptionIds.length === 1 || (question.allowFreeText && freeText.trim().length > 0);
  }
  return selectedOptionIds.length > 0 || (question.allowFreeText && freeText.trim().length > 0);
}

function OrchQuestionDataPart({ data }: { data: unknown }) {
  const ctx = useContext(WorkspaceAgentThreadMessageContext);
  if (!ctx) return null;
  const question = asQuestion(data);
  if (isPartStickyDocked(ctx.stickyItem, "question", question.questionId)) return null;
  const answered = ctx.answeredQuestionIds.has(question.questionId);
  if (answered) {
    return <AgentStickyArchiveReceiptView label="Question answered" detail="In history" />;
  }
  const draft = ctx.questionDrafts[question.questionId] ?? {
    selectedOptionIds: [] as string[],
    freeText: "",
  };
  const submitting = ctx.questionSubmittingId === question.questionId;
  const selectedLabels = question.options
    .filter((option) => draft.selectedOptionIds.includes(option.id))
    .map((option) => option.label);
  const answer: OrchAgencyQuestionAnswer = {
    questionId: question.questionId,
    selectedOptionIds: draft.selectedOptionIds,
    selectedLabels,
    freeText: draft.freeText.trim(),
  };
  return (
    <AgencyQuestionCardView
      question={question}
      selectedOptionIds={draft.selectedOptionIds}
      freeText={draft.freeText}
      answered={answered}
      submitting={submitting}
      canSubmit={questionCanSubmit(question, draft, answered, submitting)}
      onSelectedOptionIdsChange={(ids) =>
        ctx.onQuestionSelectedOptionIdsChange(question.questionId, ids)
      }
      onFreeTextChange={(value) => ctx.onQuestionFreeTextChange(question.questionId, value)}
      onSubmit={() => ctx.onAnswerQuestion(answer)}
    />
  );
}

function OrchArtifactDataPart({ data }: { data: unknown }) {
  const ctx = useContext(WorkspaceAgentThreadMessageContext);
  if (!ctx) return null;
  const artifact = asArtifact(data);
  if (isPartStickyDocked(ctx.stickyItem, "artifact", artifact.id)) return null;
  return (
    <AgentMessageArtifactCardView
      artifact={artifact}
      onOpen={() => ctx.onOpenArtifactCanvas(artifact)}
    />
  );
}

function OrchCreatedObjectDataPart({ data }: { data: unknown }) {
  const ctx = useContext(WorkspaceAgentThreadMessageContext);
  if (!ctx) return null;
  const object = asCreatedObject(data);
  return (
    <OrchCreatedObjectCardView
      object={{ ...object, href: resolveCreatedObjectHref(object) }}
      onOpen={(href) => {
        if (ctx.onOpenBoard) ctx.onOpenBoard(href);
      }}
    />
  );
}

function renderDynamicToolPart(): ReactNode {
  return null;
}

function renderPart(part: OrchUIMessage["parts"][number], index: number): ReactNode {
  if (part.type === "text") {
    if (!part.text.trim()) return null;
    return (
      <div key={index} className="prose prose-sm dark:prose-invert max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{part.text}</Markdown>
      </div>
    );
  }
  if (part.type === "dynamic-tool") {
    return renderDynamicToolPart();
  }
  if (part.type === "data-orchPlan") {
    return <OrchPlanDataPart key={index} data={part.data} />;
  }
  if (part.type === "data-orchProposal") {
    return <OrchProposalDataPart key={index} data={part.data} />;
  }
  if (part.type === "data-orchQuestion") {
    return <OrchQuestionDataPart key={index} data={part.data} />;
  }
  if (part.type === "data-orchArtifact") {
    return <OrchArtifactDataPart key={index} data={part.data} />;
  }
  if (part.type === "data-orchCreatedObject") {
    return <OrchCreatedObjectDataPart key={index} data={part.data} />;
  }
  if (part.type === "data-orchTodo") {
    return <OrchTodoListView key={index} items={part.data.items} />;
  }
  return null;
}

export function OrchMessageParts({ message }: { message: OrchUIMessage }) {
  const toolParts = message.parts.filter((part) => part.type === "dynamic-tool");
  const steps = toolParts.map((part) => ({
    id: part.toolCallId,
    name: part.toolName,
    done: part.state === "output-available" || part.state === "output-error",
  }));
  const live = toolParts.some(
    (part) => part.state !== "output-available" && part.state !== "output-error",
  );
  const activity = toolParts.map((part) => {
    const view = getWorkspaceAgentToolTraceViewModel({
      id: part.toolCallId,
      name: part.toolName,
      input: part.input,
      output: "output" in part ? part.output : undefined,
      status:
        part.state === "output-error"
          ? "error"
          : part.state === "output-available"
            ? "completed"
            : "in_progress",
      error: "errorText" in part && typeof part.errorText === "string" ? part.errorText : null,
    });
    return {
      id: part.toolCallId,
      name: part.toolName,
      status: view.status,
      detail: view.outputText || view.inputText || view.error,
    };
  });
  const citations = toolParts.flatMap((part) =>
    citationsFromToolOutput(part.toolName, "output" in part ? part.output : undefined),
  );

  return (
    <>
      <OrchChainOfThoughtView steps={steps} live={live} />
      <OrchToolActivityView items={activity} />
      {message.parts.map((part, index) => renderPart(part, index))}
      <OrchCitationsView citations={citations} />
    </>
  );
}
