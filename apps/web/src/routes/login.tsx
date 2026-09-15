import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginPage } from "@/features/auth/login-page";
import { validateLoginSearch } from "@/lib/router-search";
import { safeRedirectPath } from "@/lib/safe-redirect-path";
import { fetchBootSession } from "@/lib/session-boot";

export const Route = createFileRoute("/login")({
  validateSearch: validateLoginSearch,
  loader: async ({ location }) => {
    const session = await fetchBootSession();
    if (session) {
      const params = new URLSearchParams(location.searchStr);
      throw redirect({ href: safeRedirectPath(params.get("redirect")) });
    }
    return { session };
  },
  component: LoginRoute,
  head: () => ({
    meta: [{ title: "Sign in — Orch" }],
  }),
});

function LoginRoute() {
  return <LoginPage />;
}
