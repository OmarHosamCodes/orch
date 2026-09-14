import { db } from "@orch/db";
import * as schema from "@orch/db/schema/auth";
import { corsOrigins, env, primaryCorsOrigin } from "@orch/env/server";
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { AUTH_IP_ADDRESS_HEADERS, AUTH_TRUSTED_PROXY_CIDRS } from "./trusted-proxies";

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

const loginErrorUrl = new URL("/login", primaryCorsOrigin).toString();
const isSplitDeployment = new URL(primaryCorsOrigin).origin !== new URL(env.BETTER_AUTH_URL).origin;

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

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: corsOrigins,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
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
        after: async (user) => {
          schedulePolarCustomerSetup(user);
        },
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
        }),
      ],
    }),
  ],
});
