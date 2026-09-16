import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const realAgent = await import("@orch/agent");
const streamDashboardAgent = mock(async function* () {
  yield { type: "token" as const, delta: "Hi" };
  yield {
    type: "done" as const,
    responseText: "Hi",
    toolCalls: [],
    artifacts: [],
    usage: {
      modelId: "test-model",
      contextLength: null,
      inputTokens: 4,
      cachedTokens: 0,
      outputTokens: 2,
      reasoningTokens: 0,
      totalTokens: 6,
      costUsd: 0,
    },
    model: "test-model",
    workspaceNodeCount: 0,
    workspaceSnapshot: null,
  };
});

mock.module("@orch/agent", () => ({
  ...realAgent,
  streamDashboardAgent,
  runDashboardAgent: mock(async () => ({
    response: "unused",
    model: "test-model",
    toolsCalled: [],
    workspaceNodeCount: 0,
    usage: null,
    workspaceSnapshot: null,
    messagesCount: 1,
  })),
}));

const [{ db }, { user }, service] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema/auth"),
  import("./service"),
]);

const fixtureUsers: string[] = [];

beforeEach(() => {
  streamDashboardAgent.mockClear();
});

afterEach(async () => {
  streamDashboardAgent.mockReset();
  streamDashboardAgent.mockImplementation(async function* () {
    yield { type: "token" as const, delta: "Hi" };
    yield {
      type: "done" as const,
      responseText: "Hi",
      toolCalls: [],
      artifacts: [],
      usage: {
        modelId: "test-model",
        contextLength: null,
        inputTokens: 4,
        cachedTokens: 0,
        outputTokens: 2,
        reasoningTokens: 0,
        totalTokens: 6,
        costUsd: 0,
      },
      model: "test-model",
      workspaceNodeCount: 0,
      workspaceSnapshot: null,
    };
  });
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const userId = `integration-stream-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id: userId,
    name: "Stream Integration User",
    email: `${userId}@example.test`,
  });
  fixtureUsers.push(userId);
  return userId;
}

describe("dashboard agent stream persistence", () => {
  test("streamDashboardConversationTurn persists messages and yields completed", async () => {
    const userId = await createFixtureUser();
    const events = [];

    for await (const event of service.streamDashboardConversationTurn(userId, {
      actorUserName: "Stream User",
      turn: {
        content: "Hello stream",
        attachments: [],
        model: "test-model",
        toolPreset: "ask",
        surface: "canvas",
        nodes: [],
      },
    })) {
      events.push(event);
    }

    expect(streamDashboardAgent).toHaveBeenCalledTimes(1);
    expect(events.some((event) => event.type === "started")).toBe(true);
    expect(events.some((event) => event.type === "token")).toBe(true);
    const completed = events.find((event) => event.type === "completed");
    expect(completed?.type).toBe("completed");
    if (completed?.type === "completed") {
      expect(completed.assistantMessage.content).toBe("Hi");
      expect(completed.stopped).toBe(false);
      expect(completed.createdConversation).toBe(true);
    }

    const detail = await service.getDashboardConversation(userId, {
      conversationId: completed?.type === "completed" ? completed.conversation.id : "",
    });
    expect(detail.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
  });

  test("aborting the turnStream listener does not persist an empty failure", async () => {
    const userId = await createFixtureUser();
    let releaseAgent: () => void = () => undefined;
    const blocked = new Promise<void>((resolve) => {
      releaseAgent = resolve;
    });

    streamDashboardAgent.mockImplementation(async function* () {
      await blocked;
      yield { type: "token" as const, delta: "Still here" };
      yield {
        type: "done" as const,
        responseText: "Still here",
        toolCalls: [],
        artifacts: [],
        usage: {
          modelId: "test-model",
          contextLength: null,
          inputTokens: 4,
          cachedTokens: 0,
          outputTokens: 2,
          reasoningTokens: 0,
          totalTokens: 6,
          costUsd: 0,
        },
        model: "test-model",
        workspaceNodeCount: 0,
        workspaceSnapshot: null,
      };
    });

    const listener = new AbortController();
    let conversationId = "";
    for await (const event of service.streamDashboardConversationTurn(userId, {
      actorUserName: "Stream User",
      signal: listener.signal,
      turn: {
        content: "Keep going",
        attachments: [],
        model: "test-model",
        toolPreset: "ask",
        surface: "canvas",
        nodes: [],
      },
    })) {
      if (event.type === "started") {
        conversationId = event.conversationId;
        listener.abort();
      }
    }

    releaseAgent();

    let detail = await service.getDashboardConversation(userId, { conversationId });
    for (let attempt = 0; attempt < 40 && detail.activeRunId; attempt += 1) {
      await Bun.sleep(25);
      detail = await service.getDashboardConversation(userId, { conversationId });
    }

    expect(detail.messages.at(-1)?.role).toBe("assistant");
    expect(detail.messages.at(-1)?.content).toBe("Still here");
    expect(detail.activeRunId).toBeNull();
  });
});
