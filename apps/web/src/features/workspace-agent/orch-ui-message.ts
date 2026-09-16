import {
  createLeakedToolMarkupFilter,
  extractLeakedToolCallNames,
  stripLeakedToolCallMarkup,
} from "@orch/agent/tool-call-markup";
import type {
  AgentChatTurnStreamEvent,
  AgentToolCall,
  AiUiArtifact,
  DashboardConversationMessage,
} from "@orch/agent/types";
import type { UIMessage, UIMessageChunk } from "ai";

export type OrchUIDataParts = {
  orchMeta: {
    conversationId: string;
    createdConversation: boolean;
    userMessageId: string;
    assistantMessageId: string;
    model: string;
  };
  orchCompleted: {
    conversationId: string;
    stopped: boolean;
    createdConversation: boolean;
    workspaceSnapshot: {
      nodes: unknown[];
      updatedAt: string | null;
    } | null;
    assistantMessageId: string;
    userMessageId: string;
  };
  orchAttachment: {
    filename: string;
    mediaType: string;
    previewUrl?: string;
  };
  orchArtifact: AiUiArtifact;
  orchPlan: {
    planId: string;
    title: string;
    summary: string;
    steps: Array<{ label: string; action: unknown }>;
  };
  orchProposal: {
    proposalId: string;
    status: "pending";
    label: string;
    action: unknown;
    before: unknown;
    after: unknown;
    boardHref?: string | null;
  };
  orchQuestion: {
    questionId: string;
    prompt: string;
    kind: "single" | "multi" | "text";
    options: Array<{ id: string; label: string; hint?: string }>;
    allowFreeText: boolean;
    context?: string;
    status: "pending";
    note: string;
  };
  orchCreatedObject: {
    kind: "node" | "block" | "knowledge";
    id: string;
    title: string;
    href: string;
  };
  orchTodo: {
    items: Array<{ id: string; title: string; status: "pending" | "in-progress" | "completed" }>;
  };
};

export type OrchAgencyQuestionAnswer = {
  questionId: string;
  selectedOptionIds: string[];
  selectedLabels: string[];
  freeText: string;
};

export type OrchUIMessage = UIMessage<unknown, OrchUIDataParts>;

export type OrchUIMessageChunk = UIMessageChunk<unknown, OrchUIDataParts>;

const AGENCY_QUESTION_ANSWER_PREFIX = "Answer to question ";

export function formatAgencyQuestionAnswerMessage(answer: OrchAgencyQuestionAnswer): string {
  const parts = [...answer.selectedLabels, answer.freeText].filter(Boolean);
  return `${AGENCY_QUESTION_ANSWER_PREFIX}${answer.questionId}: ${parts.join(" — ")}`;
}

export function collectResolvedPlanIdsFromMessages(
  messages: DashboardConversationMessage[],
): Set<string> {
  const resolved = new Set<string>();
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const confirmedViaAppend = message.toolsCalled.some(
      (entry) =>
        typeof entry !== "string" &&
        typeof entry.id === "string" &&
        entry.id.startsWith("confirm-") &&
        (entry.name === "propose_canvas_action" || entry.name === "propose_agency_action") &&
        entry.status === "completed",
    );
    if (!confirmedViaAppend) continue;
    for (const entry of message.toolsCalled) {
      if (typeof entry === "string" || !isRecord(entry.output)) continue;
      if (entry.name !== "draft_canvas_plan" && entry.name !== "draft_agency_plan") continue;
      if (typeof entry.output.planId === "string") resolved.add(entry.output.planId);
    }
  }
  return resolved;
}

export function collectAnsweredQuestionIds(messages: DashboardConversationMessage[]): Set<string> {
  const answered = new Set<string>();
  for (const message of messages) {
    if (message.role !== "user") continue;
    const match = message.content.match(/^Answer to question ([^:]+):/);
    if (match?.[1]) answered.add(match[1]);
  }
  return answered;
}

export function getLastUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    const text = message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim();
    if (text) return text;
  }
  return "";
}

