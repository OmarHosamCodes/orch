import { describe, expect, test } from "bun:test";

import {
  appendConfirmedProposalsToMessages,
  collectAnsweredQuestionIds,
  collectResolvedPlanIdsFromMessages,
  createOrchEventToChunkMapper,
  dashboardMessagesToUIMessages,
  formatAgencyQuestionAnswerMessage,
  getLastUserFileParts,
  getLastUserText,
  resolveCreatedObjectHref,
} from "./orch-ui-message";

describe("orch-ui-message", () => {
  test("getLastUserText reads trailing user text part", () => {
    expect(
      getLastUserText([
        { id: "1", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
        { id: "2", role: "user", parts: [{ type: "text", text: "Hello world" }] },
      ]),
    ).toBe("Hello world");
  });

  test("getLastUserFileParts reads trailing user file parts", () => {
    expect(
      getLastUserFileParts([
        { id: "1", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
        {
          id: "2",
          role: "user",
          parts: [
            { type: "text", text: "See file" },
            {
              type: "file",
              url: "data:text/plain;base64,aGk=",
              filename: "notes.txt",
              mediaType: "text/plain",
            },
          ],
        },
      ]),
    ).toEqual([
      { url: "data:text/plain;base64,aGk=", filename: "notes.txt", mediaType: "text/plain" },
    ]);
  });

  test("maps Orch stream events into UI message chunks", () => {
    const mapEvent = createOrchEventToChunkMapper();
    const chunks = [
      ...mapEvent({
        type: "started",
        runId: "agent-run-1",
        conversationId: "c1",
        createdConversation: true,
        userMessageId: "u1",
        assistantMessageId: "a1",
        model: "test-model",
      }),
      ...mapEvent({ type: "token", delta: "Hel" }),
      ...mapEvent({ type: "token", delta: "lo" }),
      ...mapEvent({
        type: "tool",
        tool: {
          id: "t1",
          name: "list_nodes",
          input: {},
          status: "in_progress",
          error: null,
        },
      }),
      ...mapEvent({
        type: "tool",
        tool: {
          id: "t1",
          name: "list_nodes",
          input: {},
          output: { nodes: [] },
          status: "completed",
          error: null,
        },
      }),
      ...mapEvent({
        type: "artifact",
        artifact: {
          id: "art-1",
          kind: "schema",
          title: "Hours",
          schema: {
            version: 1,
            root: { type: "text", text: "Hello canvas" },
          },
        },
      }),
      ...mapEvent({
        type: "question",
        question: {
          questionId: "aq-1",
          prompt: "Which first?",
          kind: "single",
          options: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
          ],
          allowFreeText: false,
          status: "pending",
          note: "Waiting for the user to answer in the UI.",
        },
      }),
      ...mapEvent({
        type: "completed",
        conversation: {
          id: "c1",
          title: "Hello",
          model: "test-model",
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
          lastMessagePreview: "Hello",
        },
        userMessage: {
          id: "u1",
          role: "user",
          content: "Hi",
          attachments: [],
          contextNodeTitles: [],
          model: "test-model",
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
          model: "test-model",
          toolsCalled: [],
          artifacts: [],
          createdAt: "2026-07-26T00:00:00.000Z",
        },
        createdConversation: true,
        workspaceSnapshot: null,
        stopped: false,
      }),
    ];

    expect(chunks.map((chunk) => chunk.type)).toEqual([
      "start",
      "data-orchMeta",
      "text-start",
      "text-delta",
      "text-delta",
      "tool-input-start",
      "tool-input-available",
      "tool-output-available",
      "data-orchArtifact",
      "data-orchQuestion",
      "text-end",
      "data-orchCompleted",
      "finish",
    ]);
  });

  test("retry on the same conversation keeps the conversation id", () => {
    const mapEvent = createOrchEventToChunkMapper();
    const chunks = mapEvent({
      type: "started",
      runId: "agent-run-2",
      conversationId: "c-existing",
      createdConversation: false,
      userMessageId: "u2",
      assistantMessageId: "a2",
      model: "test-model",
    });
    const meta = chunks.find((chunk) => chunk.type === "data-orchMeta");
    expect(meta).toMatchObject({
      type: "data-orchMeta",
      id: "c-existing",
      data: {
        conversationId: "c-existing",
        createdConversation: false,
      },
    });
  });

  test("dashboardMessagesToUIMessages seeds text parts", () => {
    const messages = dashboardMessagesToUIMessages([
      {
        id: "u1",
        role: "user",
        content: "Hi",
        attachments: [],
        contextNodeTitles: [],
        model: null,
        toolsCalled: [],
        artifacts: [],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
    ]);
    expect(messages[0]?.parts[0]).toEqual({ type: "text", text: "Hi", state: "done" });
  });

  test("dashboardMessagesToUIMessages seeds attachment data parts", () => {
    const messages = dashboardMessagesToUIMessages([
      {
        id: "u1",
        role: "user",
        content: "",
        attachments: [{ filename: "notes.md", mediaType: "text/markdown", text: "# Hi" }],
        contextNodeTitles: [],
        model: null,
        toolsCalled: [],
        artifacts: [],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
    ]);
    expect(messages[0]?.parts).toEqual([
      {
        type: "data-orchAttachment",
        data: { filename: "notes.md", mediaType: "text/markdown" },
      },
    ]);
  });

  test("dashboardMessagesToUIMessages hydrates artifact data parts", () => {
    const messages = dashboardMessagesToUIMessages([
      {
        id: "a1",
        role: "assistant",
        content: "Rendered",
        attachments: [],
        contextNodeTitles: [],
        model: "test-model",
        toolsCalled: [],
        artifacts: [
          {
            id: "art-1",
            kind: "schema",
            title: "Hours",
            schema: {
              version: 1,
              root: { type: "text", text: "Hello canvas" },
            },
          },
        ],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
    ]);
    expect(messages[0]?.parts).toContainEqual({
      type: "data-orchArtifact",
      id: "art-1",
      data: {
        id: "art-1",
        kind: "schema",
        title: "Hours",
        schema: {
          version: 1,
          root: { type: "text", text: "Hello canvas" },
        },
      },
    });
  });

  test("rehydrates knowledge created-object cards with an object href", () => {
    const [message] = dashboardMessagesToUIMessages([
      {
        id: "a1",
        role: "assistant",
        content: "Saved your reporting preferences.",
        attachments: [],
        contextNodeTitles: [],
        model: "test-model",
        toolsCalled: [
          {
            id: "tool-1",
            name: "apply_knowledge_action",
            input: {},
            output: {
              applied: true,
              objectId: "kobj-1",
              objectType: "note",
              label: "personal reporting preferences",
              boardHref: "/canvas",
            },
            status: "completed",
            error: null,
          },
        ],
        artifacts: [],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
    ]);

    expect(message?.parts.map((part) => part.type)).toEqual([
      "data-orchCreatedObject",
      "dynamic-tool",
      "text",
    ]);
    const created = message?.parts.find((part) => part.type === "data-orchCreatedObject");
    expect(created && "data" in created ? created.data.href : null).toBe("/object/kobj-1");
  });

  test("rehydrates plan and proposal cards from persisted tool outputs", () => {
    const [message] = dashboardMessagesToUIMessages([
      {
        id: "a1",
        role: "assistant",
        content: "Review the plan and proposal.",
        attachments: [],
        contextNodeTitles: [],
        model: "test-model",
        toolsCalled: [
          {
            id: "tool-plan",
            name: "draft_agency_plan",
            input: {},
            output: {
              planId: "aplan-1",
              title: "Clean August",
              summary: "Fix duplicate entries",
              steps: [{ label: "Delete duplicate", action: { type: "time_entry.delete" } }],
            },
            status: "completed",
            error: null,
          },
          {
            id: "tool-proposal",
            name: "propose_agency_action",
            input: {},
            output: {
              proposalId: "proposal-1",
              label: "Delete duplicate",
              action: { type: "time_entry.delete" },
              before: { id: "entry-1" },
              after: null,
            },
            status: "completed",
            error: null,
          },
        ],
        artifacts: [],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
    ]);

    expect(message?.parts.map((part) => part.type)).toEqual([
      "data-orchPlan",
      "data-orchProposal",
      "dynamic-tool",
      "dynamic-tool",
      "text",
    ]);
  });

  test("collectResolvedPlanIdsFromMessages treats confirm-* proposals as plan done", () => {
    expect(
      collectResolvedPlanIdsFromMessages([
        {
          id: "a1",
          role: "assistant",
          content: "",
          attachments: [],
          contextNodeTitles: [],
          model: null,
          toolsCalled: [
            {
              id: "tool-plan",
              name: "draft_canvas_plan",
              input: {},
              output: {
                planId: "cplan-1",
                title: "Todo",
                summary: "Make a node",
                steps: [{ label: "Create", action: { type: "node.create" } }],
              },
              status: "completed",
            },
            {
              id: "confirm-aap-1",
              name: "propose_canvas_action",
              input: {},
              output: {
                proposalId: "aap-1",
                label: "Create",
                action: { type: "node.create" },
                before: null,
                after: { id: "n1" },
              },
              status: "completed",
            },
          ],
          artifacts: [],
          createdAt: "2026-08-10T00:00:00.000Z",
        },
      ]),
    ).toEqual(new Set(["cplan-1"]));
  });

  test("appendConfirmedProposalsToMessages adds Approve parts on last assistant", () => {
    const next = appendConfirmedProposalsToMessages(
      [
        { id: "u1", role: "user", parts: [{ type: "text", text: "Plan it" }] },
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "data-orchPlan",
              id: "p1",
              data: { planId: "p1", title: "T", summary: "S", steps: [] },
            },
          ],
        },
      ],
      [
        {
          proposalId: "aap-1",
          status: "pending",
          label: "Create Sprint notes",
          action: { type: "node.create", title: "Sprint notes" },
          before: null,
          after: { id: "n1" },
          boardHref: "/node/n1",
        },
      ],
    );
    const assistant = next[1];
    expect(assistant?.parts.some((part) => part.type === "data-orchProposal")).toBe(true);
    const proposal = assistant?.parts.find((part) => part.type === "data-orchProposal");
    expect(proposal && "data" in proposal ? proposal.data.proposalId : null).toBe("aap-1");
  });

  test("formats and detects answered question ids", () => {
    const content = formatAgencyQuestionAnswerMessage({
      questionId: "aq-1",
      selectedOptionIds: ["standup"],
      selectedLabels: ["Standup typos"],
      freeText: "",
    });
    expect(content).toBe("Answer to question aq-1: Standup typos");
    expect(
      collectAnsweredQuestionIds([
        {
          id: "u1",
          role: "user",
          content,
          attachments: [],
          contextNodeTitles: [],
          model: null,
          toolsCalled: [],
          artifacts: [],
          createdAt: "2026-07-26T00:00:00.000Z",
        },
      ]),
    ).toEqual(new Set(["aq-1"]));
  });

  test("strips leaked tool markup and hydrates a tool chip", () => {
    const [message] = dashboardMessagesToUIMessages([
      {
        id: "a1",
        role: "assistant",
        content: "<|tool_call_start|>[get_agency_reports_summary()]<|tool_call_end|>",
        attachments: [],
        contextNodeTitles: [],
        model: "test-model",
        toolsCalled: [],
        artifacts: [],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
    ]);
    expect(message?.parts.map((part) => part.type)).toEqual(["dynamic-tool"]);
    const toolPart = message?.parts[0];
    expect(toolPart && "toolName" in toolPart ? toolPart.toolName : null).toBe(
      "get_agency_reports_summary",
    );
  });

  test("rewrites knowledge Open href off the canvas board", () => {
    expect(
      resolveCreatedObjectHref({
        kind: "knowledge",
        id: "kobj-1",
        href: "/canvas",
      }),
    ).toBe("/object/kobj-1");
  });

  test("drops leaked tool markup from live token chunks", () => {
    const mapEvent = createOrchEventToChunkMapper();
    mapEvent({
      type: "started",
      runId: "agent-run-1",
      conversationId: "c1",
      createdConversation: true,
      userMessageId: "u1",
      assistantMessageId: "a1",
      model: "test-model",
    });
    expect(
      mapEvent({
        type: "token",
        delta: "<|tool_call_start|>[get_agency_reports_summary()]<|tool_call_end|>",
      }),
    ).toEqual([]);
  });

  test("drops leaked Calling dumps from live token chunks", () => {
    const mapEvent = createOrchEventToChunkMapper();
    mapEvent({
      type: "started",
      runId: "agent-run-1",
      conversationId: "c1",
      createdConversation: true,
      userMessageId: "u1",
      assistantMessageId: "a1",
      model: "test-model",
    });
    expect(
      mapEvent({
        type: "token",
        delta:
          "I'll gather.\n[Calling get_agency_time_summary... call_id: '53820608'] [Tool result call_53820608] {'ok': true}",
      }),
    ).toEqual([
      { type: "text-start", id: "a1" },
      { type: "text-delta", id: "a1", delta: "I'll gather.\n" },
    ]);
  });
});
