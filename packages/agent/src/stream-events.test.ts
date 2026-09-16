import { describe, expect, test } from "bun:test";

import { agentChatTurnStreamEventSchema } from "./types";

const schemaArtifact = {
  id: "top-members",
  kind: "schema" as const,
  title: "Top members",
  schema: {
    version: 1 as const,
    root: { type: "stat" as const, label: "Members", value: 12 },
  },
};

describe("agentChatTurnStreamEventSchema", () => {
  test("started events require runId", () => {
    expect(() =>
      agentChatTurnStreamEventSchema.parse({
        type: "started",
        conversationId: "conv-1",
        createdConversation: true,
        userMessageId: "message-1",
        assistantMessageId: "message-2",
        model: "openrouter/auto-beta",
      }),
    ).toThrow();

    const started = agentChatTurnStreamEventSchema.parse({
      type: "started",
      runId: "agent-run-00000000-0000-0000-0000-000000000001",
      conversationId: "conv-1",
      createdConversation: true,
      userMessageId: "message-1",
      assistantMessageId: "message-2",
      model: "openrouter/auto-beta",
    });
    expect(started.type === "started" && started.runId.startsWith("agent-run-")).toBe(true);
  });

  test("accepts token and completed events", () => {
    expect(
      agentChatTurnStreamEventSchema.parse({
        type: "token",
        delta: "Hello",
      }).type,
    ).toBe("token");

    const completed = agentChatTurnStreamEventSchema.parse({
      type: "completed",
      conversation: {
        id: "c1",
        title: "Hi",
        model: "m",
        toolPreset: "ask",
        usageSummary: {
          latest: null,
          totals: {
            inputTokens: 0,
            cachedTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            totalTokens: 0,
            costUsd: 0,
          },
        },
        createdAt: "2026-07-26T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z",
        lastMessageAt: "2026-07-26T00:00:00.000Z",
        lastMessagePreview: "Hi",
      },
      userMessage: {
        id: "u1",
        role: "user",
        content: "Hi",
        attachments: [],
        contextNodeTitles: [],
        model: "m",
        toolsCalled: [],
        artifacts: [],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
      assistantMessage: {
        id: "a1",
        role: "assistant",
        content: "Hello",
        attachments: [],
        contextNodeTitles: [],
        model: "m",
        toolsCalled: [],
        artifacts: [schemaArtifact],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
      createdConversation: true,
      workspaceSnapshot: null,
      stopped: false,
    });
    expect(completed.type).toBe("completed");
    if (completed.type === "completed") {
      expect(completed.assistantMessage.artifacts).toHaveLength(1);
    }
  });

  test("accepts artifact stream events", () => {
    const event = agentChatTurnStreamEventSchema.parse({
      type: "artifact",
      artifact: schemaArtifact,
    });
    expect(event.type).toBe("artifact");
    if (event.type === "artifact") {
      expect(event.artifact.id).toBe("top-members");
    }
  });

  test("accepts plan and proposal stream events", () => {
    expect(
      agentChatTurnStreamEventSchema.parse({
        type: "plan",
        plan: {
          planId: "aplan-1",
          title: "Fix August",
          summary: "Two updates",
          steps: [
            {
              label: "Delete entry",
              action: { type: "time_entry.delete", entryId: "e1" },
            },
          ],
        },
      }).type,
    ).toBe("plan");
    expect(
      agentChatTurnStreamEventSchema.parse({
        type: "proposal",
        proposal: {
          proposalId: "aap-1",
          status: "pending",
          label: "Delete entry",
          action: { type: "time_entry.delete", entryId: "e1" },
          before: { id: "e1" },
          after: null,
        },
      }).type,
    ).toBe("proposal");
  });

  test("accepts question stream events", () => {
    const event = agentChatTurnStreamEventSchema.parse({
      type: "question",
      question: {
        questionId: "aq-1",
        prompt: "Which cleanup first?",
        kind: "single",
        options: [
          { id: "standup", label: "Standup typos" },
          { id: "internal", label: "Internal meetings" },
        ],
        allowFreeText: false,
        status: "pending",
        note: "Waiting for the user to answer in the UI.",
      },
    });
    expect(event.type).toBe("question");
    if (event.type === "question") {
      expect(event.question.options).toHaveLength(2);
    }
  });
});
