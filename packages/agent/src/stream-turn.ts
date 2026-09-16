import type { AgencyAgentQuestion } from "./agency-question";
import type { AgentChatResponse, AgentToolCall, DashboardConversationUsageLatest } from "./types";
import type { AiUiArtifact } from "./ui-artifact";

export type AgentStreamDraftPlan = {
  planId: string;
  title: string;
  summary: string;
  steps: Array<{ label: string; action: unknown }>;
};

export type DashboardAgentStreamEvent =
  | { type: "token"; delta: string }
  | { type: "tool"; tool: AgentToolCall }
  | { type: "artifact"; artifact: AiUiArtifact }
  | {
      type: "created_object";
      object: { kind: "node" | "block" | "knowledge"; id: string; title: string; href: string };
    }
  | { type: "plan"; plan: AgentStreamDraftPlan }
  | { type: "question"; question: AgencyAgentQuestion }
  | {
      type: "proposal";
      proposal: {
        proposalId: string;
        status: "pending";
        label: string;
        action: unknown;
        before: unknown;
        after: unknown;
      };
    }
  | {
      type: "done";
      responseText: string;
      toolCalls: AgentToolCall[];
      artifacts: AiUiArtifact[];
      usage: DashboardConversationUsageLatest | null;
      model: string;
      workspaceNodeCount: number;
      workspaceSnapshot: AgentChatResponse["workspaceSnapshot"];
    };

type ToolStreamMessage =
  | {
      type: "function_call";
      callId?: string;
      id?: string;
      name: string;
      arguments: string;
    }
  | {
      type: "function_call_output";
      callId: string;
      output: unknown;
    }
  | { type: string };

function truncateError(message: string | null) {
  if (!message) {
    return null;
  }
  return message.length > 2000 ? `${message.slice(0, 1999)}…` : message;
}

/** Merge one OpenRouter tool-stream message into the call map; returns updated tool when changed. */
export function mergeToolCallFromStreamMessage(
  message: ToolStreamMessage,
  calls: Map<string, AgentToolCall>,
  callOrder: string[],
): AgentToolCall | null {
  if (message.type === "function_call") {
    const call = message as Extract<ToolStreamMessage, { type: "function_call" }>;
    const callId = call.callId ?? call.id ?? `call_${callOrder.length}`;
    let parsedInput: unknown = call.arguments;
    try {
      parsedInput = JSON.parse(call.arguments);
    } catch {
      // keep raw string if not JSON
    }
    if (!calls.has(callId)) {
      callOrder.push(callId);
    }
    const existing = calls.get(callId);
    const next: AgentToolCall = {
      id: callId,
      name: call.name,
      input: parsedInput,
      output: existing?.output,
      status: existing?.status === "error" ? "error" : "in_progress",
      error: existing?.error ?? null,
    };
    calls.set(callId, next);
    return next;
  }

  if (message.type === "function_call_output") {
    const outputMessage = message as Extract<ToolStreamMessage, { type: "function_call_output" }>;
    const callId = outputMessage.callId;
    let parsedOutput: unknown = outputMessage.output;
    if (typeof outputMessage.output === "string") {
      try {
        parsedOutput = JSON.parse(outputMessage.output);
      } catch {
        parsedOutput = outputMessage.output;
      }
    }

    const rawErrorMessage =
      parsedOutput &&
      typeof parsedOutput === "object" &&
      !Array.isArray(parsedOutput) &&
      "error" in parsedOutput &&
      typeof (parsedOutput as { error?: unknown }).error === "string"
        ? (parsedOutput as { error?: string }).error?.trim() || null
        : null;
    const errorMessage = truncateError(rawErrorMessage);

    if (!calls.has(callId)) {
      callOrder.push(callId);
      const next: AgentToolCall = {
        id: callId,
        name: "unknown_tool",
        output: parsedOutput,
        status: errorMessage ? "error" : "completed",
        error: errorMessage,
      };
      calls.set(callId, next);
      return next;
    }

    const existing = calls.get(callId)!;
    const next: AgentToolCall = {
      ...existing,
      output: parsedOutput,
      status: errorMessage ? "error" : "completed",
      error: errorMessage,
    };
    calls.set(callId, next);
    return next;
  }

  return null;
}

export function orderedToolCalls(
  callOrder: string[],
  calls: Map<string, AgentToolCall>,
): AgentToolCall[] {
  return callOrder
    .map((id) => calls.get(id))
    .filter((call): call is AgentToolCall => Boolean(call));
}