export function getLastUserFileParts(
  messages: UIMessage[],
): Array<{ url: string; filename?: string; mediaType?: string }> {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    return message.parts.flatMap((part) => {
      if (part.type !== "file" || typeof part.url !== "string") return [];
      return [
        {
          url: part.url,
          ...(typeof part.filename === "string" ? { filename: part.filename } : {}),
          ...(typeof part.mediaType === "string" ? { mediaType: part.mediaType } : {}),
        },
      ];
    });
  }
  return [];
}

export function dashboardMessagesToUIMessages(
  messages: DashboardConversationMessage[],
): OrchUIMessage[] {
  return messages.map((message) => {
    const parts: OrchUIMessage["parts"] = [];

    for (const attachment of message.attachments ?? []) {
      parts.push({
        type: "data-orchAttachment",
        data: {
          filename: attachment.filename,
          mediaType: attachment.mediaType,
          ...(attachment.mediaType.startsWith("image/") && attachment.text.startsWith("data:image/")
            ? { previewUrl: attachment.text }
            : {}),
        },
      });
    }

    if (message.role === "assistant") {
      for (const entry of message.toolsCalled) {
        if (typeof entry !== "string") {
          const primaryPart = toolCallToPrimaryDataPart(entry);
          if (primaryPart) parts.push(primaryPart);
        }
      }
      for (const artifact of message.artifacts ?? []) {
        parts.push({
          type: "data-orchArtifact",
          id: artifact.id,
          data: artifact,
        });
      }
      for (const entry of message.toolsCalled) {
        if (typeof entry === "string") {
          parts.push({
            type: "dynamic-tool",
            toolName: entry,
            toolCallId: `legacy-${entry}`,
            state: "output-available",
            input: {},
            output: null,
          });
          continue;
        }
        parts.push(toolCallToDynamicPart(entry));
      }
      const knownToolNames = new Set(
        message.toolsCalled.map((entry) => (typeof entry === "string" ? entry : entry.name)),
      );
      for (const name of extractLeakedToolCallNames(message.content)) {
        if (knownToolNames.has(name)) continue;
        parts.push({
          type: "dynamic-tool",
          toolName: name,
          toolCallId: `leaked-${name}`,
          state: "output-available",
          input: {},
          output: null,
        });
      }
    }

    const visibleContent = stripLeakedToolCallMarkup(message.content);
    if (visibleContent) {
      parts.push({ type: "text", text: visibleContent, state: "done" });
    }

    if (parts.length === 0) {
      parts.push({ type: "text", text: "", state: "done" });
    }

    return {
      id: message.id,
      role: message.role,
      parts,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function resolveCreatedObjectHref(input: {
  kind: "node" | "block" | "knowledge";
  id: string;
  href: string;
}): string {
  if (
    input.kind === "knowledge" &&
    (!input.href || input.href === "/canvas" || input.href === "/")
  ) {
    return `/object/${input.id}`;
  }
  if (
    (input.kind === "node" || input.kind === "block") &&
    (!input.href || input.href === "/canvas" || input.href === "/")
  ) {
    return `/node/${input.id}`;
  }
  return input.href;
}

function toolCallToPrimaryDataPart(tool: AgentToolCall): OrchUIMessage["parts"][number] | null {
  if (tool.status !== "completed" || !isRecord(tool.output)) return null;

  switch (tool.name) {
    case "apply_canvas_action":
    case "apply_knowledge_action": {
      const output = tool.output;
      const title = typeof output.label === "string" ? output.label : "Created";
      const href = typeof output.boardHref === "string" ? output.boardHref : "/canvas";
      const id =
        typeof output.objectId === "string"
          ? output.objectId
          : typeof output.blockId === "string"
            ? output.blockId
            : typeof output.nodeId === "string"
              ? output.nodeId
              : null;
      if (!id) return null;
      const kind =
        tool.name === "apply_knowledge_action"
          ? ("knowledge" as const)
          : typeof output.blockId === "string"
            ? ("block" as const)
            : ("node" as const);
      return {
        type: "data-orchCreatedObject",
        id,
        data: {
          kind,
          id,
          title,
          href: resolveCreatedObjectHref({ kind, id, href }),
        },
      };
    }
    case "draft_canvas_plan":
    case "draft_agency_plan": {
      const output = tool.output;
      if (
        typeof output.planId !== "string" ||
        typeof output.title !== "string" ||
        typeof output.summary !== "string" ||
        !Array.isArray(output.steps)
      ) {
        return null;
      }
      const steps = output.steps.flatMap((step) =>
        isRecord(step) && typeof step.label === "string"
          ? [{ label: step.label, action: step.action }]
          : [],
      );
      if (steps.length === 0) return null;
      return {
        type: "data-orchPlan",
        id: output.planId,
        data: {
          planId: output.planId,
          title: output.title,
          summary: output.summary,
          steps,
        },
      };
    }
    case "propose_canvas_action":
    case "propose_agency_action": {
      const output = tool.output;
      if (
        typeof output.proposalId !== "string" ||
        typeof output.label !== "string" ||
        !("action" in output) ||
        !("before" in output) ||
        !("after" in output)
      ) {
        return null;
      }
      return {
        type: "data-orchProposal",
        id: output.proposalId,
        data: {
          proposalId: output.proposalId,
          status: "pending",
          label: output.label,
          action: output.action,
          before: output.before,
          after: output.after,
          boardHref:
            "boardHref" in output && typeof output.boardHref === "string" ? output.boardHref : null,
        },
      };
    }
    default:
      return null;
  }
}

function toolCallToDynamicPart(tool: AgentToolCall): OrchUIMessage["parts"][number] {
  const toolCallId = tool.id ?? tool.name;
  if (tool.status === "error") {
    return {
      type: "dynamic-tool",
      toolName: tool.name,
      toolCallId,
      state: "output-error",
      input: tool.input,
      errorText: tool.error ?? "Tool failed",
    };
  }
  if (tool.status === "in_progress") {
    return {
      type: "dynamic-tool",
      toolName: tool.name,
      toolCallId,
      state: "input-available",
      input: tool.input ?? {},
    };
  }
  return {
    type: "dynamic-tool",
    toolName: tool.name,
    toolCallId,
    state: "output-available",
    input: tool.input ?? {},
    output: tool.output ?? null,
  };
}

export function createOrchEventToChunkMapper() {
  let textStarted = false;
  let textId = "orch-text";
  const startedTools = new Set<string>();
  const markupFilter = createLeakedToolMarkupFilter();

  return function mapEvent(event: AgentChatTurnStreamEvent): OrchUIMessageChunk[] {
    switch (event.type) {
      case "started": {
        textId = event.assistantMessageId;
        return [
          { type: "start", messageId: event.assistantMessageId },
          {
            type: "data-orchMeta",
            id: event.conversationId,
            data: {
              conversationId: event.conversationId,
              createdConversation: event.createdConversation,
              userMessageId: event.userMessageId,
              assistantMessageId: event.assistantMessageId,
              model: event.model,
            },
          },
        ];
      }
      case "token": {
        const delta = markupFilter.push(event.delta);
        if (!delta) return [];
        const chunks: OrchUIMessageChunk[] = [];
        if (!textStarted) {
          textStarted = true;
          chunks.push({ type: "text-start", id: textId });
        }
        chunks.push({ type: "text-delta", id: textId, delta });
        return chunks;
      }
      case "tool": {
        const toolCallId = event.tool.id ?? event.tool.name;
        const chunks: OrchUIMessageChunk[] = [];
        if (!startedTools.has(toolCallId)) {
          startedTools.add(toolCallId);
          chunks.push({
            type: "tool-input-start",
            toolCallId,
            toolName: event.tool.name,
            dynamic: true,
          });
          chunks.push({
            type: "tool-input-available",
            toolCallId,
            toolName: event.tool.name,
            input: event.tool.input ?? {},
            dynamic: true,
          });
        }
        if (event.tool.status === "completed") {
          chunks.push({
            type: "tool-output-available",
            toolCallId,
            output: event.tool.output ?? null,
            dynamic: true,
          });
        } else if (event.tool.status === "error") {
          chunks.push({
            type: "tool-output-error",
            toolCallId,
            errorText: event.tool.error ?? "Tool failed",
            dynamic: true,
          });
        }
        return chunks;
      }
      case "artifact":
        return [
          {
            type: "data-orchArtifact",
            id: event.artifact.id,
            data: event.artifact,
          },
        ];
      case "plan":
        return [
          {
            type: "data-orchPlan",
            id: event.plan.planId,
            data: event.plan,
          },
        ];
      case "created_object":
        return [
          {
            type: "data-orchCreatedObject",
            id: event.object.id,
            data: {
              ...event.object,
              href: resolveCreatedObjectHref(event.object),
            },
          },
        ];
      case "proposal":
        return [
          {
            type: "data-orchProposal",
            id: event.proposal.proposalId,
            data: event.proposal,
          },
        ];
      case "question":
        return [
          {
            type: "data-orchQuestion",
            id: event.question.questionId,
            data: event.question,
          },
        ];
      case "todo":
        return [
          {
            type: "data-orchTodo",
            id: "orch-todo",
            data: { items: event.items },
          },
        ];
      case "error":
        return [{ type: "error", errorText: event.message }];
      case "completed": {
        const chunks: OrchUIMessageChunk[] = [];
        const rest = markupFilter.flush();
        if (rest) {
          if (!textStarted) {
            textStarted = true;
            chunks.push({ type: "text-start", id: textId });
          }
          chunks.push({ type: "text-delta", id: textId, delta: rest });
        }
        if (textStarted) {
          chunks.push({ type: "text-end", id: textId });
        }
        chunks.push({
          type: "data-orchCompleted",
          id: event.conversation.id,
          data: {
            conversationId: event.conversation.id,
            stopped: event.stopped,
            createdConversation: event.createdConversation,
            workspaceSnapshot: event.workspaceSnapshot,
            assistantMessageId: event.assistantMessage.id,
            userMessageId: event.userMessage.id,
          },
        });
        chunks.push({
          type: "finish",
          finishReason: "stop",
        });
        return chunks;
      }
      default: {
        const _exhaustive: never = event;
        return _exhaustive;
      }
    }
  };
}

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function getMessageArtifacts(message: OrchUIMessage): AiUiArtifact[] {
  return message.parts.flatMap((part) => {
    if (part.type !== "data-orchArtifact") return [];
    return [part.data];
  });
}

export function collectArtifactsFromMessages(messages: OrchUIMessage[]): AiUiArtifact[] {
  return messages.flatMap(getMessageArtifacts);
}

export type ConfirmedPlanProposal = {
  proposalId: string;
  status: "pending";
  label: string;
  action: unknown;
  before: unknown;
  after: unknown;
  boardHref?: string;
};

/** Confirm plan creates DB rows; chat only shows Approve cards via orchProposal parts. */
export function appendConfirmedProposalsToMessages(
  messages: OrchUIMessage[],
  proposals: ConfirmedPlanProposal[],
): OrchUIMessage[] {
  if (proposals.length === 0) return messages;
  const parts: OrchUIMessage["parts"] = proposals.map((proposal) => ({
    type: "data-orchProposal",
    id: proposal.proposalId,
    data: {
      proposalId: proposal.proposalId,
      status: "pending",
      label: proposal.label,
      action: proposal.action,
      before: proposal.before,
      after: proposal.after,
      boardHref: proposal.boardHref ?? null,
    },
  }));
  let lastAssistant = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") {
      lastAssistant = index;
      break;
    }
  }
  if (lastAssistant < 0) {
    return [
      ...messages,
      {
        id: `orch-confirm-${proposals[0]?.proposalId ?? "plan"}`,
        role: "assistant",
        parts,
      },
    ];
  }
  return messages.map((message, index) =>
    index === lastAssistant ? { ...message, parts: [...message.parts, ...parts] } : message,
  );
}
