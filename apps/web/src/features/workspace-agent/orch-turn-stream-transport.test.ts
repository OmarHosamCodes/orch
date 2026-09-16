import { describe, expect, test } from "bun:test";

import { OrchTurnStreamTransport } from "./orch-turn-stream-transport";

describe("OrchTurnStreamTransport", () => {
  test("rejects empty submit before the network", async () => {
    const transport = new OrchTurnStreamTransport();
    await expect(
      transport.sendMessages({
        messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "   " }] }],
        abortSignal: new AbortController().signal,
        body: { content: "   ", attachments: [], toolPreset: "ask", surface: "canvas" },
      } as never),
    ).rejects.toThrow("Message is empty.");
  });

  test("does not reconnect to a dropped stream", async () => {
    const transport = new OrchTurnStreamTransport();
    expect(await transport.reconnectToStream()).toBeNull();
  });

  test("reconnectToStream tails subscribe when a runId was started", async () => {
    const transport = new OrchTurnStreamTransport();
    transport.rememberRun("agent-run-1", 0);
    transport.subscribeRun = async (_input, options) => {
      options.onEvent({ type: "token", delta: "hi" });
      options.onEvent({
        type: "completed",
        conversation: { id: "c1" } as never,
        userMessage: { id: "u1" } as never,
        assistantMessage: { id: "a1", content: "hi" } as never,
        createdConversation: false,
        workspaceSnapshot: null,
        stopped: false,
      });
    };
    const stream = await transport.reconnectToStream();
    expect(stream).not.toBeNull();
    const reader = stream!.getReader();
    const first = await reader.read();
    expect(first.done).toBe(false);
  });

  test("reconnectToStream forwards the caller abort signal", async () => {
    const transport = new OrchTurnStreamTransport();
    transport.rememberRun("agent-run-1", 0);
    const listener = new AbortController();
    let seenSignal: AbortSignal | undefined;
    transport.subscribeRun = async (_input, options) => {
      seenSignal = options.signal;
    };
    const stream = await transport.reconnectToStream({ abortSignal: listener.signal });
    expect(stream).not.toBeNull();
    await stream!.getReader().read();
    expect(seenSignal).toBe(listener.signal);
  });

  test("fills Orch extras from getContext when Thread send omits body", async () => {
    const transport = new OrchTurnStreamTransport(() => ({
      surface: "canvas",
      toolPreset: "agent",
    }));
    await expect(
      transport.sendMessages({
        messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "   " }] }],
        abortSignal: new AbortController().signal,
      } as never),
    ).rejects.toThrow("Message is empty.");
  });

  test("rejects Agency turns without a team", async () => {
    const transport = new OrchTurnStreamTransport(() => ({
      surface: "agency",
      toolPreset: "ask",
    }));
    await expect(
      transport.sendMessages({
        messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "hours" }] }],
        abortSignal: new AbortController().signal,
      } as never),
    ).rejects.toThrow("Select an Agency team before asking about time.");
  });
});
