export const LOGO_LOADER_STILL_MS = 2400;
export const LOGO_LOADER_LONG_MS = 8000;

export function logoLoaderStatus(baseLabel: string, elapsedMs: number): string {
  if (elapsedMs >= LOGO_LOADER_LONG_MS) return "This is taking longer than usual";
  if (elapsedMs >= LOGO_LOADER_STILL_MS) return "Still working";
  return baseLabel;
}

export function logoLoaderSubtitle(baseLabel: string, elapsedMs: number): string {
  const status = logoLoaderStatus(baseLabel, elapsedMs);
  if (status !== baseLabel) return status;
  return "Please wait";
}
