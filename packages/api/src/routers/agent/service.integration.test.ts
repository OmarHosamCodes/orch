import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [{ db }, { user }, service] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema/auth"),
  import("./service"),
]);

const userIds: string[] = [];

afterEach(async () => {
  for (const userId of userIds.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `integration-agent-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Agent Integration User",
    email: `${id}@example.test`,
  });
  userIds.push(id);
  return id;
}

describe("dashboard agent service persistence", () => {
  test("creates, lists, renames, reads, and deletes a conversation", async () => {
    const userId = await createFixtureUser();
    const created = await service.createDashboardConversation(userId, {
      content: "Plan the next sprint",
      model: "test-model",
      toolPreset: "ask",
    });

    expect(created.userId).toBe(userId);
    expect(created.title).toBe("Plan the next sprint");

    const listed = await service.listDashboardConversations(userId, {});
    expect(listed.conversations.some((conversation) => conversation.id === created.id)).toBe(true);

    const renamed = await service.renameDashboardConversation(userId, {
      conversationId: created.id,
      title: "  Sprint plan  ",
    });
    expect(renamed.title).toBe("Sprint plan");
    expect(
      (await service.getDashboardConversation(userId, { conversationId: created.id })).title,
    ).toBe("Sprint plan");

    expect(
      await service.deleteDashboardConversation(userId, { conversationId: created.id }),
    ).toEqual({
      conversationId: created.id,
      deleted: true,
    });
    expect((await service.listDashboardConversations(userId, {})).conversations).toHaveLength(0);
  });

  test("does not expose or mutate another user's conversation", async () => {
    const ownerUserId = await createFixtureUser();
    const outsiderUserId = await createFixtureUser();
    const created = await service.createDashboardConversation(ownerUserId, {
      content: "Owner-only conversation",
      model: "test-model",
      toolPreset: "ask",
    });

    expect(
      (await service.listDashboardConversations(outsiderUserId, {})).conversations.some(
        (conversation) => conversation.id === created.id,
      ),
    ).toBe(false);

    await expect(
      service.getDashboardConversation(outsiderUserId, { conversationId: created.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.renameDashboardConversation(outsiderUserId, {
        conversationId: created.id,
        title: "Outsider Rename",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.deleteDashboardConversation(outsiderUserId, { conversationId: created.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(
      (await service.getDashboardConversation(ownerUserId, { conversationId: created.id })).title,
    ).toBe("Owner-only conversation");
  });

  test("getOrCreateTaskConversation is unique per user and task", async () => {
    const userId = await createFixtureUser();
    const otherUserId = await createFixtureUser();
    const first = await service.getOrCreateTaskConversation(userId, {
      taskId: "task-1",
      title: "Cover slide",
    });
    const second = await service.getOrCreateTaskConversation(userId, {
      taskId: "task-1",
      title: "Other title",
    });
    expect(second.id).toBe(first.id);
    expect(first.taskId).toBe("task-1");

    const other = await service.getOrCreateTaskConversation(otherUserId, {
      taskId: "task-1",
      title: "Cover slide",
    });
    expect(other.id).not.toBe(first.id);
    expect(other.taskId).toBe("task-1");
  });
});
