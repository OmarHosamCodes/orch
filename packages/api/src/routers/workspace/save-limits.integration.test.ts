import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import {
  createWorkspaceNode,
  createWorkspaceNodeTab,
  createWorkspaceNotesBlock,
  normalizeWorkspaceNode,
  type WorkspaceNode,
} from "@orch/workspace";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [{ db }, { user, workspaceTeamBilling }, teamService, { assertCanSaveWorkspaceNodes }] =
  await Promise.all([
    import("@orch/db"),
    import("@orch/db/schema"),
    import("../team/service"),
    import("./service"),
  ]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `integration-workspace-limits-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Workspace Limits User",
    email: `${id}@example.test`,
  });
  fixtureUsers.push(id);
  return id;
}

function stubNode(ownerUserId: string, id: string, tabs: Array<{ blocks: number }>): WorkspaceNode {
  return normalizeWorkspaceNode(
    createWorkspaceNode({
      id,
      title: `Node ${id}`,
      ownerUserId,
      tabs: tabs.map((tab, index) =>
        createWorkspaceNodeTab({
          title: `Tab ${index}`,
          blocks: Array.from({ length: tab.blocks }, () =>
            createWorkspaceNotesBlock({ body: "stub" }),
          ),
        }),
      ),
    }),
  );
}

describe("assertCanSaveWorkspaceNodes agency caps", () => {
  test("leftover save of 4 nodes is limit_reached", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Canvas Agency" });
    await db
      .update(workspaceTeamBilling)
      .set({ trialEndsAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(workspaceTeamBilling.teamId, team.id));
    const now = new Date("2026-12-01T00:00:00.000Z");
    const nodes = [0, 1, 2, 3].map((i) => stubNode(ownerId, `n${i}`, [{ blocks: 1 }]));
    await expect(assertCanSaveWorkspaceNodes(ownerId, { nodes, now })).rejects.toMatchObject({
      data: { code: "limit_reached" },
      message: "This agency can have 3 workspace nodes on leftover. Subscribe to add more.",
    });
  });

  test("leftover save of 3 nodes with 2 blocks is allowed", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Canvas Agency Allowed" });
    await db
      .update(workspaceTeamBilling)
      .set({ trialEndsAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(workspaceTeamBilling.teamId, team.id));
    const now = new Date("2026-12-01T00:00:00.000Z");
    const nodes = [0, 1, 2].map((i) => stubNode(ownerId, `n${i}`, [{ blocks: 2 }]));
    await expect(assertCanSaveWorkspaceNodes(ownerId, { nodes, now })).resolves.toBeUndefined();
  });

  test("leftover save with 3 blocks on one tab is limit_reached", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Canvas Agency Blocks" });
    await db
      .update(workspaceTeamBilling)
      .set({ trialEndsAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(workspaceTeamBilling.teamId, team.id));
    const now = new Date("2026-12-01T00:00:00.000Z");
    const nodes = [stubNode(ownerId, "n1", [{ blocks: 3 }])];
    await expect(assertCanSaveWorkspaceNodes(ownerId, { nodes, now })).rejects.toMatchObject({
      message: "This agency can have 2 blocks per tab on leftover. Subscribe to add more.",
    });
  });

  test("trial save with 2 tabs on one node is limit_reached", async () => {
    const ownerId = await createFixtureUser();
    await teamService.createTeam(ownerId, { name: "Trial Canvas" });
    const nodes = [stubNode(ownerId, "n1", [{ blocks: 1 }, { blocks: 1 }])];
    await expect(assertCanSaveWorkspaceNodes(ownerId, { nodes })).rejects.toMatchObject({
      message: "This agency can have 1 tab per node on the trial. Subscribe to add more.",
    });
  });
});
