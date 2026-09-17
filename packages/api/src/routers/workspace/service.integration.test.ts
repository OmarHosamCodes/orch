import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [{ db }, { user }, { createWorkspaceNode }, teamService, workspaceService, billingTeam] =
  await Promise.all([
    import("@orch/db"),
    import("@orch/db/schema/auth"),
    import("@orch/workspace"),
    import("../team/service"),
    import("./service"),
    import("../../billing-team"),
  ]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `integration-workspace-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Workspace Integration User",
    email: `${id}@example.test`,
  });
  fixtureUsers.push(id);
  return id;
}

describe("workspace service authorization", () => {
  test("does not expose or mutate another user's private or team-shared nodes", async () => {
    const ownerUserId = await createFixtureUser();
    const outsiderUserId = await createFixtureUser();
    const team = await teamService.createTeam(ownerUserId, { name: "Workspace Owner Team" });
    const privateNode = createWorkspaceNode({
      title: "Owner Private Node",
      ownerUserId,
    });
    const sharedNode = createWorkspaceNode({
      title: "Owner Shared Node",
      ownerUserId,
      visibility: "team",
      teamId: team.id,
    });

    await workspaceService.saveWorkspaceNodes(ownerUserId, {
      nodes: [privateNode, sharedNode],
    });

    const outsiderSnapshot = await workspaceService.getWorkspaceSnapshot(outsiderUserId, {});
    expect(outsiderSnapshot.nodes).toHaveLength(0);

    await expect(
      workspaceService.saveWorkspaceNodes(outsiderUserId, {
        nodes: [{ ...privateNode, title: "Outsider Rename" }],
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      workspaceService.deleteWorkspaceNode(outsiderUserId, {
        nodeId: sharedNode.id,
        ownerUserId,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const ownerSnapshot = await workspaceService.getWorkspaceSnapshot(ownerUserId, {});
    expect(ownerSnapshot.nodes.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: privateNode.id, title: "Owner Private Node" },
      { id: sharedNode.id, title: "Owner Shared Node" },
    ]);
  });

  test("rejects an attacker-owned team being used to overwrite a private foreign node", async () => {
    const victimUserId = await createFixtureUser();
    const attackerUserId = await createFixtureUser();
    const attackerTeam = await teamService.createTeam(attackerUserId, {
      name: "Attacker Team",
    });
    const victimNode = createWorkspaceNode({
      title: "Victim Private Node",
      ownerUserId: victimUserId,
    });
    const attackerOrchestrator = createWorkspaceNode({
      title: "Attacker Orchestrator",
      ownerUserId: attackerUserId,
      nodeType: "orchestrator",
      connections: [{ targetNodeId: victimNode.id }],
    });
    await workspaceService.saveWorkspaceNodes(victimUserId, { nodes: [victimNode] });

    await expect(
      workspaceService.saveWorkspaceNodes(attackerUserId, {
        nodes: [
          attackerOrchestrator,
          {
            ...victimNode,
            title: "Attacker Overwrite",
            visibility: "team",
            teamId: attackerTeam.id,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(await workspaceService.getWorkspaceSnapshot(attackerUserId, {})).toEqual({
      nodes: [],
      updatedAt: null,
    });

    const victimSnapshot = await workspaceService.getWorkspaceSnapshot(victimUserId, {});
    expect(victimSnapshot.nodes).toHaveLength(1);
    expect(victimSnapshot.nodes[0]).toMatchObject({
      id: victimNode.id,
      title: "Victim Private Node",
      ownerUserId: victimUserId,
      visibility: "private",
      teamId: null,
    });
  });

  test("rejects a non-member update to an existing foreign team-shared node", async () => {
    const ownerUserId = await createFixtureUser();
    const outsiderUserId = await createFixtureUser();
    const ownerTeam = await teamService.createTeam(ownerUserId, { name: "Owner Team" });
    const sharedNode = createWorkspaceNode({
      title: "Owner Shared Node",
      ownerUserId,
      visibility: "team",
      teamId: ownerTeam.id,
    });
    await workspaceService.saveWorkspaceNodes(ownerUserId, { nodes: [sharedNode] });

    await expect(
      workspaceService.saveWorkspaceNodes(outsiderUserId, {
        nodes: [{ ...sharedNode, title: "Outsider Overwrite" }],
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const ownerSnapshot = await workspaceService.getWorkspaceSnapshot(ownerUserId, {});
    expect(ownerSnapshot.nodes).toHaveLength(1);
    expect(ownerSnapshot.nodes[0]).toMatchObject({
      id: sharedNode.id,
      title: "Owner Shared Node",
      ownerUserId,
      visibility: "team",
      teamId: ownerTeam.id,
    });
  });

  test("still allows an editor to update an existing node shared with their team", async () => {
    const ownerUserId = await createFixtureUser();
    const editorUserId = await createFixtureUser();
    const ownerTeam = await teamService.createTeam(ownerUserId, { name: "Editor Team" });
    await billingTeam.applyPaidPlan(ownerTeam.id, "agency", { seats: 2 });
    await teamService.addTeamMember(ownerUserId, {
      teamId: ownerTeam.id,
      userEmail: `${editorUserId}@example.test`,
      role: "editor",
    });
    const sharedNode = createWorkspaceNode({
      title: "Shared Before Edit",
      ownerUserId,
      visibility: "team",
      teamId: ownerTeam.id,
    });
    await workspaceService.saveWorkspaceNodes(ownerUserId, { nodes: [sharedNode] });

    await workspaceService.saveWorkspaceNodes(editorUserId, {
      nodes: [{ ...sharedNode, title: "Shared After Edit" }],
    });

    const ownerSnapshot = await workspaceService.getWorkspaceSnapshot(ownerUserId, {});
    expect(ownerSnapshot.nodes).toHaveLength(1);
    expect(ownerSnapshot.nodes[0]).toMatchObject({
      id: sharedNode.id,
      title: "Shared After Edit",
      ownerUserId,
      visibility: "team",
      teamId: ownerTeam.id,
    });
  });

  test("does not derive updatedAt from a related workspace with no visible nodes", async () => {
    const ownerUserId = await createFixtureUser();
    const teammateUserId = await createFixtureUser();
    const team = await teamService.createTeam(ownerUserId, { name: "Visibility Team" });
    await billingTeam.applyPaidPlan(team.id, "agency", { seats: 2 });
    await teamService.addTeamMember(ownerUserId, {
      teamId: team.id,
      userEmail: `${teammateUserId}@example.test`,
      role: "viewer",
    });
    const privateNode = createWorkspaceNode({
      title: "Owner Private Node",
      ownerUserId,
    });
    await workspaceService.saveWorkspaceNodes(ownerUserId, { nodes: [privateNode] });

    const hiddenSnapshot = await workspaceService.getWorkspaceSnapshot(teammateUserId, {});
    expect(hiddenSnapshot).toEqual({ nodes: [], updatedAt: null });

    const sharedNode = createWorkspaceNode({
      title: "Owner Shared Node",
      ownerUserId,
      visibility: "team",
      teamId: team.id,
    });
    await workspaceService.saveWorkspaceNodes(ownerUserId, {
      nodes: [privateNode, sharedNode],
    });

    const visibleSnapshot = await workspaceService.getWorkspaceSnapshot(teammateUserId, {});
    expect(visibleSnapshot.nodes.map((node) => node.id)).toEqual([sharedNode.id]);
    expect(visibleSnapshot.updatedAt).not.toBeNull();
  });

  test("only treats foreign nodes accepted for persistence as valid connection targets", async () => {
    const ownerUserId = await createFixtureUser();
    const teammateUserId = await createFixtureUser();
    const team = await teamService.createTeam(ownerUserId, { name: "Connection Team" });
    await billingTeam.applyPaidPlan(team.id, "agency", { seats: 2 });
    await teamService.addTeamMember(ownerUserId, {
      teamId: team.id,
      userEmail: `${teammateUserId}@example.test`,
      role: "viewer",
    });
    const sharedNode = createWorkspaceNode({
      title: "Owner Shared Target",
      ownerUserId,
      visibility: "team",
      teamId: team.id,
    });
    await workspaceService.saveWorkspaceNodes(ownerUserId, { nodes: [sharedNode] });
    const teammateOrchestrator = createWorkspaceNode({
      title: "Teammate Orchestrator",
      ownerUserId: teammateUserId,
      nodeType: "orchestrator",
      connections: [{ targetNodeId: sharedNode.id }],
    });

    await expect(
      workspaceService.saveWorkspaceNodes(teammateUserId, {
        nodes: [teammateOrchestrator, sharedNode],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(
      (await workspaceService.getWorkspaceSnapshot(teammateUserId, {})).nodes.some(
        (node) => node.id === teammateOrchestrator.id,
      ),
    ).toBe(false);

    await teamService.updateTeamMemberRole(ownerUserId, {
      teamId: team.id,
      userId: teammateUserId,
      role: "editor",
    });
    await workspaceService.saveWorkspaceNodes(teammateUserId, {
      nodes: [teammateOrchestrator, sharedNode],
    });

    expect(
      (await workspaceService.getWorkspaceSnapshot(teammateUserId, {})).nodes.find(
        (node) => node.id === teammateOrchestrator.id,
      ),
    ).toMatchObject({ connections: [{ targetNodeId: sharedNode.id }] });
  });
});
