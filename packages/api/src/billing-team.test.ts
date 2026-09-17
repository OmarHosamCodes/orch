import { afterEach, describe, expect, test } from "bun:test";
import { and, count, eq, isNull } from "drizzle-orm";
import {
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsProjectTask,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [
  { db },
  { workspaceTeam, workspaceTeamBilling, workspaceTeamMember },
  { user },
  teamService,
  ensurePersonalAgencyModule,
  billingTeam,
  clientsService,
  projectsService,
] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema"),
  import("@orch/db/schema/auth"),
  import("./routers/team/service"),
  import("./routers/team/ensure-personal-agency"),
  import("./billing-team"),
  import("./routers/agency-ops/clients/service"),
  import("./routers/agency-ops/projects/service"),
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

async function seedClients(teamId: string, ownerId: string, n: number) {
  const now = new Date("2026-09-17T00:00:00.000Z");
  if (n === 0) return;
  await db.insert(agencyOpsClient).values(
    Array.from({ length: n }, (_, i) => ({
      id: createWorkspaceId("agency-client"),
      teamId,
      name: `Seed ${i}`,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

describe("assertWithinLimit", () => {
  test("the 11th trial client is limit_reached with locked copy", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    await seedClients(team.id, ownerId, 10);
    await expect(billingTeam.assertWithinLimit(team.id, "clients")).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This agency can have 10 clients on the trial. Subscribe to add more.",
      data: { code: "limit_reached" },
    });
  });

  test("the 10th trial client is allowed", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    await seedClients(team.id, ownerId, 9);
    await expect(billingTeam.assertWithinLimit(team.id, "clients")).resolves.toBeUndefined();
  });

  test("concurrent client creates cannot exceed the trial cap", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    await seedClients(team.id, ownerId, 9);
    const now = new Date("2026-09-17T00:00:00.000Z");

    const results = await Promise.allSettled([
      db.transaction(async (tx) => {
        await billingTeam.assertWithinLimit(team.id, "clients", { tx });
        await tx.insert(agencyOpsClient).values({
          id: createWorkspaceId("agency-client"),
          teamId: team.id,
          name: "Concurrent A",
          createdByUserId: ownerId,
          createdAt: now,
          updatedAt: now,
        });
      }),
      db.transaction(async (tx) => {
        await billingTeam.assertWithinLimit(team.id, "clients", { tx });
        await tx.insert(agencyOpsClient).values({
          id: createWorkspaceId("agency-client"),
          teamId: team.id,
          name: "Concurrent B",
          createdByUserId: ownerId,
          createdAt: now,
          updatedAt: now,
        });
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { data: { code: "limit_reached" } },
    });

    const [countRow] = await db
      .select({ value: count() })
      .from(agencyOpsClient)
      .where(and(eq(agencyOpsClient.teamId, team.id), isNull(agencyOpsClient.archivedAt)));
    expect(countRow?.value).toBe(10);
  });

  test("archived clients do not consume the cap", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    await seedClients(team.id, ownerId, 10);
    await db
      .update(agencyOpsClient)
      .set({ archivedAt: new Date("2026-09-17T00:00:00.000Z") })
      .where(eq(agencyOpsClient.teamId, team.id));
    await expect(billingTeam.assertWithinLimit(team.id, "clients")).resolves.toBeUndefined();
  });

  test("Agency fails the 101st client; Unlimited does not", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Paid Agency" });
    await billingTeam.applyPaidPlan(team.id, "agency", { seats: 1 });
    await seedClients(team.id, ownerId, 100);
    await expect(billingTeam.assertWithinLimit(team.id, "clients")).rejects.toMatchObject({
      data: { code: "limit_reached" },
      message: "This agency can have 100 clients on Agency. Subscribe to add more.",
    });
    await billingTeam.applyPaidPlan(team.id, "agency_unlimited", { seats: 1 });
    await expect(billingTeam.assertWithinLimit(team.id, "clients")).resolves.toBeUndefined();
  });

  test("the 31st trial project is limit_reached", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    const now = new Date("2026-09-17T00:00:00.000Z");
    const [client] = await db
      .insert(agencyOpsClient)
      .values({
        id: createWorkspaceId("agency-client"),
        teamId: team.id,
        name: "Client",
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsClient.id });
    await db.insert(agencyOpsProject).values(
      Array.from({ length: 30 }, (_, i) => ({
        id: createWorkspaceId("agency-project"),
        teamId: team.id,
        clientId: client!.id,
        name: `P${i}`,
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })),
    );
    await expect(billingTeam.assertWithinLimit(team.id, "projects")).rejects.toMatchObject({
      message: "This agency can have 30 projects on the trial. Subscribe to add more.",
      data: { code: "limit_reached" },
    });
  });

  test("soft-deleted projects do not consume the cap", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    const now = new Date("2026-09-17T00:00:00.000Z");
    const [client] = await db
      .insert(agencyOpsClient)
      .values({
        id: createWorkspaceId("agency-client"),
        teamId: team.id,
        name: "Client",
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsClient.id });
    await db.insert(agencyOpsProject).values(
      Array.from({ length: 30 }, (_, i) => ({
        id: createWorkspaceId("agency-project"),
        teamId: team.id,
        clientId: client!.id,
        name: `P${i}`,
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
        deletedAt: now,
      })),
    );
    await expect(billingTeam.assertWithinLimit(team.id, "projects")).resolves.toBeUndefined();
  });

  test("the 3rd trial task on a project is limit_reached", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    const now = new Date("2026-09-17T00:00:00.000Z");
    const [client] = await db
      .insert(agencyOpsClient)
      .values({
        id: createWorkspaceId("agency-client"),
        teamId: team.id,
        name: "Client",
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsClient.id });
    const [project] = await db
      .insert(agencyOpsProject)
      .values({
        id: createWorkspaceId("agency-project"),
        teamId: team.id,
        clientId: client!.id,
        name: "P",
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsProject.id });
    await db.insert(agencyOpsProjectTask).values(
      Array.from({ length: 2 }, (_, i) => ({
        id: createWorkspaceId("agency-project-task"),
        teamId: team.id,
        projectId: project!.id,
        title: `T${i}`,
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })),
    );
    await expect(
      billingTeam.assertWithinLimit(team.id, "tasksPerProject", { projectId: project!.id }),
    ).rejects.toMatchObject({
      message: "This agency can have 2 tasks per project on the trial. Subscribe to add more.",
      data: { code: "limit_reached" },
    });
  });

  test("journey adding 3 tasks on an empty trial project is limit_reached", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    const projectId = createWorkspaceId("agency-project");
    await expect(
      billingTeam.assertWithinLimit(team.id, "tasksPerProject", { projectId, adding: 3 }),
    ).rejects.toMatchObject({
      data: { code: "limit_reached" },
    });
    await expect(
      billingTeam.assertWithinLimit(team.id, "tasksPerProject", { projectId, adding: 2 }),
    ).resolves.toBeUndefined();
  });

  test("leftover canvas 4 nodes is limit_reached; 3 nodes is allowed", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Leftover Agency" });
    const after = new Date("2026-12-01T00:00:00.000Z");
    await db
      .update(workspaceTeamBilling)
      .set({ trialEndsAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(workspaceTeamBilling.teamId, team.id));
    await expect(
      billingTeam.assertWithinLimit(team.id, "nodes", { count: 4, now: after }),
    ).rejects.toMatchObject({
      message: "This agency can have 3 workspace nodes on leftover. Subscribe to add more.",
      data: { code: "limit_reached" },
    });
    await expect(
      billingTeam.assertWithinLimit(team.id, "nodes", { count: 3, now: after }),
    ).resolves.toBeUndefined();
  });

  test("leftover 3 blocks per tab is limit_reached", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Leftover Agency" });
    const after = new Date("2026-12-01T00:00:00.000Z");
    await db
      .update(workspaceTeamBilling)
      .set({ trialEndsAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(workspaceTeamBilling.teamId, team.id));
    await expect(
      billingTeam.assertWithinLimit(team.id, "blocks", { count: 3, now: after }),
    ).rejects.toMatchObject({
      message: "This agency can have 2 blocks per tab on leftover. Subscribe to add more.",
      data: { code: "limit_reached" },
    });
  });

  test("trial uploads are blocked; paid Agency uploads are allowed", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Upload Agency" });
    await expect(billingTeam.assertTaskAndKnowledgeUploadsAllowed(team.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "File uploads are included with Agency. Subscribe to attach files.",
      data: { code: "upload_blocked" },
    });
    await billingTeam.applyPaidPlan(team.id, "agency", { seats: 1 });
    await expect(billingTeam.assertTaskAndKnowledgeUploadsAllowed(team.id)).resolves.toBeUndefined();
  });
});

