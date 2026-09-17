import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { resolveBootTeamId, seedBootChromeQueries, type BootShellChrome } from "@/lib/boot-chrome";
import { orpc } from "@/lib/orpc";
import type { BootSession } from "@/lib/session-boot";

export async function loadAuthenticatedShell(input: {
  queryClient: QueryClient;
  location: { pathname: string; searchStr: string };
  preferredTeamId?: string | null;
  fetchSession: () => Promise<BootSession>;
  fetchChrome: (teamId?: string) => Promise<BootShellChrome>;
  ensurePersonal?: () => Promise<unknown>;
}): Promise<{ session: NonNullable<BootSession>; teamCount: number }> {
  const bootStartedAt = Date.now();
  const preferredTeamId = input.preferredTeamId || undefined;
  const sessionPromise = input.fetchSession();
  const chromePromise = input.fetchChrome(preferredTeamId);
  const session = await sessionPromise;
  let chrome = await chromePromise;

  if (!session) {
    const redirectTo = `${input.location.pathname}${input.location.searchStr}`;
    throw redirect({
      href: `/login?redirect=${encodeURIComponent(redirectTo || "/canvas")}`,
    });
  }

  if (chrome.teams?.items.length === 0 && input.ensurePersonal) {
    await input.ensurePersonal();
    chrome = await input.fetchChrome(preferredTeamId);
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
  return { session, teamCount: chrome.teams?.items.length ?? 0 };
}
