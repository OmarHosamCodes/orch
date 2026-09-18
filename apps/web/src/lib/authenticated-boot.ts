import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { resolveBootTeamId, seedBootChromeQueries, type BootShellChrome } from "@/lib/boot-chrome";
import { orpc } from "@/lib/orpc";
import type { BootSession } from "@/lib/session-boot";

export type BootFirstRun = {
  status: "create" | "join" | "done";
  completedAt: string | null;
  membershipCount: number;
  joinTeam: { id: string; name: string } | null;
  defaultAgencyName: string;
};

function isWelcomePath(pathname: string) {
  return pathname === "/welcome";
}

function isAgencyPath(pathname: string) {
  return pathname === "/agency" || pathname.startsWith("/agency/");
}

export async function loadAuthenticatedShell(input: {
  queryClient: QueryClient;
  location: { pathname: string; searchStr: string };
  preferredTeamId?: string | null;
  fetchSession: () => Promise<BootSession>;
  fetchChrome: (teamId?: string) => Promise<BootShellChrome>;
  fetchFirstRun?: () => Promise<BootFirstRun>;
}): Promise<{
  session: NonNullable<BootSession>;
  teamCount: number;
  firstRun: BootFirstRun | null;
}> {
  const bootStartedAt = Date.now();
  const preferredTeamId = input.preferredTeamId || undefined;
  const sessionPromise = input.fetchSession();
  const chromePromise = input.fetchChrome(preferredTeamId);
  const firstRunPromise = input.fetchFirstRun
    ? input.fetchFirstRun().catch(() => null)
    : Promise.resolve(null);
  const session = await sessionPromise;
  const chrome = await chromePromise;
  const firstRun = await firstRunPromise;

  if (!session) {
    const redirectTo = `${input.location.pathname}${input.location.searchStr}`;
    throw redirect({
      href: `/login?redirect=${encodeURIComponent(redirectTo || "/canvas")}`,
    });
  }

  if (firstRun && firstRun.status !== "done" && !isWelcomePath(input.location.pathname)) {
    throw redirect({ href: "/welcome", replace: true });
  }

  if (firstRun && firstRun.status === "done" && isWelcomePath(input.location.pathname)) {
    throw redirect({
      href: firstRun.membershipCount > 0 ? "/agency" : "/canvas",
      replace: true,
    });
  }

  if (
    firstRun &&
    firstRun.status === "done" &&
    firstRun.membershipCount === 0 &&
    isAgencyPath(input.location.pathname)
  ) {
    throw redirect({ href: "/canvas", replace: true });
  }

  const teamId = resolveBootTeamId(chrome.teams?.items ?? [], preferredTeamId);
  if (teamId && typeof window !== "undefined") {
    await input.queryClient
      .prefetchQuery({
        ...orpc.billing.state.queryOptions({ input: { teamId } }),
        staleTime: 5 * 60 * 1000,
      })
      .catch(() => undefined);
  }

  seedBootChromeQueries(input.queryClient, chrome, bootStartedAt);
  if (firstRun) {
    input.queryClient.setQueryData(orpc.onboarding.get.queryOptions().queryKey, firstRun);
  }

  return { session, teamCount: chrome.teams?.items.length ?? 0, firstRun };
}
