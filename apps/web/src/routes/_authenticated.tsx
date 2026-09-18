import { createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { Suspense } from "react";

import { AppShell } from "@/features/app-shell/app-shell";
import { ShellPageTransition } from "@/features/app-shell/components/shell-page-transition";
import { RouteError, RouteNotFound, RoutePending } from "@/features/app-shell/route-status";
import { resolveLegacyAgencyRedirect } from "@/features/shared/agency-legacy-redirects";
import { TeamInviteDialog } from "@/features/team/team-invite-dialog";
import { useTeamStore } from "@/features/team/team-store";
import { loadAuthenticatedShell } from "@/lib/authenticated-boot";
import { fetchBootFirstRun, fetchBootShellChrome } from "@/lib/boot-prefetch";
import { Outlet } from "@/lib/navigation";
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
      fetchFirstRun: () => fetchBootFirstRun(),
    });
  },
  pendingComponent: () => <RoutePending variant="logo" label="Opening your workspace" />,
  errorComponent: ({ error, reset }) => (
    <RouteError message="Couldn't open your workspace." error={error} reset={reset} />
  ),
  notFoundComponent: RouteNotFound,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session } = Route.useLoaderData();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isFirstRun = pathname === "/welcome";

  return (
    <AuthProvider initialSession={session}>
      <div className="h-full min-h-0">
        {isFirstRun ? (
          <Suspense fallback={<RoutePending variant="logo" label="Opening Orch" />}>
            <Outlet />
          </Suspense>
        ) : (
          <AppShell>
            <Suspense fallback={<RoutePending label="Opening your workspace" />}>
              <ShellPageTransition />
            </Suspense>
          </AppShell>
        )}
        <TeamInviteDialog />
      </div>
    </AuthProvider>
  );
}
