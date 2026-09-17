import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { user } from "@orch/db/schema/auth";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";
Bun.env.POLAR_PRODUCT_PRO ??= "polar-pro";

const [
  { db },
  teamService,
  billingTeam,
  {
    startAgencyTimer,
    listAgencyActiveMembers,
    getAgencyTimeSummary,
  },
] = await Promise.all([
  import("@orch/db"),
  import("../../team/service"),
  import("../../../billing-team"),
  import("./service"),
]);

const fixtureUsers: string[] = [];

const summaryFrom = "2026-01-01T00:00:00.000Z";
const summaryTo = "2026-12-31T23:59:59.999Z";

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `time-rbac-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Time RBAC User",
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

describe("agency time tracking RBAC", () => {
  let ownerId: string;
  let editorId: string;
  let viewerId: string;
  let team: { id: string };

  beforeEach(async () => {
    ownerId = await createFixtureUser();
    editorId = await createFixtureUser();
    viewerId = await createFixtureUser();
    team = await teamService.createTeam(ownerId, { name: "RBAC Time" });
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

  test("viewer live timers include only themselves", async () => {
    await startAgencyTimer(ownerId, { teamId: team.id });
    await startAgencyTimer(viewerId, { teamId: team.id });
    const listed = await listAgencyActiveMembers(viewerId, { teamId: team.id });
    expect(listed.items.map((row) => row.userId)).toEqual([viewerId]);
  });

  test("editor live timers include the team", async () => {
    await startAgencyTimer(ownerId, { teamId: team.id });
    await startAgencyTimer(editorId, { teamId: team.id });
    const listed = await listAgencyActiveMembers(editorId, { teamId: team.id });
    expect(listed.items.map((row) => row.userId).sort()).toEqual([editorId, ownerId].sort());
  });

  test("viewer cannot load the team time summary", async () => {
    await expect(
      getAgencyTimeSummary(viewerId, {
        teamId: team.id,
        from: summaryFrom,
        to: summaryTo,
      }),
    ).rejects.toMatchObject({ data: { code: "insufficient_role" } });
  });
});
