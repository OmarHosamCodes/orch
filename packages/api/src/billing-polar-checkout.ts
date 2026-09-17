import { Polar } from "@polar-sh/sdk";

import { env, primaryCorsOrigin } from "@orch/env/server";

export type CreatePolarCheckoutInput = {
  productId: string;
  seats?: number;
  teamId: string;
  actorUserId: string;
};

export type PolarCheckoutView = {
  teamId: string;
  checkoutId: string;
  productId: string;
  seats: number;
  subscriptionId: string | null;
  status: string;
};

function polarClient() {
  return new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.POLAR_SERVER,
  });
}

function metadataTeamId(metadata: Record<string, string | number | boolean>): string | null {
  const raw = metadata.teamId;
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  return null;
}

export async function createPolarCheckout(
  input: CreatePolarCheckoutInput,
): Promise<{ url: string }> {
  const polar = polarClient();
  const checkout = await polar.checkouts.create({
    products: [input.productId],
    ...(input.seats != null ? { seats: input.seats } : {}),
    metadata: { teamId: input.teamId },
    customFieldData: { "team-id": input.teamId },
    externalCustomerId: input.actorUserId,
    successUrl: `${primaryCorsOrigin}/billing/success?checkout_id={CHECKOUT_ID}`,
  });

  return { url: checkout.url };
}

export async function fetchPolarCheckout(checkoutId: string): Promise<PolarCheckoutView> {
  const polar = polarClient();
  const checkout = await polar.checkouts.get({ id: checkoutId });
  const teamId = metadataTeamId(checkout.metadata);

  if (!teamId || !checkout.productId) {
    throw new Error("Polar checkout is missing team or product metadata.");
  }

  return {
    teamId,
    checkoutId: checkout.id,
    productId: checkout.productId,
    seats: Math.max(1, checkout.seats ?? 1),
    subscriptionId: checkout.subscriptionId,
    status: checkout.status,
  };
}
