const FAVICON_DARK = "/favicon.svg";
const TRACKING_DARK = "/favicon-tracking.svg";
const LOGO_DARK = "/logo-animation.svg";

type BrandAssetKind = "favicon" | "tracking" | "logo";

let tracking = false;

export function getBrandAssetHref(kind: BrandAssetKind): string {
  if (kind === "logo") return LOGO_DARK;
  if (kind === "tracking") return TRACKING_DARK;
  return FAVICON_DARK;
}

export function getLogoAnimationHref(): string {
  return getBrandAssetHref("logo");
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
