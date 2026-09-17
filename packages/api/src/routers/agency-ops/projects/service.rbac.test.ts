import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { user } from "@orch/db/schema/auth";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";
Bun.env.POLAR_PRODUCT_PRO ??= "polar-pro";

const [
  { db },
  teamService,
  billingTeam,
  { createAgencyClient },
  { createAgencyProject },
  { createAgencyProjectTask },
] = await Promise.all([
  import("@orch/db"),
  import("../../team/service"),
  import("../../../billing-team"),
  import("../clients/service"),
  import("./service"),
  import("../tasks/service"),
]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `projects-rbac-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Projects RBAC User",
    email: `${id}@example.test`,
    lifetimePro: false,
  });
  fixtureUsers.push(id);
  return id;
}

async function addPaidMember(args: {
  ownerId: string;
  teamId: string;
  memberId: string;
  role: "editor" | "viewer";
  seats?: number;
}) {
  await billingTeam.applyPaidPlan(args.teamId, "agency", { seats: args.seats ?? 2 });
  await teamService.addTeamMember(args.ownerId, {
    teamId: args.teamId,
    userEmail: `${args.memberId}@example.test`,
    role: args.role,
  });
}

describe("agency project RBAC", () => {
  let ownerId: string;
  let editorId: string;
  let viewerId: string;
  let team: { id: string };
  let client: { id: string };

  beforeEach(async () => {
    ownerId = await createFixtureUser();
    editorId = await createFixtureUser();
    viewerId = await createFixtureUser();
    team = await teamService.createTeam(ownerId, { name: "RBAC Projects" });
    await addPaidMember({
      ownerId,
      teamId: team.id,
      memberId: editorId,
      role: "editor",
      seats: 2,
    });
    await addPaidMember({
      ownerId,
      teamId: team.id,
      memberId: viewerId,
      role: "viewer",
      seats: 3,
    });
    client = await createAgencyClient(ownerId, { teamId: team.id, name: "Fixture Client" });
  });

  test("editor creates a project and a task", async () => {
    const homeClient = await createAgencyClient(editorId, { teamId: team.id, name: "Home" });
    const project = await createAgencyProject(editorId, {
      teamId: team.id,
      clientId: homeClient.id,
      name: "Site",
    });
    await expect(
      createAgencyProjectTask(editorId, {
        teamId: team.id,
        projectId: project.id,
        title: "Build",
      }),
    ).resolves.toMatchObject({ title: "Build" });
  });

  test("viewer cannot create a project", async () => {
    await expect(
      createAgencyProject(viewerId, {
        teamId: team.id,
        clientId: client.id,
        name: "Nope",
      }),
    ).rejects.toMatchObject({ data: { code: "insufficient_role" } });
  });
});
