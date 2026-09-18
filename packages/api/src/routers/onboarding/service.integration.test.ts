import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [
  { db },
  { user, workspaceTeam },
  { getFirstRun, markFirstRunComplete, createFirstAgency },
  { ensurePersonalAgency },
] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema"),
  import("./service"),
  import("../team/ensure-personal-agency"),
]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser(name = "Ada") {
  const id = `integration-first-run-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name,
    email: `${id}@example.test`,
  });
  fixtureUsers.push(id);
  return id;
}

describe("first-run onboarding service", () => {
  test("new accounts start in create with a default agency name", async () => {
    const userId = await createFixtureUser("Ada");
    const session = await getFirstRun(userId, {});

    expect(session.status).toBe("create");
    expect(session.membershipCount).toBe(0);
    expect(session.joinTeam).toBeNull();
    expect(session.defaultAgencyName).toBe("Ada's agency");
    expect(session.completedAt).toBeNull();
  });

  test("createFirstAgency inserts the trial team and completes first-run", async () => {
    const userId = await createFixtureUser("Ada");
    const { team, firstRun } = await createFirstAgency(userId, { name: "Northwind" });

    expect(team.name).toBe("Northwind");
    expect(firstRun.status).toBe("done");
    expect(firstRun.membershipCount).toBe(1);
    expect(firstRun.joinTeam?.id).toBe(team.id);

    const [row] = await db
      .select({ id: workspaceTeam.id })
      .from(workspaceTeam)
      .where(eq(workspaceTeam.createdByUserId, userId));
    expect(row?.id).toBe(team.id);
  });

  test("members who have not finished first-run join instead of creating", async () => {
    const userId = await createFixtureUser("Ada");
    await ensurePersonalAgency(userId, { name: "Ada" });
    const session = await getFirstRun(userId, {});

    expect(session.status).toBe("join");
    expect(session.membershipCount).toBe(1);
    expect(session.joinTeam?.name).toBe("Ada's agency");
  });

  test("skip complete with no team leaves leftover canvas eligible", async () => {
    const userId = await createFixtureUser();
    const firstRun = await markFirstRunComplete(userId, {});

    expect(firstRun.status).toBe("done");
    expect(firstRun.membershipCount).toBe(0);
  });

  test("complete is idempotent", async () => {
    const userId = await createFixtureUser();
    const first = await markFirstRunComplete(userId, {});
    const second = await markFirstRunComplete(userId, {});

    expect(first.completedAt).toBeTruthy();
    expect(second.completedAt).toBe(first.completedAt);
  });
});
