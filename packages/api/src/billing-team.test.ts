import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [
  { db },
  { workspaceTeamBilling },
  { user },
  teamService,
  ensurePersonalAgencyModule,
  billingTeam,
  clientsService,
] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema"),
  import("@orch/db/schema/auth"),
  import("./routers/team/service"),
  import("./routers/team/ensure-personal-agency"),
  import("./billing-team"),
  import("./routers/agency-ops/clients/service"),
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

describe("team billing snapshot", () => {
  test("Lifetime Pro maps the owned personal Agency to Unlimited after the trial clock", async () => {
    const ownerId = await createFixtureUser({ lifetimePro: true });
    const memberId = await createFixtureUser();
    const team = await ensurePersonalAgencyModule.ensurePersonalAgency(ownerId, {
      name: "Lifetime Pro",
    });

    // Seat enforcement is Slice 3: a second member remains allowed in this slice.
    await teamService.addTeamMember(ownerId, {
      teamId: team.id,
      userEmail: `${memberId}@example.test`,
      role: "viewer",
    });

    const initial = await billingTeam.getTeamBilling(team.id, new Date("2026-09-17T00:00:00.000Z"));
    expect(initial).toMatchObject({
      plan: "agency_unlimited",
      seats: 1,
      limits: { orchMessagesIncluded: 200 },
    });

    const afterTrial = new Date(new Date(initial.trialEndsAt).getTime() + 1000);
    await expect(billingTeam.assertAgencyEntitled(team.id, afterTrial)).resolves.toMatchObject({
      plan: "agency_unlimited",
      seats: 1,
    });
  });

  test("a non-Lifetime Pro personal Agency becomes leftover after the trial clock", async () => {
    const ownerId = await createFixtureUser();
    const team = await ensurePersonalAgencyModule.ensurePersonalAgency(ownerId, {
      name: "Regular",
    });
    const initial = await billingTeam.getTeamBilling(team.id, new Date("2026-09-17T00:00:00.000Z"));
    const afterTrial = new Date(new Date(initial.trialEndsAt).getTime() + 1000);

    await expect(billingTeam.getTeamBilling(team.id, afterTrial)).resolves.toMatchObject({
      plan: "leftover",
    });
  });

  test("createTeam starts a trial that enables Agency", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Trial Agency" });
    const now = new Date("2026-09-17T00:00:00.000Z");
    const snapshot = await billingTeam.getTeamBilling(team.id, now);
    expect(snapshot.plan).toBe("trial");
    expect(snapshot.seats).toBe(1);
    await expect(billingTeam.assertAgencyEntitled(team.id, now)).resolves.toMatchObject({
      plan: "trial",
    });
  });

  test("after trial ends Agency is forbidden with trial_ended", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Expired Agency" });
    const snapshot = await billingTeam.getTeamBilling(
      team.id,
      new Date("2026-09-17T00:00:00.000Z"),
    );
    const after = new Date(new Date(snapshot.trialEndsAt).getTime() + 1000);
    await expect(billingTeam.assertAgencyEntitled(team.id, after)).rejects.toMatchObject({
      code: "FORBIDDEN",
      data: { code: "trial_ended" },
    });
  });

  test("a member inherits the team snapshot without lifetimePro", async () => {
    const ownerId = await createFixtureUser();
    const memberId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Shared Agency" });
    await teamService.addTeamMember(ownerId, {
      teamId: team.id,
      userEmail: `${memberId}@example.test`,
      role: "viewer",
    });
    await billingTeam.applyPaidPlan(team.id, "agency", { seats: 1 });
    const now = new Date("2026-12-01T00:00:00.000Z");
    await expect(billingTeam.assertAgencyEntitled(team.id, now)).resolves.toMatchObject({
      plan: "agency",
    });
    expect((await db.select().from(user).where(eq(user.id, memberId)))[0]?.lifetimePro).toBe(false);
  });

  test("a trial team member can read Agency clients until the trial ends", async () => {
    const ownerId = await createFixtureUser();
    const memberId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Member Trial Agency" });
    await teamService.addTeamMember(ownerId, {
      teamId: team.id,
      userEmail: `${memberId}@example.test`,
      role: "viewer",
    });

    await expect(
      clientsService.listAgencyClients(memberId, { teamId: team.id }),
    ).resolves.toMatchObject({
      items: [],
    });

    await db
      .update(workspaceTeamBilling)
      .set({ trialEndsAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(workspaceTeamBilling.teamId, team.id));

    await expect(
      clientsService.listAgencyClients(memberId, { teamId: team.id }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      data: { code: "trial_ended" },
    });
  });
});
