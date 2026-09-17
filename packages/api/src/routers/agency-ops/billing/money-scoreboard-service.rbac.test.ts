import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { user } from "@orch/db/schema/auth";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";
Bun.env.POLAR_PRODUCT_PRO ??= "polar-pro";

const [{ db }, teamService, billingTeam, { getPeriodScoreboard }] = await Promise.all([
  import("@orch/db"),
  import("../../team/service"),
  import("../../../billing-team"),
  import("./money-scoreboard-service"),
]);

const fixtureUsers: string[] = [];

const periodStart = "2026-01-01";
const periodEnd = "2026-01-31";

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `money-scoreboard-rbac-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Money Scoreboard RBAC User",
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

describe("money period scoreboard RBAC", () => {
  let ownerId: string;
  let editorId: string;
  let team: { id: string };

  beforeEach(async () => {
    ownerId = await createFixtureUser();
    editorId = await createFixtureUser();
    team = await teamService.createTeam(ownerId, { name: "RBAC Money Scoreboard" });
    await addPaidMember({
      ownerId,
      teamId: team.id,
      memberId: editorId,
      role: "editor",
      seats: 2,
    });
  });

  test("editor cannot load the period scoreboard", async () => {
    await expect(
      getPeriodScoreboard(editorId, {
        teamId: team.id,
        periodStart,
        periodEnd,
      }),
    ).rejects.toMatchObject({
      data: { code: "insufficient_role" },
      message: "Only the owner can change billing and invoices.",
    });
  });

  test("owner can load the period scoreboard", async () => {
    await expect(
      getPeriodScoreboard(ownerId, {
        teamId: team.id,
        periodStart,
        periodEnd,
      }),
    ).resolves.toMatchObject({ currency: expect.any(String) });
  });
});
