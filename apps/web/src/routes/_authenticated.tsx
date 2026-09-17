import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";

import { AppShell } from "@/features/app-shell/app-shell";
import { ShellPageTransition } from "@/features/app-shell/components/shell-page-transition";
import { RouteError, RouteNotFound, RoutePending } from "@/features/app-shell/route-status";
import { resolveLegacyAgencyRedirect } from "@/features/shared/agency-legacy-redirects";
import { useTeamStore } from "@/features/team/team-store";
import { loadAuthenticatedShell } from "@/lib/authenticated-boot";
import { ensurePersonalAgencyOnBoot, fetchBootShellChrome } from "@/lib/boot-prefetch";
import { fetchBootSession } from "@/lib/session-boot";
import { AuthProvider } from "@/providers/auth-provider";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    const href = resolveLegacyAgencyRedirect(location.pathname, location.searchStr);
    if (href) {
      throw redirect({ href, replace: true });
    }
  },
  loader: async ({ context, location }) => {
    return loadAuthenticatedShell({
      queryClient: context.queryClient,
      location,
      preferredTeamId: useTeamStore.getState().selectedTeamId,
      fetchSession: () => fetchBootSession(),
      fetchChrome: async (teamId) => fetchBootShellChrome({ data: teamId ? { teamId } : {} }),
      ensurePersonal: () => ensurePersonalAgencyOnBoot(),
    });
  },
  pendingComponent: () => <RoutePending variant="logo" label="Opening your workspace" />,
  errorComponent: () => <RouteError message="Couldn't open your workspace." />,
  notFoundComponent: RouteNotFound,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session } = Route.useLoaderData();

  return (
    <AuthProvider initialSession={session}>
      <div className="h-full min-h-0">
        <AppShell>
          <Suspense fallback={<RoutePending label="Opening your workspace" />}>
            <ShellPageTransition />
          </Suspense>
        </AppShell>
      </div>
    </AuthProvider>
  );
}
