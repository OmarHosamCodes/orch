import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [{ db }, { user }, service, billingTeam] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema/auth"),
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
  const id = `integration-team-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Team Integration User",
    email: `${id}@example.test`,
  });
  fixtureUsers.push(id);
  return id;
}

function getFixtureUserEmail(userId: string) {
  return `${userId}@example.test`;
}

describe("team service persistence", () => {
  test("rejects creating a second Agency for an account", async () => {
    const userId = await createFixtureUser();

    await service.createTeam(userId, { name: "First Agency" });

    await expect(service.createTeam(userId, { name: "Second Agency" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This account already has an Agency.",
    });
  });

  test("creates, reads, updates, lists, and deletes a team", async () => {
    const userId = await createFixtureUser();
    const created = await service.createTeam(userId, { name: "  Integration Team  " });

    expect(created.role).toBe("owner");
    expect((await service.listUserTeams(userId, {})).map((team) => team.id)).toContain(created.id);
    expect((await service.getTeam(userId, { teamId: created.id })).members[0]?.userId).toBe(userId);

    const updated = await service.updateTeam(userId, {
      teamId: created.id,
      name: "Updated Integration Team",
    });
    expect(updated.name).toBe("Updated Integration Team");

    expect(await service.deleteTeam(userId, { teamId: created.id })).toEqual({
      teamId: created.id,
      deleted: true,
    });
    expect((await service.listUserTeams(userId, {})).some((team) => team.id === created.id)).toBe(
      false,
    );
  });

  test("rejects a non-member reading or mutating another user's team", async () => {
    const ownerUserId = await createFixtureUser();
    const outsiderUserId = await createFixtureUser();
    const created = await service.createTeam(ownerUserId, { name: "Owner Team" });

    expect(
      (await service.listUserTeams(outsiderUserId, {})).some((team) => team.id === created.id),
    ).toBe(false);

    await expect(service.getTeam(outsiderUserId, { teamId: created.id })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      service.listTeamMembers(outsiderUserId, { teamId: created.id }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      service.updateTeam(outsiderUserId, {
        teamId: created.id,
        name: "Outsider Rename",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(service.deleteTeam(outsiderUserId, { teamId: created.id })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    expect((await service.getTeam(ownerUserId, { teamId: created.id })).name).toBe("Owner Team");
  });

  test("requires target-team ownership for every membership mutation", async () => {
    const ownerUserId = await createFixtureUser();
    const viewerUserId = await createFixtureUser();
    const editorUserId = await createFixtureUser();
    const otherTeamOwnerUserId = await createFixtureUser();
    const existingMemberUserId = await createFixtureUser();
    const inviteeUserId = await createFixtureUser();
    const targetTeam = await service.createTeam(ownerUserId, { name: "Target Team" });
    const otherTeam = await service.createTeam(otherTeamOwnerUserId, {
      name: "Attacker-owned Team",
    });
    await billingTeam.applyPaidPlan(targetTeam.id, "agency", { seats: 4 });

    await service.addTeamMember(ownerUserId, {
      teamId: targetTeam.id,
      userEmail: getFixtureUserEmail(viewerUserId),
      role: "viewer",
    });
    await service.addTeamMember(ownerUserId, {
      teamId: targetTeam.id,
      userEmail: getFixtureUserEmail(editorUserId),
      role: "editor",
    });
    await service.addTeamMember(ownerUserId, {
      teamId: targetTeam.id,
      userEmail: getFixtureUserEmail(existingMemberUserId),
      role: "viewer",
    });

    for (const actorUserId of [viewerUserId, editorUserId, otherTeamOwnerUserId]) {
      await expect(
        service.addTeamMember(actorUserId, {
          teamId: targetTeam.id,
          userEmail: getFixtureUserEmail(inviteeUserId),
          role: "viewer",
        }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      await expect(
        service.updateTeamMemberRole(actorUserId, {
          teamId: targetTeam.id,
          userId: existingMemberUserId,
          role: "editor",
        }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      await expect(
        service.removeTeamMember(actorUserId, {
          teamId: targetTeam.id,
          userId: existingMemberUserId,
        }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }

    const members = await service.listTeamMembers(ownerUserId, { teamId: targetTeam.id });
    expect(members.find((member) => member.userId === existingMemberUserId)?.role).toBe("viewer");
    expect(members.some((member) => member.userId === inviteeUserId)).toBe(false);

    const otherTeamOwnerTeams = await service.listUserTeams(otherTeamOwnerUserId, {});
    expect(
      otherTeamOwnerTeams.some((team) => team.id === otherTeam.id && team.role === "owner"),
    ).toBe(true);
    expect(otherTeamOwnerTeams.some((team) => team.id === targetTeam.id)).toBe(false);
  });
});
