import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [{ db }, { user }, teamService, billingService] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema/auth"),
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
  const id = `billing-state-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Billing State User",
    email: `${id}@example.test`,
  });
  fixtureUsers.push(id);
  return id;
}

describe("getSubscriptionBillingState", () => {
  test("returns the new team's trial billing snapshot", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Trial Agency" });

    await expect(
      billingService.getSubscriptionBillingState(ownerId, { teamId: team.id }),
    ).resolves.toMatchObject({
      plan: "trial",
      agencyEnabled: true,
      seats: 1,
      limits: {
        agencyOps: true,
        aiConversations: 5,
        teamMembers: 1,
      },
      subscription: null,
    });
  });

  test("rejects an outsider", async () => {
    const ownerId = await createFixtureUser();
    const outsiderId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Private Agency" });

    await expect(
      billingService.getSubscriptionBillingState(outsiderId, { teamId: team.id }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
