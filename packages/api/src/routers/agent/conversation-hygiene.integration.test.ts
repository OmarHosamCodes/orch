import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [{ db }, { user }, { agentRun, dashboardConversation }, service, hygiene] = await Promise.all(
  [
    import("@orch/db"),
    import("@orch/db/schema/auth"),
    import("@orch/db/schema"),
    import("./service"),
    import("./conversation-hygiene"),
  ],
);

const userIds: string[] = [];

afterEach(async () => {
  for (const userId of userIds.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `hygiene-agent-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Hygiene User",
    email: `${id}@example.test`,
  });
  userIds.push(id);
  return id;
}

async function bumpLastMessage(conversationId: string) {
  const later = new Date();
  await db
    .update(dashboardConversation)
    .set({ lastMessageAt: later, updatedAt: later })
    .where(eq(dashboardConversation.id, conversationId));
  return later;
}

describe("conversation hygiene", () => {
  test("unread conversations appear in compact until marked read", async () => {
    const userId = await createFixtureUser();
    const created = await service.createDashboardConversation(userId, {
      content: "Draft the weekly recap",
      model: "test-model",
      toolPreset: "ask",
    });

    const fresh = await hygiene.listCompactDashboardConversations(userId, {});
    expect(fresh.conversations.some((item) => item.id === created.id)).toBe(false);

    await bumpLastMessage(created.id);
    const unread = await hygiene.listCompactDashboardConversations(userId, {});
    const row = unread.conversations.find((item) => item.id === created.id);
    expect(row?.unread).toBe(true);

    const marked = await hygiene.markDashboardConversationRead(userId, {
      conversationId: created.id,
    });
    expect(marked.unread).toBe(false);
    expect(
      (await hygiene.listCompactDashboardConversations(userId, {})).conversations.some(
        (item) => item.id === created.id,
      ),
    ).toBe(false);
  });

  test("settle hides from compact and unsettle restores unread threads", async () => {
    const userId = await createFixtureUser();
    const created = await service.createDashboardConversation(userId, {
      content: "Settle this thread",
      model: "test-model",
      toolPreset: "ask",
    });
    await bumpLastMessage(created.id);

    expect(
      (await hygiene.listCompactDashboardConversations(userId, {})).conversations.some(
        (item) => item.id === created.id,
      ),
    ).toBe(true);

    const settled = await hygiene.settleDashboardConversation(userId, {
      conversationId: created.id,
    });
    expect(settled.archivedAt).toBeTruthy();
    expect(
      (await hygiene.listCompactDashboardConversations(userId, {})).conversations.some(
        (item) => item.id === created.id,
      ),
    ).toBe(false);
    expect(
      (await service.listDashboardConversations(userId, { filter: "settled" })).conversations.some(
        (item) => item.id === created.id,
      ),
    ).toBe(true);

    await hygiene.unsettleDashboardConversation(userId, { conversationId: created.id });
    expect(
      (await hygiene.listCompactDashboardConversations(userId, {})).conversations.some(
        (item) => item.id === created.id,
      ),
    ).toBe(true);
  });

  test("running conversations appear in compact even when read", async () => {
    const userId = await createFixtureUser();
    const created = await service.createDashboardConversation(userId, {
      content: "Still running",
      model: "test-model",
      toolPreset: "ask",
    });
    const now = new Date();
    const runId = `run-${crypto.randomUUID()}`;
    await db.insert(agentRun).values({
      id: runId,
      userId,
      conversationId: created.id,
      kind: "chat",
      status: "running",
      model: "test-model",
      lastSeq: 0,
      startedAt: now,
      heartbeatAt: now,
      createdAt: now,
    });

    const compact = await hygiene.listCompactDashboardConversations(userId, {});
    const row = compact.conversations.find((item) => item.id === created.id);
    expect(row?.activeRunId).toBe(runId);
    expect(row?.unread).toBe(false);
  });
});
