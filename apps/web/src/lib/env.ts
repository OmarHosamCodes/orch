declare const __BRAINIAC_SERVER_URL__: string;
declare const __SENTRY_DSN__: string;

const FALLBACK_SERVER_URL = "http://localhost:7000";

const serverUrl = __BRAINIAC_SERVER_URL__ || (import.meta.env.DEV ? FALLBACK_SERVER_URL : "");

export function getServerUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  if (serverUrl) {
    return serverUrl;
  }

  // Prerender / local SSR without env still needs a stable absolute origin.
  return FALLBACK_SERVER_URL;
}

/** Route RPC through the web app origin so production can proxy to the API. */
export function getRpcBaseUrl(): string {
  return getServerUrl();
}

/** Route auth through the web app origin so session cookies stay first-party. */
export function getAuthBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getServerUrl();
}
