import { db } from "@orch/db";
import * as schema from "@orch/db/schema/auth";
import { corsOrigins, env, primaryCorsOrigin } from "@orch/env/server";
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { AUTH_IP_ADDRESS_HEADERS, AUTH_TRUSTED_PROXY_CIDRS } from "./trusted-proxies";
import { rememberedAccount } from "./remembered-account";
import type { WebhookOrderPaidPayload } from "@polar-sh/sdk/models/components/webhookorderpaidpayload";
import type { WebhookSubscriptionActivePayload } from "@polar-sh/sdk/models/components/webhooksubscriptionactivepayload";

import {
  createPolarBillingAfterHandler,
  type PolarOrderPaidView,
  type PolarSubscriptionActiveView,
} from "./polar-billing-after";
import { createUserCreateAfterHandler } from "./user-create-after";

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

const loginErrorUrl = new URL("/login", primaryCorsOrigin).toString();
const isSplitDeployment = new URL(primaryCorsOrigin).origin !== new URL(env.BETTER_AUTH_URL).origin;
const shouldShareSchoolOfMarketingCookies = new URL(env.BETTER_AUTH_URL).hostname.endsWith(
  ".school-of-marketing.com",
);

function schedulePolarCustomerSetup(user: { id: string; email: string; name: string }) {
  void (async () => {
    try {
      const { result } = await polarClient.customers.list({ email: user.email });
      const existing = result.items[0];

      if (!existing) {
        await polarClient.customers.create({
          email: user.email,
          name: user.name,
          externalId: user.id,
        });
        return;
      }

      if (existing.externalId !== user.id) {
        await polarClient.customers.update({
          id: existing.id,
          customerUpdate: { externalId: user.id },
        });
      }
    } catch (error) {
      console.error("Polar customer setup failed:", error);
    }
  })();
}

const userCreateAfterHandler = createUserCreateAfterHandler({
  schedulePolarCustomerSetup,
  logError: (message, error) => console.error(message, error),
});

const polarBillingAfterHandler = createPolarBillingAfterHandler({
  logError: (message, error) => console.error(message, error),
});

function metadataTeamId(metadata: Record<string, string | number | boolean>): string | null {
  const raw = metadata.teamId;
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  return null;
}

function mapOrderPaidPayload(payload: WebhookOrderPaidPayload): PolarOrderPaidView | null {
  const order = payload.data;
  const teamId = metadataTeamId(order.metadata);
  const productId = order.productId;
  if (!teamId || !productId) {
    return null;
  }

  return {
    teamId,
    checkoutId: order.checkoutId ?? "",
    productId,
    seats: Math.max(1, order.seats ?? 1),
    subscriptionId: order.subscriptionId,
  };
}

function mapSubscriptionActivePayload(
  payload: WebhookSubscriptionActivePayload,
): PolarSubscriptionActiveView | null {
  const subscription = payload.data;
  const teamId = metadataTeamId(subscription.metadata);
  if (!teamId) {
    return null;
  }

  return {
    teamId,
    subscriptionId: subscription.id,
    productId: subscription.productId,
    seats: Math.max(1, subscription.seats ?? 1),
  };
}

export const registerPersonalAgencyOnUserCreate =
  userCreateAfterHandler.registerPersonalAgencyOnUserCreate;

export const registerPolarOrderPaid = polarBillingAfterHandler.registerPolarOrderPaid;
export const registerPolarSubscriptionActive =
  polarBillingAfterHandler.registerPolarSubscriptionActive;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: corsOrigins,
  disabledPaths: ["/sign-in/email", "/sign-up/email"],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "select_account",
      disableImplicitSignUp: false,
      disableSignUp: false,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
    // Split web/API: store OAuth state in the DB and skip the signed state cookie
    // check (that cookie is not sent on the cross-origin sign-in request).
    skipStateCookieCheck: isSplitDeployment,
  },
  databaseHooks: {
    user: {
      create: {
        after: userCreateAfterHandler.afterUserCreate,
      },
    },
  },
  onAPIError: {
    errorURL: loginErrorUrl,
  },
  session: {
    // Cache the resolved session in a signed cookie so `getSession` can verify
    // it without a Postgres lookup. 5 minutes balances freshness against the
    // latency cost of a DB round-trip on every navigation. Mutations that
    // change session state (sign-out, sign-in) refresh the cookie immediately.
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    ...(shouldShareSchoolOfMarketingCookies
      ? { crossSubDomainCookies: { enabled: true, domain: ".school-of-marketing.com" } }
      : {}),
    defaultCookieAttributes: {
      sameSite: isSplitDeployment ? "none" : "lax",
      secure: env.BETTER_AUTH_URL.startsWith("https://"),
      httpOnly: true,
    },
    ipAddress: {
      ipAddressHeaders: [...AUTH_IP_ADDRESS_HEADERS],
      trustedProxies: [...AUTH_TRUSTED_PROXY_CIDRS],
    },
  },
  plugins: [
    rememberedAccount(),
    polar({
      client: polarClient,
      createCustomerOnSignUp: false,
      use: [
        checkout({
          products: [
            {
              productId: env.POLAR_PRODUCT_PRO,
              slug: "pro",
            },
          ],
          successUrl: "/billing/success?checkout_id={CHECKOUT_ID}",
          authenticatedUsersOnly: true,
          returnUrl: new URL("/pricing", primaryCorsOrigin).toString(),
        }),
        portal({
          returnUrl: new URL("/canvas", primaryCorsOrigin).toString(),
        }),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          onOrderPaid: async (payload) => {
            const order = mapOrderPaidPayload(payload);
            if (order) {
              await polarBillingAfterHandler.handleOrderPaid(order);
            }
          },
          onSubscriptionActive: async (payload) => {
            const subscription = mapSubscriptionActivePayload(payload);
            if (subscription) {
              await polarBillingAfterHandler.handleSubscriptionActive(subscription);
            }
          },
        }),
      ],
    }),
  ],
});
