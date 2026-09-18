export function extractPastedUrls(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const matches = trimmed.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  if (matches.length > 0) {
    return uniqueUrls(matches.map(stripTrailingPunctuation));
  }

  if (/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(trimmed) && !trimmed.includes(" ")) {
    return [`https://${trimmed}`];
  }

  return [];
}

function stripTrailingPunctuation(url: string): string {
  return url.replace(/[),.;]+$/g, "");
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    next.push(url);
  }
  return next;
}

export function pasteChipHostLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Known hosts map to palette slots; null means hash fallback via projectHueFor. */
export function pasteChipHostHueId(host: string): number | null {
  const normalized = host.toLowerCase();

  if (normalized.includes("linear")) return 1;
  if (normalized.includes("github")) return 12;
  if (normalized.includes("notion")) return 2;
  if (normalized.includes("figma")) return 10;
  if (normalized.includes("slack")) return 9;
  if (normalized.includes("google")) return 2;
  if (normalized.includes("vercel")) return 12;

  return null;
}

export function pasteChipHostHue(host: string) {
  const hueId = pasteChipHostHueId(host);
  return { host, hueId };
}
