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
] = await Promise.all([
  import("@orch/db"),
  import("../../team/service"),
  import("../../../billing-team"),
  import("./service"),
]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `clients-rbac-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Clients RBAC User",
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

describe("agency client RBAC", () => {
  let ownerId: string;
  let editorId: string;
  let viewerId: string;
  let team: { id: string };

  beforeEach(async () => {
    ownerId = await createFixtureUser();
    editorId = await createFixtureUser();
    viewerId = await createFixtureUser();
    team = await teamService.createTeam(ownerId, { name: "RBAC Clients" });
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
  });

  test("editor creates a client record without a rate", async () => {
    await expect(
      createAgencyClient(editorId, { teamId: team.id, name: "Acme" }),
    ).resolves.toMatchObject({ name: "Acme" });
  });

  test("editor setting a rate is insufficient_role", async () => {
    await expect(
      createAgencyClient(editorId, {
        teamId: team.id,
        name: "Priced",
        billableRateAmount: 10000,
      }),
    ).rejects.toMatchObject({
      data: { code: "insufficient_role" },
      message: "Only the owner can change billing and invoices.",
    });
  });

  test("viewer cannot create a client", async () => {
    await expect(
      createAgencyClient(viewerId, { teamId: team.id, name: "Nope" }),
    ).rejects.toMatchObject({ data: { code: "insufficient_role" } });
  });
});
