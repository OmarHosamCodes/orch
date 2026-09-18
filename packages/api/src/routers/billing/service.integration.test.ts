import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";
Bun.env.POLAR_PRODUCT_PRO = "polar-pro";
Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = "polar-unlimited";
Bun.env.POLAR_PRODUCT_ORCH_CREDITS = "polar-credits";

const createPolarCheckout = mock(async () => ({ url: "https://polar.test/c" }));
const fetchPolarCheckout = mock(async (checkoutId: string) => ({
  teamId: "",
  checkoutId,
  productId: "polar-pro",
  seats: 2,
  subscriptionId: "sub_test" as string | null,
  status: "succeeded",
}));

mock.module("../../billing-polar-checkout", () => ({
  createPolarCheckout,
  fetchPolarCheckout,
}));

const [{ db }, { user, workspaceTeamBilling }, teamService, billingService, billingTeam, { env }] =
  await Promise.all([
    import("@orch/db"),
    import("@orch/db/schema"),
    import("../team/service"),
    import("./service"),
    import("../../billing-team"),
    import("@orch/env/server"),
  ]);

const polarProProductId = env.POLAR_PRODUCT_PRO.split(",")[0]!.trim();

const fixtureUsers: string[] = [];

beforeEach(() => {
  createPolarCheckout.mockClear();
  fetchPolarCheckout.mockClear();
});

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

