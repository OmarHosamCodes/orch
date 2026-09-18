import type { AgentChatTurnInput, AgentChatTurnStreamEvent } from "@orch/agent/types";

import {
  closeAgencyLiveWebSocket,
  createAgencyLiveRpcClient,
  waitForWebSocketOpen,
} from "@/features/shared/agency-live-rpc";
import { getServerUrl } from "@/lib/env";

function isBenignStreamAbort(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message;
  return (
    message.includes("closed or aborted while waiting for pulling") ||
    message.includes("The operation was aborted") ||
    message.includes("WebSocket connection timed out")
  );
}

export async function streamAgentChatTurn(
  input: AgentChatTurnInput,
  options: {
    signal: AbortSignal;
    onEvent: (event: AgentChatTurnStreamEvent) => void;
  },
): Promise<void> {
  const { client, websocket } = createAgencyLiveRpcClient(getServerUrl());
  try {
    await waitForWebSocketOpen(websocket);
    const iterator = await client.agent.chat.turnStream(input, { signal: options.signal });
    for await (const event of iterator) {
      options.onEvent(event);
      if (event.type === "completed" || event.type === "error") {
        break;
      }
    }
  } catch (error) {
    if (options.signal.aborted || isBenignStreamAbort(error)) {
      return;
    }
    throw error;
  } finally {
    closeAgencyLiveWebSocket(websocket, "agent turn stream ended");
  }
}

export async function subscribeAgentRun(
  input: { runId: string; afterSeq: number },
  options: {
    signal: AbortSignal;
    onEvent: (event: AgentChatTurnStreamEvent) => void;
  },
): Promise<void> {
  const { client, websocket } = createAgencyLiveRpcClient(getServerUrl());
  try {
    await waitForWebSocketOpen(websocket);
    const iterator = await client.agent.runs.subscribe(input, { signal: options.signal });
    for await (const event of iterator) {
      options.onEvent(event);
      if (event.type === "completed" || event.type === "error") {
        break;
      }
    }
  } catch (error) {
    if (options.signal.aborted || isBenignStreamAbort(error)) {
      return;
    }
    throw error;
  } finally {
    closeAgencyLiveWebSocket(websocket, "agent run subscribe ended");
  }
}

export async function cancelAgentRun(runId: string): Promise<void> {
  const { client, websocket } = createAgencyLiveRpcClient(getServerUrl());
  try {
    await waitForWebSocketOpen(websocket);
    await client.agent.runs.cancel({ runId });
  } finally {
    closeAgencyLiveWebSocket(websocket, "agent run cancel ended");
  }
}
