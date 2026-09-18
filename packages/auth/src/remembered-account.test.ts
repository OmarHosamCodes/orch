import { describe, expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { rememberedAccount } from "./remembered-account";

describe("unified Google authentication", () => {
  test("creates then reuses an account, remembers it after sign-out, and rejects tampered recall", async () => {
    const auth = betterAuth({
      baseURL: "http://localhost:9876",
      secret: "test-only-secret-at-least-thirty-two-characters",
      database: memoryAdapter({ user: [], account: [], session: [], verification: [] }),
      emailAndPassword: { enabled: true },
      disabledPaths: ["/sign-in/email", "/sign-up/email"],
      socialProviders: {
        google: {
          clientId: "test-client",
          clientSecret: "test-secret",
          disableImplicitSignUp: false,
          disableSignUp: false,
        },
      },
      plugins: [rememberedAccount()],
    });
    const context = await auth.$context;
    const google = context.socialProviders.find((provider) => provider.id === "google");
    if (!google) throw new Error("Google provider missing");
    // Only the external Google exchange is substituted; Better Auth runs the complete callback.
    google.validateAuthorizationCode = async () => ({ accessToken: "test-token" });
    google.getUserInfo = async () => ({
      user: {
        id: "google-user-1",
        email: "returning@example.com",
        name: "Returning User",
        emailVerified: true,
      },
      data: {},
    });

    async function login() {
      const start = await auth.api.signInSocial({
        body: {
          provider: "google",
          callbackURL: "http://localhost:9876/canvas",
          disableRedirect: true,
          loginHint: "returning@example.com",
        },
        asResponse: true,
      });
      const payload = await start.json();
      if (
        !payload ||
        typeof payload !== "object" ||
        !("url" in payload) ||
        typeof payload.url !== "string"
      ) {
        throw new Error("OAuth start did not return an authorization URL");
      }
      const url = new URL(payload.url);
      expect(url.searchParams.get("login_hint")).toBe("returning@example.com");
      const response = await auth.handler(
        new Request(
          `http://localhost:9876/api/auth/callback/google?code=test-code&state=${url.searchParams.get("state")}`,
          {
            headers: {
              cookie: start.headers
                .getSetCookie()
                .map((cookie) => cookie.split(";")[0])
                .join("; "),
            },
          },
        ),
      );
      expect(response.headers.get("location")).toBe("http://localhost:9876/canvas");
      return response;
    }

    const first = await login();
    const cookies = first.headers.getSetCookie();
    const remembered = cookies.find((cookie) =>
      cookie.startsWith("orch.remembered_google_account="),
    );
    expect(remembered).toContain("HttpOnly");
    if (!remembered) throw new Error("Missing remembered cookie");
    const cookie = cookies.map((value) => value.split(";")[0]).join("; ");
    const firstSession = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(firstSession?.user.email).toBe("returning@example.com");
    await auth.api.signOut({ headers: new Headers({ cookie }) });
    const recall = await auth.handler(
      new Request("http://localhost:9876/api/auth/remembered-account", {
        headers: { cookie: remembered.split(";")[0] ?? "" },
      }),
    );
    expect(await recall.json()).toEqual({ email: "returning@example.com" });
    expect(recall.headers.get("cache-control")).toBe("no-store");
    const second = await login();
    const secondSession = await auth.api.getSession({
      headers: new Headers({
        cookie: second.headers
          .getSetCookie()
          .map((value) => value.split(";")[0])
          .join("; "),
      }),
    });
    expect(secondSession?.user.id).toBe(firstSession?.user.id);
    for (const value of ["", "orch.remembered_google_account=attacker@example.com"]) {
      const response = await auth.handler(
        new Request("http://localhost:9876/api/auth/remembered-account", {
          headers: { cookie: value },
        }),
      );
      expect(await response.json()).toEqual({ email: null });
    }
    for (const path of ["sign-in/email", "sign-up/email"]) {
      const response = await auth.handler(
        new Request(`http://localhost:9876/api/auth/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
      );
      expect(response.status).toBe(404);
    }
  });
});
