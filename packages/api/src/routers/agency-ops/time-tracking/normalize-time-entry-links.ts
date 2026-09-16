import { ORPCError } from "@orpc/server";

import { normalizeTimeEntryLinkUrlList } from "../shared/time-entry-links";

export { MAX_TIME_ENTRY_LINKS, MAX_TIME_ENTRY_LINK_URL_LENGTH } from "../shared/time-entry-links";

/** Trim, auto-https, validate, dedupe, and cap link URLs for time entries. */
export function normalizeTimeEntryLinkUrls(urls: string[] | undefined): string[] {
  const result = normalizeTimeEntryLinkUrlList(urls, { treatUndefinedAsEmpty: true });
  if (result.error) {
    throw new ORPCError("BAD_REQUEST", { message: result.error });
  }
  return result.urls;
}
