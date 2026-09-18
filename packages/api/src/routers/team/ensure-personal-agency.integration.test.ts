import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [{ db }, { user, workspaceTeam }, { ensurePersonalAgency }] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema"),
  import("./ensure-personal-agency"),
]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `integration-personal-agency-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Personal Agency Integration User",
    email: `${id}@example.test`,
  });
  fixtureUsers.push(id);
  return id;
}

describe("ensurePersonalAgency", () => {
  test("creates one agency when the user has none", async () => {
    const userId = await createFixtureUser();

    const first = await ensurePersonalAgency(userId, { name: "Ada" });
    const second = await ensurePersonalAgency(userId, { name: "Ada" });

    expect(first.id).toBe(second.id);
    expect(first.name).toBe("Ada's agency");
  });

  test("serializes concurrent calls into one agency", async () => {
    const userId = await createFixtureUser();

    const [first, second] = await Promise.all([
      ensurePersonalAgency(userId, { name: "Ada" }),
      ensurePersonalAgency(userId, { name: "Ada" }),
    ]);
    const teams = await db
      .select({ id: workspaceTeam.id })
      .from(workspaceTeam)
      .where(eq(workspaceTeam.createdByUserId, userId));

    expect(first.id).toBe(second.id);
    expect(teams).toHaveLength(1);
    expect(teams[0]?.id).toBe(first.id);
  });

  test("uses Agency when the trimmed user name is empty", async () => {
    const userId = await createFixtureUser();

    expect((await ensurePersonalAgency(userId, { name: "   " })).name).toBe("Agency");
  });

  test("preserves a trimmed name that already ends with agency", async () => {
    const userId = await createFixtureUser();

    expect((await ensurePersonalAgency(userId, { name: "  Ada Agency  " })).name).toBe(
      "Ada Agency",
    );
  });
});
