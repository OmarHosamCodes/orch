import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [{ db }, { user }, teamService, { applyPaidPlan }, { requireTeamMembership }] =
  await Promise.all([
    import("@orch/db"),
    import("@orch/db/schema/auth"),
    import("../routers/team/service"),
    import("../billing-team"),
    import("./team-membership"),
  ]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser(input: { lifetimePro?: boolean } = {}) {
  const id = `integration-billing-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Billing Integration User",
    email: `${id}@example.test`,
    lifetimePro: input.lifetimePro ?? false,
  });
  fixtureUsers.push(id);
  return id;
}

describe("requireTeamMembership", () => {
  test("a viewer cannot satisfy editor and gets insufficient_role", async () => {
    const ownerId = await createFixtureUser();
    const editorId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Roles" });
    await applyPaidPlan(team.id, "agency", { seats: 2 });
    await teamService.addAcceptedTeamMember(ownerId, {
      teamId: team.id,
      userEmail: `${editorId}@example.test`,
      role: "viewer",
    });
    await expect(requireTeamMembership(editorId, team.id, "editor")).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You need editor access for this action.",
      data: { code: "insufficient_role" },
    });
  });

  test("a non-member is still UNAUTHORIZED", async () => {
    const ownerId = await createFixtureUser();
    const strangerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Roles" });
    await expect(requireTeamMembership(strangerId, team.id, "viewer")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  test("an editor cannot satisfy owner and gets insufficient_role with owner message", async () => {
    const ownerId = await createFixtureUser();
    const editorId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Roles" });
    await applyPaidPlan(team.id, "agency", { seats: 2 });
    await teamService.addAcceptedTeamMember(ownerId, {
      teamId: team.id,
      userEmail: `${editorId}@example.test`,
      role: "editor",
    });
    await expect(requireTeamMembership(editorId, team.id, "owner")).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only the owner can change billing and invoices.",
      data: { code: "insufficient_role" },
    });
  });
});
