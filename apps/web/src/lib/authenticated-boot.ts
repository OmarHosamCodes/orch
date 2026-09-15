import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { seedBootChromeQueries, type BootShellChrome } from "@/lib/boot-chrome";
import { orpc } from "@/lib/orpc";
import type { BootSession } from "@/lib/session-boot";

export async function loadAuthenticatedShell(input: {
  queryClient: QueryClient;
  location: { pathname: string; searchStr: string };
  preferredTeamId?: string | null;
  fetchSession: () => Promise<BootSession>;
  fetchChrome: (teamId?: string) => Promise<BootShellChrome>;
}): Promise<{ session: NonNullable<BootSession>; teamCount: number }> {
  const bootStartedAt = Date.now();
  const preferredTeamId = input.preferredTeamId || undefined;
  const sessionPromise = input.fetchSession();
  const chromePromise = input.fetchChrome(preferredTeamId);
  const session = await sessionPromise;
  const billingPromise =
    session && typeof window !== "undefined"
      ? input.queryClient
          .prefetchQuery({
            ...orpc.billing.state.queryOptions(),
            staleTime: 5 * 60 * 1000,
          })
          .catch(() => undefined)
      : Promise.resolve();
  const [chrome] = await Promise.all([chromePromise, billingPromise]);

  if (!session) {
    const redirectTo = `${input.location.pathname}${input.location.searchStr}`;
    throw redirect({
      href: `/login?redirect=${encodeURIComponent(redirectTo || "/canvas")}`,
    });
  }

  seedBootChromeQueries(input.queryClient, chrome, bootStartedAt);
  return { session, teamCount: chrome.teams?.items.length ?? 0 };
}
