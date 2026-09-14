import type { ThemePreference } from "@/lib/theme";

const FAVICON_DARK = "/favicon.svg";
const FAVICON_LIGHT = "/favicon-light.svg";
const TRACKING_DARK = "/favicon-tracking.svg";
const TRACKING_LIGHT = "/favicon-tracking-light.svg";
const LOGO_DARK = "/logo-animation.svg";
const LOGO_LIGHT = "/logo-animation-light.svg";

const THEME_COLOR_LIGHT = "oklch(0.985 0.006 269)";
const THEME_COLOR_DARK = "oklch(0.15 0.02 269.18)";

type BrandAssetKind = "favicon" | "tracking" | "logo";

let tracking = false;
let theme: ThemePreference = "dark";

export function getBrandAssetHref(kind: BrandAssetKind, preference: ThemePreference): string {
  const light = preference === "light";
  if (kind === "logo") return light ? LOGO_LIGHT : LOGO_DARK;
  if (kind === "tracking") return light ? TRACKING_LIGHT : TRACKING_DARK;
  return light ? FAVICON_LIGHT : FAVICON_DARK;
}

export function getLogoAnimationHref(preference: ThemePreference): string {
  return getBrandAssetHref("logo", preference);
}

function getFaviconHref(preference: ThemePreference, isTracking: boolean): string {
  return getBrandAssetHref(isTracking ? "tracking" : "favicon", preference);
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

function getThemeColorMeta(): HTMLMetaElement | null {
  return document.querySelector('meta[name="theme-color"]');
}

function setThemeColor(preference: ThemePreference): void {
  if (typeof document === "undefined") return;

  const content = preference === "light" ? THEME_COLOR_LIGHT : THEME_COLOR_DARK;
  const meta = getThemeColorMeta();
  if (meta) {
    meta.content = content;
    return;
  }

  const created = document.createElement("meta");
  created.name = "theme-color";
  created.content = content;
  document.head.appendChild(created);
}

function syncFavicon(): void {
  setFavicon(getFaviconHref(theme, tracking));
}

export function setTrackingFavicon(isTracking: boolean): void {
  tracking = isTracking;
  syncFavicon();
}

export function setFaviconTheme(preference: ThemePreference): void {
  theme = preference;
  syncFavicon();
  setThemeColor(preference);
}
