export const APP_UPDATE_POLL_MS = 60_000;
const APP_UPDATE_MIN_LOADER_MS = 1_000;
const APP_VERSION_PATH = "/version.json";

type AppVersionPayload = {
  buildId: string;
};

declare const __APP_BUILD_ID__: string;

export function getLocalAppBuildId(): string {
  return typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "";
}

export function parseAppVersionPayload(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const buildId = (value as AppVersionPayload).buildId;
  if (typeof buildId !== "string" || buildId.length === 0) return null;
  return buildId;
}

export function isRemoteBuildNewer(localBuildId: string, remoteBuildId: string | null): boolean {
  if (!remoteBuildId) return false;
  if (!localBuildId) return false;
  return remoteBuildId !== localBuildId;
}

function isChunkLoadFailureMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("loading chunk") ||
    normalized.includes("error loading dynamically imported module") ||
    normalized.includes("importing a module script failed")
  );
}

export function isChunkLoadFailureReason(reason: unknown): boolean {
  if (reason instanceof Error) {
    return isChunkLoadFailureMessage(reason.message);
  }
  if (typeof reason === "string") {
    return isChunkLoadFailureMessage(reason);
  }
  return false;
}

export async function fetchRemoteAppBuildId(
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl(APP_VERSION_PATH, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return parseAppVersionPayload(await response.json());
  } catch {
    return null;
  }
}

export async function refreshAppWithMinDwell(
  options: {
    minDwellMs?: number;
    sleep?: (ms: number) => Promise<void>;
    reload?: () => void;
  } = {},
): Promise<void> {
  const minDwellMs = options.minDwellMs ?? APP_UPDATE_MIN_LOADER_MS;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const reload = options.reload ?? (() => window.location.reload());

  await sleep(minDwellMs);
  reload();
}
