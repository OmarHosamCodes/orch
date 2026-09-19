import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [
  { db },
  { user, workspaceObject, workspaceRelation, workspacePlacement },
  { createWorkspaceNode },
  teamService,
  workspaceService,
  knowledgeService,
  knowledgeCapture,
  { createAgencyClient },
  { createAgencyProject },
  canvasWorkspaceService,
] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema"),
  import("@orch/workspace"),
  import("../team/service"),
  import("./service"),
  import("./knowledge-service"),
  import("./knowledge-capture"),
  import("../agency-ops/clients/service"),
  import("../agency-ops/projects/service"),
  import("./canvas-workspace-service"),
]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `integration-knowledge-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Knowledge Integration User",
    email: `${id}@example.test`,
  });
  fixtureUsers.push(id);
  return id;
}

async function defaultWorkspaceId(userId: string) {
  return (await canvasWorkspaceService.ensureDefaultCanvasWorkspace(userId)).id;
}

async function saveNodes(
  userId: string,
  input: { nodes: Parameters<typeof workspaceService.saveWorkspaceNodes>[1]["nodes"] },
) {
  return workspaceService.saveWorkspaceNodes(userId, {
    canvasWorkspaceId: await defaultWorkspaceId(userId),
    nodes: input.nodes,
  });
}

async function getSnapshot(userId: string) {
  return workspaceService.getWorkspaceSnapshot(userId, {
    canvasWorkspaceId: await defaultWorkspaceId(userId),
  });
}

async function applyKnowledge(
  userId: string,
  input: Parameters<typeof knowledgeService.applyKnowledgeAction>[1],
) {
  return knowledgeService.applyKnowledgeAction(userId, {
    ...input,
    canvasWorkspaceId: input.canvasWorkspaceId ?? (await defaultWorkspaceId(userId)),
  });
}

async function captureKnowledge(
  userId: string,
  input: Parameters<typeof knowledgeCapture.captureKnowledgeAction>[1],
) {
  return knowledgeCapture.captureKnowledgeAction(userId, {
    ...input,
    canvasWorkspaceId: input.canvasWorkspaceId ?? (await defaultWorkspaceId(userId)),
  });
}

async function getBoard(userId: string, input: { teamId?: string } = {}) {
  return knowledgeService.listKnowledgeBoard(userId, {
    canvasWorkspaceId: await defaultWorkspaceId(userId),
    ...input,
  });
}

describe("workspace knowledge dual-write", () => {
  test("saves orchestrator connections and agencyRef as relations", async () => {
    const ownerUserId = await createFixtureUser();
    const team = await teamService.createTeam(ownerUserId, { name: "Knowledge Team" });
    const target = createWorkspaceNode({
      title: "Target",
      ownerUserId,
    });
    const orch = createWorkspaceNode({
      title: "Orch",
      ownerUserId,
      nodeType: "orchestrator",
      connections: [{ targetNodeId: target.id }],
    });
    const linked = createWorkspaceNode({
      title: "Launch",
      ownerUserId,
      visibility: "team",
      teamId: team.id,
      agencyRef: { teamId: team.id, projectId: "proj-missing" },
    });

    await saveNodes(ownerUserId, {
      nodes: [target, orch, linked],
    });

    const objects = await db
      .select()
      .from(workspaceObject)
      .where(eq(workspaceObject.ownerUserId, ownerUserId));
    expect(objects).toHaveLength(3);

    const placements = await db
      .select()
      .from(workspacePlacement)
      .where(eq(workspacePlacement.ownerUserId, ownerUserId));
    expect(placements).toHaveLength(3);

    const related = await db
      .select()
      .from(workspaceRelation)
      .where(eq(workspaceRelation.fromObjectId, orch.id));
    expect(
      related.some((row) => row.relationType === "related" && row.toObjectId === target.id),
    ).toBe(true);

    const about = await db
      .select()
      .from(workspaceRelation)
      .where(eq(workspaceRelation.fromObjectId, linked.id));
    expect(about.some((row) => row.toObjectType === "agency.project")).toBe(true);

    const unplacedNote = await applyKnowledge(ownerUserId, {
      action: {
        type: "object.create",
        objectType: "note",
        title: "Private thought",
        properties: { body: "keep me" },
      },
    });
    await saveNodes(ownerUserId, {
      nodes: [target, orch, linked],
    });
    const stillThere = await knowledgeService.getKnowledgeObject(ownerUserId, {
      id: unplacedNote.objectId,
    });
    expect(stillThere.object?.title).toBe("Private thought");
    expect(stillThere.object?.teamId).toBeNull();
  });

  test("capture decision about a live project then query about it", async () => {
    const ownerUserId = await createFixtureUser();
    const outsiderUserId = await createFixtureUser();
    const team = await teamService.createTeam(ownerUserId, { name: "Brain Team" });
    const client = await createAgencyClient(ownerUserId, {
      teamId: team.id,
      name: "Acme",
    });
    const project = await createAgencyProject(ownerUserId, {
      teamId: team.id,
      clientId: client.id,
      name: "Launch",
    });

    await expect(
      applyKnowledge(ownerUserId, {
        action: {
          type: "object.create",
          objectType: "decision",
          title: "Cut scope",
          visibility: "team",
          teamId: team.id,
          about: { objectType: "agency.project", id: "proj-missing" },
        },
      }),
    ).rejects.toThrow();

    const created = await applyKnowledge(ownerUserId, {
      action: {
        type: "object.create",
        objectType: "decision",
        title: "Cut scope",
        visibility: "team",
        teamId: team.id,
        about: { objectType: "agency.project", id: project.id },
        placement: { x: 12, y: 24 },
      },
    });

    const aboutQuery = await knowledgeService.queryKnowledgeObjects(ownerUserId, {
      teamId: team.id,
      about: { objectType: "agency.project", id: project.id },
    });
    expect(
      aboutQuery.items.some((item) => item.id === created.objectId && item.title === "Cut scope"),
    ).toBe(true);

    const projects = await knowledgeService.queryKnowledgeObjects(ownerUserId, {
      teamId: team.id,
      objectType: "agency.project",
    });
    expect(projects.items.some((item) => item.id === project.id && item.origin === "agency")).toBe(
      true,
    );

    await expect(
      knowledgeService.queryKnowledgeObjects(outsiderUserId, {
        teamId: team.id,
        objectType: "agency.project",
      }),
    ).rejects.toThrow();

    const detail = await knowledgeService.getKnowledgeObject(ownerUserId, { id: created.objectId });
    expect(detail.revisions.length).toBeGreaterThan(0);

    const snapshot = await getSnapshot(ownerUserId);
    const card = snapshot.nodes.find((node) => node.id === created.objectId);
    expect(card).toBeUndefined();
    expect(detail.relations.some((relation) => relation.relationType === "about")).toBe(true);
  });

  test("query hides private objects from outsiders", async () => {
    const ownerUserId = await createFixtureUser();
    const outsiderUserId = await createFixtureUser();
    await applyKnowledge(ownerUserId, {
      action: {
        type: "object.create",
        objectType: "note",
        title: "Secret",
      },
    });
    const outsiderQuery = await knowledgeService.queryKnowledgeObjects(outsiderUserId, {
      query: "Secret",
    });
    expect(outsiderQuery.items).toHaveLength(0);
  });

  test("stores source upload id without projecting into the document blob", async () => {
    const ownerUserId = await createFixtureUser();
    const created = await applyKnowledge(ownerUserId, {
      action: {
        type: "object.create",
        objectType: "source",
        title: "Brief",
        properties: {
          kind: "upload",
          uploadId: "ksrc-1",
          filename: "brief.pdf",
          mediaType: "application/pdf",
        },
        placement: { x: 8, y: 16 },
      },
    });
    const detail = await knowledgeService.getKnowledgeObject(ownerUserId, { id: created.objectId });
    expect(detail.object?.properties.uploadId).toBe("ksrc-1");
    const snapshot = await getSnapshot(ownerUserId);
    expect(snapshot.nodes.some((node) => node.id === created.objectId)).toBe(false);
  });

  test("folder in round-trip stays off board noodles and appears as parentId", async () => {
    const ownerUserId = await createFixtureUser();
    const folder = await applyKnowledge(ownerUserId, {
      action: {
        type: "object.create",
        objectType: "folder",
        title: "Research",
        placement: { x: 40, y: 80, width: 640, height: 420 },
      },
    });
    const note = await applyKnowledge(ownerUserId, {
      action: {
        type: "object.create",
        objectType: "note",
        title: "Clip",
        properties: { body: "keep" },
        placement: { x: 60, y: 120 },
      },
    });
    await applyKnowledge(ownerUserId, {
      action: {
        type: "relation.create",
        fromObjectId: note.objectId,
        to: { objectType: "folder", id: folder.objectId },
        relationType: "in",
      },
    });
    await expect(
      applyKnowledge(ownerUserId, {
        action: {
          type: "relation.create",
          fromObjectId: note.objectId,
          to: { objectType: "note", id: note.objectId },
          relationType: "in",
        },
      }),
    ).rejects.toThrow(/folder/);

    const board = await getBoard(ownerUserId);
    const child = board.items.find((item) => item.id === note.objectId);
    expect(child?.parentId).toBe(folder.objectId);
    expect(child?.kind).toBe("knowledge");
    const snapshot = await getSnapshot(ownerUserId);
    expect(snapshot.nodes.some((node) => node.connections.length > 0)).toBe(false);
  });

  test("agency pin has placement and no workspace_object row", async () => {
    const ownerUserId = await createFixtureUser();
    const team = await teamService.createTeam(ownerUserId, { name: "Pin Team" });
    const client = await createAgencyClient(ownerUserId, { teamId: team.id, name: "Acme" });
    const project = await createAgencyProject(ownerUserId, {
      teamId: team.id,
      clientId: client.id,
      name: "Launch",
    });
    await applyKnowledge(ownerUserId, {
      action: {
        type: "placement.upsert",
        objectId: project.id,
        objectType: "agency.project",
        teamId: team.id,
        x: 12,
        y: 24,
      },
      teamId: team.id,
    });
    const objects = await db
      .select()
      .from(workspaceObject)
      .where(eq(workspaceObject.id, project.id));
    expect(objects).toHaveLength(0);
    const pins = await db
      .select()
      .from(workspacePlacement)
      .where(eq(workspacePlacement.objectId, project.id));
    expect(pins).toHaveLength(1);
    expect(pins[0]?.objectType).toBe("agency.project");
    const board = await getBoard(ownerUserId, { teamId: team.id });
    expect(board.items.some((item) => item.id === project.id && item.kind === "agency")).toBe(true);
  });

  test("private and team note capture apply immediately", async () => {
    const ownerUserId = await createFixtureUser();
    const team = await teamService.createTeam(ownerUserId, { name: "Capture Team" });
    const privateNote = await captureKnowledge(ownerUserId, {
      action: { type: "object.create", objectType: "note", title: "Private thought" },
    });
    expect(privateNote.status).toBe("applied");
    expect(privateNote.proposalId).toBeNull();
    const stored = await knowledgeService.getKnowledgeObject(ownerUserId, {
      id: privateNote.objectId ?? "",
    });
    expect(stored.object?.title).toBe("Private thought");
    const board = await getBoard(ownerUserId);
    expect(board.items.some((item) => item.kind === "inbox")).toBe(false);
    expect(board.unplaced.some((item) => item.id === privateNote.objectId && item.unplaced)).toBe(
      true,
    );

    const teamNote = await captureKnowledge(ownerUserId, {
      action: {
        type: "object.create",
        objectType: "note",
        title: "Team thought",
        visibility: "team",
        teamId: team.id,
      },
      teamId: team.id,
    });
    expect(teamNote.status).toBe("applied");
    expect(teamNote.proposalId).toBeNull();
    const pendingRows = await db
      .select()
      .from(workspaceObject)
      .where(eq(workspaceObject.ownerUserId, ownerUserId));
    expect(pendingRows.some((row) => row.title === "Team thought")).toBe(true);
  });
});
