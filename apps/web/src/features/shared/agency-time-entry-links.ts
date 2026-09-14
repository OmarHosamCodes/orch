import { normalizeTimeEntryLinkUrlList } from "@orch/api/routers/agency-ops/shared/time-entry-links";

export {
  MAX_TIME_ENTRY_LINKS,
  joinedTimeEntryLinkUrls,
  mergeTimeEntryLinkRecords,
  normalizeTimeEntryLinkUrl,
  type TimeEntryLinkRecord,
} from "@orch/api/routers/agency-ops/shared/time-entry-links";

/** Web dialog wrapper around canonical normalize. */
export function normalizeTimeEntryLinkUrls(urls: readonly string[]): {
  urls: string[];
  error: string | null;
} {
  return normalizeTimeEntryLinkUrlList(urls);
}

/** Hostname + path truncated for report cells; full URL stays in tooltip. */
export function formatTimeEntryLinkLabel(url: string, maxLength = 40): string {
  try {
    const parsed = new URL(url);
    const label = `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}${parsed.search}`;
    if (label.length <= maxLength) return label;
    return `${label.slice(0, maxLength - 1)}…`;
  } catch {
    if (url.length <= maxLength) return url;
    return `${url.slice(0, maxLength - 1)}…`;
  }
}
