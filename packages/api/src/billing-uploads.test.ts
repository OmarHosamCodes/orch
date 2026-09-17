import { afterEach, describe, expect, test } from "bun:test";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [{ db }, { user }, teamService, billingUploads] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema/auth"),
  import("./routers/team/service"),
  import("./billing-uploads"),
]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `upload-guard-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Upload Guard User",
    email: `${id}@example.test`,
    lifetimePro: false,
  });
  fixtureUsers.push(id);
  return id;
}

describe("mapUploadBlockedOrpcError", () => {
  test("maps upload_blocked FORBIDDEN to 403 JSON", () => {
    const error = new ORPCError("FORBIDDEN", {
      message: "File uploads are included with Agency. Subscribe to attach files.",
      data: { code: "upload_blocked" },
    });
    expect(billingUploads.mapUploadBlockedOrpcError(error)).toEqual({
      status: 403,
      body: {
        error: "File uploads are included with Agency. Subscribe to attach files.",
        code: "upload_blocked",
      },
    });
  });

  test("returns null for other ORPC errors", () => {
    expect(
      billingUploads.mapUploadBlockedOrpcError(
        new ORPCError("FORBIDDEN", { message: "nope", data: { code: "limit_reached" } }),
      ),
    ).toBeNull();
    expect(billingUploads.mapUploadBlockedOrpcError(new Error("boom"))).toBeNull();
  });
});

describe("rejectIfUploadsBlocked", () => {
  test("blocks a trial team with upload_blocked shape", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Trial Uploads" });

    const result = await billingUploads.rejectIfUploadsBlocked(team.id);
    expect(result).toEqual({
      ok: false,
      response: {
        status: 403,
        body: {
          error: "File uploads are included with Agency. Subscribe to attach files.",
          code: "upload_blocked",
        },
      },
    });
  });
});