async function seedLiveProjects(
  teamId: string,
  ownerId: string,
  clientId: string,
  n: number,
) {
  const now = new Date("2026-09-17T00:00:00.000Z");
  if (n === 0) return;
  await db.insert(agencyOpsProject).values(
    Array.from({ length: n }, (_, i) => ({
      id: createWorkspaceId("agency-project"),
      teamId,
      clientId,
      name: `Seed P${i}`,
      createdByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

describe("create service volume caps", () => {
  test("createAgencyClient rejects the 11th trial client and does not insert it", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    await seedClients(team.id, ownerId, 10);
    await expect(
      clientsService.createAgencyClient(ownerId, { teamId: team.id, name: "Overflow" }),
    ).rejects.toMatchObject({ data: { code: "limit_reached" } });
    const rows = await db.select().from(agencyOpsClient).where(eq(agencyOpsClient.teamId, team.id));
    expect(rows).toHaveLength(10);
    expect(rows.some((row) => row.name === "Overflow")).toBe(false);
  });

  test("createAgencyProject rejects the 31st trial project and does not insert it", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    const now = new Date("2026-09-17T00:00:00.000Z");
    const [client] = await db
      .insert(agencyOpsClient)
      .values({
        id: createWorkspaceId("agency-client"),
        teamId: team.id,
        name: "Client",
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsClient.id });
    await seedLiveProjects(team.id, ownerId, client!.id, 30);
    await expect(
      projectsService.createAgencyProject(ownerId, {
        teamId: team.id,
        clientId: client!.id,
        name: "Overflow",
      }),
    ).rejects.toMatchObject({ data: { code: "limit_reached" } });
    const rows = await db
      .select()
      .from(agencyOpsProject)
      .where(and(eq(agencyOpsProject.teamId, team.id), isNull(agencyOpsProject.deletedAt)));
    expect(rows).toHaveLength(30);
    expect(rows.some((row) => row.name === "Overflow")).toBe(false);
  });

  test("createAgencyProjectWithJourney with 2 milestones on trial is limit_reached with zero projects for that name", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Cap Agency" });
    const now = new Date("2026-09-17T00:00:00.000Z");
    const [client] = await db
      .insert(agencyOpsClient)
      .values({
        id: createWorkspaceId("agency-client"),
        teamId: team.id,
        name: "Client",
        createdByUserId: ownerId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: agencyOpsClient.id });
    const journeyName = "Journey Overflow";
    await expect(
      projectsService.createAgencyProjectWithJourney(ownerId, {
        teamId: team.id,
        clientId: client!.id,
        name: journeyName,
        milestones: [
          { title: "M1", assigneeUserIds: [] },
          { title: "M2", assigneeUserIds: [] },
        ],
      }),
    ).rejects.toMatchObject({ data: { code: "limit_reached" } });
    const rows = await db
      .select()
      .from(agencyOpsProject)
      .where(
        and(eq(agencyOpsProject.teamId, team.id), eq(agencyOpsProject.name, journeyName)),
      );
    expect(rows).toHaveLength(0);
  });
});
