import type { AppRouterClient } from "@orch/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { loadBootShellChrome, type BootShellChrome } from "@/lib/boot-chrome";
import { resolveSsrApiOrigin } from "@/lib/ssr-api-origin";

export type { BootShellChrome } from "@/lib/boot-chrome";

function createServerOrpcClient(cookie: string): AppRouterClient {
  const link = new RPCLink({
    url: `${resolveSsrApiOrigin()}/rpc`,
    fetch(request, init) {
      const headers = new Headers();
      if (cookie) {
        headers.set("cookie", cookie);
      }
      return fetch(request, {
        ...(init as RequestInit | undefined),
        headers,
      });
    },
  });
  return createORPCClient(link);
}

const emptyChrome = (): BootShellChrome => ({
  teams: null,
  teamId: "",
  unread: null,
  notifications: null,
  timer: null,
});

export const fetchBootShellChrome = createServerFn({ method: "GET" })
  .validator((input: { teamId?: string } | undefined) => input ?? {})
  .handler(async ({ data }): Promise<BootShellChrome> => {
    const cookie = getRequestHeader("cookie") ?? "";
    if (!cookie) return emptyChrome();

    const client = createServerOrpcClient(cookie);
    return loadBootShellChrome(client, data.teamId);
  });
