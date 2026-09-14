import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/react";

import { getAuthBaseUrl } from "@/lib/env";

const SESSION_REQUEST_TIMEOUT_MS = 6_000;

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [polarClient()],
  fetchOptions: {
    timeout: SESSION_REQUEST_TIMEOUT_MS,
    credentials: "include",
  },
});

let readySettled = false;

export function markAuthSessionReady(): void {
  if (readySettled) {
    return;
  }
  readySettled = true;
}

setTimeout(() => markAuthSessionReady(), SESSION_REQUEST_TIMEOUT_MS);
