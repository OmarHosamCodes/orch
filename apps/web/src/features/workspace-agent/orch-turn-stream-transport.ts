import type { AgentChatTurnInput, AgentTextAttachment } from "@orch/agent/types";
import type { ChatTransport } from "ai";

import { filePartsToAgentAttachments } from "@/features/workspace-agent/agent-attachments";
import {
  cancelAgentRun,
  streamAgentChatTurn,
  subscribeAgentRun,
} from "@/features/workspace-agent/agent-turn-stream";
import {
  createOrchEventToChunkMapper,
  getLastUserFileParts,
  getLastUserText,
  type OrchUIMessage,
  type OrchUIMessageChunk,
} from "@/features/workspace-agent/orch-ui-message";

type OrchTurnTransportBody = Omit<AgentChatTurnInput, "content" | "attachments"> & {
  content?: string;
  attachments?: AgentTextAttachment[];
};

export type OrchTurnSendContext = Partial<Omit<AgentChatTurnInput, "content" | "attachments">>;

export class OrchTurnStreamTransport implements ChatTransport<OrchUIMessage> {
  private runId: string | null = null;
  private lastSeq = 0;

  subscribeRun: typeof subscribeAgentRun = subscribeAgentRun;
  cancelRun: typeof cancelAgentRun = cancelAgentRun;

  constructor(private readonly getContext: () => OrchTurnSendContext = () => ({})) {}

  rememberRun(runId: string, lastSeq = 0) {
    this.runId = runId;
    this.lastSeq = lastSeq;
  }

  async cancelActiveRun() {
    if (!this.runId) {
      return;
    }
    await this.cancelRun(this.runId);
  }

  async sendMessages({
    messages,
    abortSignal,
    body,
  }: Parameters<ChatTransport<OrchUIMessage>["sendMessages"]>[0]): Promise<
    ReadableStream<OrchUIMessageChunk>
  > {
    const orchBody = {
      ...this.getContext(),
      ...(body as OrchTurnTransportBody | undefined),
    };
    const content =
      typeof orchBody.content === "string" ? orchBody.content : getLastUserText(messages);
    const attachments =
      orchBody.attachments ?? filePartsToAgentAttachments(getLastUserFileParts(messages));

    if (!content.trim() && attachments.length === 0) {
      throw new Error("Message is empty.");
    }

    if ((orchBody.surface ?? "canvas") === "agency" && !orchBody.teamId) {
      throw new Error("Select an Agency team before asking about time.");
    }

    const input: AgentChatTurnInput = {
      ...orchBody,
      content,
      attachments,
      surface: orchBody.surface ?? "canvas",
      toolPreset: orchBody.toolPreset ?? "ask",
    };

    const mapEvent = createOrchEventToChunkMapper();
    const signal = abortSignal ?? new AbortController().signal;
    const transport = this;

    return new ReadableStream<OrchUIMessageChunk>({
      async start(controller) {
        try {
          await streamAgentChatTurn(input, {
            signal,
            onEvent: (event) => {
              if (event.type === "started") {
                transport.rememberRun(event.runId, 0);
              }
              transport.lastSeq += 1;
              for (const chunk of mapEvent(event)) {
                controller.enqueue(chunk);
              }
            },
          });
          if (signal.aborted) {
            controller.enqueue({ type: "abort", reason: "user" });
          }
          controller.close();
        } catch (error) {
          const errorText =
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : "Failed to reach the agent.";
          controller.enqueue({ type: "error", errorText });
          controller.close();
        }
      },
    });
  }

  async reconnectToStream(): Promise<ReadableStream<OrchUIMessageChunk> | null> {
    if (!this.runId) {
      return null;
    }

    const mapEvent = createOrchEventToChunkMapper();
    const runId = this.runId;
    const afterSeq = this.lastSeq;
    const transport = this;

    return new ReadableStream<OrchUIMessageChunk>({
      async start(controller) {
        try {
          await transport.subscribeRun(
            { runId, afterSeq },
            {
              signal: new AbortController().signal,
              onEvent: (event) => {
                transport.lastSeq += 1;
                for (const chunk of mapEvent(event)) {
                  controller.enqueue(chunk);
                }
              },
            },
          );
          controller.close();
        } catch (error) {
          const errorText =
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : "Failed to resume the agent.";
          controller.enqueue({ type: "error", errorText });
          controller.close();
        }
      },
    });
  }
}
