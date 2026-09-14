const FAVICON_DARK = "/favicon.svg";
const TRACKING_DARK = "/favicon-tracking.svg";

type BrandAssetKind = "favicon" | "tracking";

let tracking = false;
export function getBrandAssetHref(kind: BrandAssetKind): string {
  if (kind === "tracking") return TRACKING_DARK;
  return FAVICON_DARK;
}

function getFaviconHref(isTracking: boolean): string {
  return getBrandAssetHref(isTracking ? "tracking" : "favicon");
}

function getFaviconLink(): HTMLLinkElement | null {
  return document.querySelector('link[rel="icon"]');
}

function setFavicon(href: string): void {
  if (typeof document === "undefined") return;

  const link = getFaviconLink();
  if (link) {
    link.href = href;
    return;
  }

  const created = document.createElement("link");
  created.rel = "icon";
  created.type = "image/svg+xml";
  created.href = href;
  document.head.appendChild(created);
}

function syncFavicon(): void {
  setFavicon(getFaviconHref(tracking));
}

export function setTrackingFavicon(isTracking: boolean): void {
  tracking = isTracking;
  syncFavicon();
}
