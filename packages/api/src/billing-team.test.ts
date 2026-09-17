import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [
  { db },
  { workspaceTeam, workspaceTeamBilling, workspaceTeamMember },
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

async function createUnbilledTeam(ownerId: string) {
  const now = new Date();
  const teamId = `team-unbilled-${crypto.randomUUID()}`;
  await db.insert(workspaceTeam).values({
    id: teamId,
    name: "Pre-billing Agency",
    createdByUserId: ownerId,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(workspaceTeamMember).values({
    id: `team-member-unbilled-${crypto.randomUUID()}`,
    teamId,
    userId: ownerId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });
  return teamId;
}

describe("team billing snapshot", () => {
  test("prioritizes the lifetime overlay above stored and leftover snapshots", () => {
    expect(
      billingTeam.resolveTeamBillingPlanOverlay({
        snapshotPlan: "agency",
        lifetimePro: true,
        ownerTier: "free",
      }),
    ).toBe("agency_unlimited");
    expect(
      billingTeam.resolveTeamBillingPlanOverlay({
        snapshotPlan: "leftover",
        lifetimePro: true,
        ownerTier: "pro",
      }),
    ).toBe("agency_unlimited");
    expect(
      billingTeam.resolveTeamBillingPlanOverlay({
        snapshotPlan: "leftover",
        lifetimePro: false,
        ownerTier: "pro",
      }),
    ).toBe("agency");
    expect(
      billingTeam.resolveTeamBillingPlanOverlay({
        snapshotPlan: "leftover",
        lifetimePro: false,
        ownerTier: "free",
      }),
    ).toBe("leftover");
  });

  test("maps a stored Agency plan owned by Lifetime Pro to Unlimited with one seat", async () => {
    const ownerId = await createFixtureUser({ lifetimePro: true });
    const teamId = await createUnbilledTeam(ownerId);
    await billingTeam.insertTrialBilling(db, teamId, new Date("2026-09-17T00:00:00.000Z"));
    await billingTeam.applyPaidPlan(teamId, "agency", { seats: 9 });

    await expect(
      billingTeam.getTeamBilling(teamId, new Date("2026-09-17T00:00:00.000Z")),
    ).resolves.toMatchObject({
      plan: "agency_unlimited",
      seats: 1,
    });
  });

  test("repairs an unbilled Lifetime Pro Agency as Unlimited", async () => {
    const ownerId = await createFixtureUser({ lifetimePro: true });
    const teamId = await createUnbilledTeam(ownerId);

    await expect(
      billingTeam.getTeamBilling(teamId, new Date("2026-09-17T00:00:00.000Z")),
    ).resolves.toMatchObject({
      plan: "agency_unlimited",
      seats: 1,
    });
  });

  test("repairs an unbilled regular Agency with a trial", async () => {
    const ownerId = await createFixtureUser();
    const teamId = await createUnbilledTeam(ownerId);

    await expect(
      billingTeam.getTeamBilling(teamId, new Date("2026-09-17T00:00:00.000Z")),
    ).resolves.toMatchObject({
      plan: "trial",
    });
    expect(
      await db
        .select()
        .from(workspaceTeamBilling)
        .where(eq(workspaceTeamBilling.teamId, teamId))
        .limit(1),
    ).toHaveLength(1);
  });

  test("concurrent repairs of an unbilled Agency both resolve", async () => {
    const ownerId = await createFixtureUser();
    const teamId = await createUnbilledTeam(ownerId);
    const now = new Date("2026-09-17T00:00:00.000Z");

    await expect(
      Promise.all([
        billingTeam.getTeamBilling(teamId, now),
        billingTeam.getTeamBilling(teamId, now),
      ]),
    ).resolves.toEqual([
      expect.objectContaining({ plan: "trial" }),
      expect.objectContaining({ plan: "trial" }),
    ]);
    expect(
      await db
        .select()
        .from(workspaceTeamBilling)
        .where(eq(workspaceTeamBilling.teamId, teamId))
        .limit(1),
    ).toHaveLength(1);
  });

  test("inserting trial billing for an already-billed Agency is a no-op", async () => {
    const ownerId = await createFixtureUser();
    const teamId = await createUnbilledTeam(ownerId);
    const now = new Date("2026-09-17T00:00:00.000Z");

    await billingTeam.insertTrialBilling(db, teamId, now);
    await expect(billingTeam.insertTrialBilling(db, teamId, now)).resolves.toBeUndefined();
  });

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

  test("a sequential second createTeam call is forbidden", async () => {
    const ownerId = await createFixtureUser();
    await teamService.createTeam(ownerId, { name: "First Agency" });

    await expect(teamService.createTeam(ownerId, { name: "Second Agency" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This account already has an Agency.",
    });
  });

  test("concurrent createTeam calls leave the account with one Agency", async () => {
    const ownerId = await createFixtureUser();
    const results = await Promise.allSettled([
      teamService.createTeam(ownerId, { name: "Concurrent Agency A" }),
      teamService.createTeam(ownerId, { name: "Concurrent Agency B" }),
    ]);
    const teams = await db
      .select({ id: workspaceTeam.id })
      .from(workspaceTeam)
      .where(eq(workspaceTeam.createdByUserId, ownerId));

    expect(teams).toHaveLength(1);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "FORBIDDEN" },
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