describe("createSeatCheckout", () => {
  test("returns a Polar checkout URL for the team owner", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Seat Checkout" });

    await expect(
      billingService.createSeatCheckout(ownerId, { teamId: team.id, seats: 2 }),
    ).resolves.toEqual({ url: "https://polar.test/c" });

    expect(createPolarCheckout).toHaveBeenCalledWith({
      productId: polarProProductId,
      seats: 2,
      teamId: team.id,
      actorUserId: ownerId,
    });
  });

  test("ignores a single-seat client quantity and derives checkout seats", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Seat Checkout" });

    await expect(
      billingService.createSeatCheckout(ownerId, { teamId: team.id, seats: 1 }),
    ).resolves.toEqual({ url: "https://polar.test/c" });

    expect(createPolarCheckout).toHaveBeenCalledWith({
      productId: polarProProductId,
      seats: 2,
      teamId: team.id,
      actorUserId: ownerId,
    });
  });

  test("rejects non-owners", async () => {
    const ownerId = await createFixtureUser();
    const outsiderId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Seat Checkout" });

    await expect(
      billingService.createSeatCheckout(outsiderId, { teamId: team.id, seats: 2 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  test("derives checkout seats from billing and ignores a lower client quantity", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Seat Checkout Paid" });
    await billingTeam.applyPaidPlan(team.id, "agency", { seats: 3 });

    await expect(
      billingService.createSeatCheckout(ownerId, { teamId: team.id, seats: 2 }),
    ).resolves.toEqual({ url: "https://polar.test/c" });

    expect(createPolarCheckout).toHaveBeenCalledWith({
      productId: polarProProductId,
      seats: 4,
      teamId: team.id,
      actorUserId: ownerId,
    });
  });

  test("seat checkout for an Unlimited team uses the Unlimited product", async () => {
    const previousUnlimited = Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED;
    Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = "polar-unlimited";
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Unlimited Seats" });
    await billingTeam.applyPaidPlan(team.id, "agency_unlimited", {
      seats: 2,
      polarSubscriptionId: "sub_unl_seats",
    });

    await billingService.createSeatCheckout(ownerId, { teamId: team.id, seats: 3 });

    expect(createPolarCheckout).toHaveBeenCalledWith({
      productId: "polar-unlimited",
      seats: 3,
      teamId: team.id,
      actorUserId: ownerId,
    });
    if (previousUnlimited === undefined) {
      delete Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED;
    } else {
      Bun.env.POLAR_PRODUCT_AGENCY_UNLIMITED = previousUnlimited;
    }
  });
});

describe("createCreditCheckout", () => {
  test("returns a Polar checkout URL for Orch credits", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Credit Checkout" });

    await expect(billingService.createCreditCheckout(ownerId, { teamId: team.id })).resolves.toEqual(
      { url: "https://polar.test/c" },
    );

    expect(createPolarCheckout).toHaveBeenCalledWith({
      productId: "polar-credits",
      teamId: team.id,
      actorUserId: ownerId,
    });
  });
});

describe("confirmCheckout", () => {
  test("applies a paid subscription snapshot with seats from Polar", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Confirm Checkout" });

    fetchPolarCheckout.mockImplementation(async (checkoutId) => ({
      teamId: team.id,
      checkoutId,
      productId: polarProProductId,
      seats: 2,
      subscriptionId: "sub_confirm",
      status: "succeeded",
    }));

    const result = await billingService.confirmCheckout(ownerId, {
      teamId: team.id,
      checkoutId: "chk_confirm",
    });

    expect(result.checkoutKind).toBe("agency");
    expect(result.billing).toMatchObject({
      teamId: team.id,
      plan: "agency",
      seats: 2,
      polarSubscriptionId: "sub_confirm",
    });
  });

  test("confirmCheckout of Unlimited activates agency_unlimited", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Confirm Unlimited" });

    fetchPolarCheckout.mockImplementation(async (checkoutId) => ({
      teamId: team.id,
      checkoutId,
      productId: "polar-unlimited",
      seats: 1,
      subscriptionId: "sub_unl",
      status: "succeeded",
    }));

    const result = await billingService.confirmCheckout(ownerId, {
      teamId: team.id,
      checkoutId: "chk_unlimited",
    });

    expect(result.checkoutKind).toBe("agency");
    expect(result.billing).toMatchObject({
      teamId: team.id,
      plan: "agency_unlimited",
      seats: 1,
      polarSubscriptionId: "sub_unl",
    });
  });

  test("rejects Pro checkout when Polar omits a subscription id", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Confirm Checkout" });

    fetchPolarCheckout.mockImplementation(async (checkoutId) => ({
      teamId: team.id,
      checkoutId,
      productId: polarProProductId,
      seats: 2,
      subscriptionId: null,
      status: "succeeded",
    }));

    await expect(
      billingService.confirmCheckout(ownerId, {
        teamId: team.id,
        checkoutId: "chk_no_sub",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("applies Orch credits for the configured credit product", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Confirm Credits" });

    fetchPolarCheckout.mockImplementation(async (checkoutId) => ({
      teamId: team.id,
      checkoutId,
      productId: "polar-credits",
      seats: 1,
      subscriptionId: null,
      status: "succeeded",
    }));

    const result = await billingService.confirmCheckout(ownerId, {
      teamId: team.id,
      checkoutId: "chk_credits",
    });

    expect(result.checkoutKind).toBe("credits");
    expect(result.billing.orchCreditsRemaining).toBe(100);
  });

  test("replay credit confirm is idempotent after credits are spent", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Replay Credits" });

    fetchPolarCheckout.mockImplementation(async (checkoutId) => ({
      teamId: team.id,
      checkoutId,
      productId: "polar-credits",
      seats: 1,
      subscriptionId: null,
      status: "succeeded",
    }));

    const checkoutId = "chk_credits_replay";
    const first = await billingService.confirmCheckout(ownerId, {
      teamId: team.id,
      checkoutId,
    });
    expect(first.checkoutKind).toBe("credits");
    expect(first.billing.orchCreditsRemaining).toBe(100);

    await db
      .update(workspaceTeamBilling)
      .set({ orchCreditsRemaining: 0 })
      .where(eq(workspaceTeamBilling.teamId, team.id));

    const replay = await billingService.confirmCheckout(ownerId, {
      teamId: team.id,
      checkoutId,
    });
    expect(replay.checkoutKind).toBe("credits");
    expect(replay.billing.orchCreditsRemaining).toBe(0);
  });

  test("classifies credit checkout as credits on an already paid Agency team", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Agency Credits" });
    await billingTeam.applyPaidPlan(team.id, "agency", { seats: 2 });

    fetchPolarCheckout.mockImplementation(async (checkoutId) => ({
      teamId: team.id,
      checkoutId,
      productId: "polar-credits",
      seats: 1,
      subscriptionId: null,
      status: "succeeded",
    }));

    const result = await billingService.confirmCheckout(ownerId, {
      teamId: team.id,
      checkoutId: "chk_credits_agency",
    });

    expect(result.checkoutKind).toBe("credits");
    expect(result.billing.plan).toBe("agency");
    expect(result.billing.orchCreditsRemaining).toBe(100);
  });

  test("rejects checkout for an unknown Polar product", async () => {
    const ownerId = await createFixtureUser();
    const team = await teamService.createTeam(ownerId, { name: "Unknown Product" });

    fetchPolarCheckout.mockImplementation(async (checkoutId) => ({
      teamId: team.id,
      checkoutId,
      productId: "polar-unknown",
      seats: 1,
      subscriptionId: "sub_unknown",
      status: "succeeded",
    }));

    await expect(
      billingService.confirmCheckout(ownerId, {
        teamId: team.id,
        checkoutId: "chk_unknown",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
