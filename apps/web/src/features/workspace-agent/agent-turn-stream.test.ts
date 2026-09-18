import { describe, expect, mock, test } from "bun:test";

const onEvent = mock(() => {});

mock.module("@/features/shared/agency-live-rpc", () => ({
  createAgencyLiveRpcClient: () => ({
    client: {
      agent: {
        chat: {
          turnStream: async function* () {
            yield {
              type: "started",
              runId: "agent-run-1",
              conversationId: "c1",
              createdConversation: true,
              userMessageId: "u1",
              assistantMessageId: "a1",
              model: "m",
            };
            yield { type: "token", delta: "Hi" };
            yield {
              type: "completed",
              conversation: { id: "c1" },
              userMessage: { id: "u1" },
              assistantMessage: { id: "a1", content: "Hi" },
              createdConversation: true,
              workspaceSnapshot: null,
              stopped: false,
            };
          },
        },
      },
    },
    websocket: { readyState: 1, close: () => {} },
  }),
  waitForWebSocketOpen: async () => {},
  closeAgencyLiveWebSocket: () => {},
}));

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:3000",
}));

const { streamAgentChatTurn } = await import("./agent-turn-stream");

describe("streamAgentChatTurn", () => {
  test("forwards events until completed", async () => {
    const events: string[] = [];
    await streamAgentChatTurn(
      { content: "Hi", toolPreset: "ask" },
      {
        signal: new AbortController().signal,
        onEvent: (event) => {
          events.push(event.type);
          onEvent();
        },
      },
    );
    expect(events).toEqual(["started", "token", "completed"]);
  });
});
