import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [
  { db },
  { user },
  { createWorkspaceNode, DEFAULT_CANVAS_WORKSPACE_TITLE },
  canvasWorkspaceService,
  workspaceService,
  knowledgeService,
] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema/auth"),
  import("@orch/workspace"),
  import("./canvas-workspace-service"),
  import("./service"),
  import("./knowledge-service"),
]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `integration-brains-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Canvas Brain User",
    email: `${id}@example.test`,
  });
  fixtureUsers.push(id);
  return id;
}

describe("canvas named brains isolation", () => {
  test("ensureDefault is idempotent and titles the first brain Legacy Canvas", async () => {
    const ownerUserId = await createFixtureUser();
    const first = await canvasWorkspaceService.ensureDefaultCanvasWorkspace(ownerUserId);
    const second = await canvasWorkspaceService.ensureDefaultCanvasWorkspace(ownerUserId);
    expect(first.id).toBe(second.id);
    expect(DEFAULT_CANVAS_WORKSPACE_TITLE).toBe("Legacy Canvas");
    expect(first.title).toBe(DEFAULT_CANVAS_WORKSPACE_TITLE);
    const listed = await canvasWorkspaceService.listCanvasWorkspaces(ownerUserId, {});
    expect(listed.items).toHaveLength(1);
  });

  test("brain A cannot read brain B and an outsider cannot open either", async () => {
    const ownerUserId = await createFixtureUser();
    const outsiderUserId = await createFixtureUser();
    const brainA = await canvasWorkspaceService.ensureDefaultCanvasWorkspace(ownerUserId);
    const brainB = await canvasWorkspaceService.createCanvasWorkspace(ownerUserId, {
      title: "Client X",
    });
    const nodeA = createWorkspaceNode({ title: "A only", ownerUserId });
    const nodeB = createWorkspaceNode({ title: "B only", ownerUserId });

    await workspaceService.saveWorkspaceNodes(ownerUserId, {
      canvasWorkspaceId: brainA.id,
      nodes: [nodeA],
    });
    await workspaceService.saveWorkspaceNodes(ownerUserId, {
      canvasWorkspaceId: brainB.id,
      nodes: [nodeB],
    });

    const snapA = await workspaceService.getWorkspaceSnapshot(ownerUserId, {
      canvasWorkspaceId: brainA.id,
    });
    const snapB = await workspaceService.getWorkspaceSnapshot(ownerUserId, {
      canvasWorkspaceId: brainB.id,
    });
    expect(snapA.nodes.map((node) => node.id)).toEqual([nodeA.id]);
    expect(snapB.nodes.map((node) => node.id)).toEqual([nodeB.id]);

    await expect(
      workspaceService.getWorkspaceSnapshot(outsiderUserId, { canvasWorkspaceId: brainA.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      canvasWorkspaceService.getCanvasWorkspace(outsiderUserId, {
        canvasWorkspaceId: brainA.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      workspaceService.saveWorkspaceNodes(outsiderUserId, {
        canvasWorkspaceId: brainA.id,
        nodes: [{ ...nodeA, title: "Stolen" }],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("CNS query_knowledge returns mixed workspace ids and titles", async () => {
    const ownerUserId = await createFixtureUser();
    const outsiderUserId = await createFixtureUser();
    const brainA = await canvasWorkspaceService.ensureDefaultCanvasWorkspace(ownerUserId);
    const brainB = await canvasWorkspaceService.createCanvasWorkspace(ownerUserId, {
      title: "Client X",
    });

    await knowledgeService.applyKnowledgeAction(ownerUserId, {
      canvasWorkspaceId: brainA.id,
      action: { type: "object.create", objectType: "note", title: "Personal note" },
    });
    await knowledgeService.applyKnowledgeAction(ownerUserId, {
      canvasWorkspaceId: brainB.id,
      action: { type: "object.create", objectType: "note", title: "Client note" },
    });

    const scoped = await knowledgeService.queryKnowledgeObjects(ownerUserId, {
      canvasWorkspaceId: brainB.id,
    });
    expect(scoped.items.every((item) => item.canvasWorkspaceId === brainB.id)).toBe(true);
    expect(scoped.items.some((item) => item.title === "Client note")).toBe(true);
    expect(scoped.items.some((item) => item.title === "Personal note")).toBe(false);

    const cns = await knowledgeService.queryKnowledgeObjects(ownerUserId, {});
    const titles = new Set(cns.items.map((item) => item.title));
    expect(titles.has("Personal note")).toBe(true);
    expect(titles.has("Client note")).toBe(true);
    const personal = cns.items.find((item) => item.title === "Personal note");
    const client = cns.items.find((item) => item.title === "Client note");
    expect(personal?.canvasWorkspaceId).toBe(brainA.id);
    expect(personal?.canvasWorkspaceTitle).toBe(DEFAULT_CANVAS_WORKSPACE_TITLE);
    expect(client?.canvasWorkspaceId).toBe(brainB.id);
    expect(client?.canvasWorkspaceTitle).toBe("Client X");

    await expect(
      knowledgeService.queryKnowledgeObjects(outsiderUserId, { canvasWorkspaceId: brainB.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const outsiderCns = await knowledgeService.queryKnowledgeObjects(outsiderUserId, {});
    expect(outsiderCns.items.some((item) => item.title === "Client note")).toBe(false);
  });

  test("brain appearance persists in workspace settings", async () => {
    const ownerUserId = await createFixtureUser();
    const brain = await canvasWorkspaceService.createCanvasWorkspace(ownerUserId, {
      title: "Research",
      iconKey: "code",
      colorHueId: 3,
    });
    expect(brain.iconKey).toBe("code");
    expect(brain.colorHueId).toBe(3);

    const updated = await canvasWorkspaceService.updateCanvasWorkspace(ownerUserId, {
      canvasWorkspaceId: brain.id,
      iconKey: "palette",
      colorHueId: 5,
    });
    expect(updated.iconKey).toBe("palette");
    expect(updated.colorHueId).toBe(5);
  });

  test("knowledge writes fail closed without a brain", async () => {
    const ownerUserId = await createFixtureUser();
    await expect(
      knowledgeService.applyKnowledgeAction(ownerUserId, {
        action: { type: "object.create", objectType: "note", title: "No brain" },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
