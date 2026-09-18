import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, createAuthMiddleware } from "better-auth/api";

const COOKIE_NAME = "orch.remembered_google_account";

export function rememberedAccount() {
  return {
    id: "remembered-account",
    endpoints: {
      getRememberedAccount: createAuthEndpoint(
        "/remembered-account",
        { method: "GET" },
        async (ctx) => {
          ctx.setHeader("Cache-Control", "no-store");
          const email = await ctx.getSignedCookie(COOKIE_NAME, ctx.context.secret);
          return ctx.json({ email: email || null });
        },
      ),
    },
    hooks: {
      after: [
        {
          matcher: (ctx) => ctx.path === "/callback/:id" || ctx.path === "/callback/google",
          handler: createAuthMiddleware(async (ctx) => {
            if (ctx.params?.id !== "google") return;
            const email = ctx.context.newSession?.user.email;
            if (!email) return;
            ctx.setCookie("orch.last_used_email", "", {
              ...ctx.context.authCookies.sessionToken.attributes,
              maxAge: 0,
            });
            await ctx.setSignedCookie(COOKIE_NAME, email, ctx.context.secret, {
              ...ctx.context.authCookies.sessionToken.attributes,
              httpOnly: true,
              maxAge: 60 * 60 * 24 * 365,
            });
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}
