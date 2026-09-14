export type AgencySearchHighlightPart = {
  text: string;
  match: boolean;
};

export function tokenizeAgencySearchQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
}

function normalizeAgencySearchTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function agencyListSearchMatches(term: string, ...fields: string[]): boolean {
  const normalized = normalizeAgencySearchTerm(term);
  if (!normalized) return true;
  return fields.some((field) => field.toLowerCase().includes(normalized));
}

function collectHighlightRanges(
  text: string,
  tokens: string[],
): Array<{ start: number; end: number }> {
  const lowerText = text.toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];

  for (const token of tokens) {
    let from = 0;
    while (from < text.length) {
      const index = lowerText.indexOf(token, from);
      if (index === -1) break;
      ranges.push({ start: index, end: index + token.length });
      from = index + token.length;
    }
  }

  if (ranges.length === 0) return [];
  ranges.sort((left, right) => left.start - right.start || left.end - right.end);

  const merged: Array<{ start: number; end: number }> = [ranges[0]!];
  for (const range of ranges.slice(1)) {
    const last = merged[merged.length - 1]!;
    if (range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
      continue;
    }
    merged.push(range);
  }
  return merged;
}

export function splitAgencySearchHighlight(
  text: string,
  query: string,
): AgencySearchHighlightPart[] {
  const tokens = tokenizeAgencySearchQuery(query);
  if (tokens.length === 0) return [{ text, match: false }];

  const ranges = collectHighlightRanges(text, tokens);
  if (ranges.length === 0) return [{ text, match: false }];

  const parts: AgencySearchHighlightPart[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) {
      parts.push({ text: text.slice(cursor, range.start), match: false });
    }
    parts.push({ text: text.slice(range.start, range.end), match: true });
    cursor = range.end;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), match: false });
  }

  return parts.length > 0 ? parts : [{ text, match: false }];
}
