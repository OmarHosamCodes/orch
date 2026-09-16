const LEAK_START_RE = /<\|tool_call_start\|>|<tool_call>|\[Calling |\[Tool result /i;
const OPEN_PREFIXES = ["<|tool_call_start|>", "<tool_call>", "[Calling ", "[Tool result "];

type LeakKind = "xml-pipe" | "xml-plain" | "calling" | "result";

function leakKindFromMatch(raw: string): LeakKind {
  const token = raw.toLowerCase();
  if (token.startsWith("<|tool_call_start|>")) return "xml-pipe";
  if (token.startsWith("<tool_call>")) return "xml-plain";
  if (token.startsWith("[calling ")) return "calling";
  return "result";
}

function findLeakStart(text: string, from: number): { index: number; kind: LeakKind } | null {
  const match = text.slice(from).match(LEAK_START_RE);
  if (!match || match.index === undefined || match[0] === undefined) return null;
  return { index: from + match.index, kind: leakKindFromMatch(match[0]) };
}

function pendingOpenTagHold(buffer: string): number {
  const lower = buffer.toLowerCase();
  let hold = 0;
  for (const tag of OPEN_PREFIXES) {
    const needle = tag.toLowerCase();
    for (let size = 1; size < needle.length; size += 1) {
      if (lower.endsWith(needle.slice(0, size))) {
        hold = Math.max(hold, size);
      }
    }
  }
  return hold;
}

function skipQuoted(text: string, start: number): number | null {
  const quote = text[start];
  if (quote !== "'" && quote !== '"') return null;
  for (let i = start + 1; i < text.length; i += 1) {
    if (text[i] === "\\" && i + 1 < text.length) {
      i += 1;
      continue;
    }
    if (text[i] === quote) return i + 1;
  }
  return null;
}

function skipBalancedValue(text: string, start: number): number | null {
  const opener = text[start];
  if (opener !== "{" && opener !== "[") return null;
  const stack: Array<"}" | "]"> = [opener === "{" ? "}" : "]"];
  let i = start + 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "'" || ch === '"') {
      const next = skipQuoted(text, i);
      if (next === null) return null;
      i = next;
      continue;
    }
    if (ch === "{") {
      stack.push("}");
      i += 1;
      continue;
    }
    if (ch === "[") {
      stack.push("]");
      i += 1;
      continue;
    }
    if (ch === "}" || ch === "]") {
      if (stack[stack.length - 1] === ch) stack.pop();
      i += 1;
      if (stack.length === 0) return i;
      continue;
    }
    i += 1;
  }
  return null;
}

function skipWhitespace(text: string, start: number): number {
  let i = start;
  while (i < text.length && /\s/.test(text[i] ?? "")) i += 1;
  return i;
}

function skipInterstitialWhitespace(text: string, start: number): number {
  const next = skipWhitespace(text, start);
  if (next === start) return start;
  if (next === text.length) return next;
  const leak = findLeakStart(text, next);
  if (leak?.index === next) return next;
  return start;
}

function skipJsonishValue(text: string, start: number): number | null {
  const i = skipWhitespace(text, start);
  if (i >= text.length) return i;
  if (findLeakStart(text, i)?.index === i) return i;
  if (text[i] === "{" || text[i] === "[") return skipBalancedValue(text, i);
  if (text[i] === "'" || text[i] === '"') return skipQuoted(text, i);
  return i;
}

function skipLeak(text: string, index: number, kind: LeakKind): number | null {
  switch (kind) {
    case "xml-pipe": {
      const close = text.slice(index).match(/<\|tool_call_end\|>/i);
      if (!close || close.index === undefined) return null;
      return index + close.index + close[0].length;
    }
    case "xml-plain": {
      const close = text.slice(index).match(/<\/tool_call>/i);
      if (!close || close.index === undefined) return null;
      return index + close.index + close[0].length;
    }
    case "calling": {
      const close = text.indexOf("]", index);
      if (close === -1) return null;
      return close + 1;
    }
    case "result": {
      const close = text.indexOf("]", index);
      if (close === -1) return null;
      return skipJsonishValue(text, close + 1);
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function tidyProse(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripLeakedToolCallMarkup(text: string): string {
  let out = "";
  let cursor = 0;
  while (cursor < text.length) {
    const leak = findLeakStart(text, cursor);
    if (!leak) {
      out += text.slice(cursor);
      break;
    }
    out += text.slice(cursor, leak.index);
    const end = skipLeak(text, leak.index, leak.kind);
    cursor = skipInterstitialWhitespace(text, end ?? text.length);
  }
  return tidyProse(out);
}

export function extractLeakedToolCallNames(text: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const patterns = [
    /<\|tool_call_start\|>\s*\[?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
    /<tool_call>\s*\[?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
    /\[Calling\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
  ];
  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      const name = match[1];
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

export function createLeakedToolMarkupFilter() {
  let buffer = "";
  return {
    push(delta: string): string {
      if (!delta) return "";
      buffer += delta;
      let emit = "";
      while (buffer.length > 0) {
        const leak = findLeakStart(buffer, 0);
        if (!leak) {
          const hold = pendingOpenTagHold(buffer);
          emit += buffer.slice(0, buffer.length - hold);
          buffer = buffer.slice(buffer.length - hold);
          break;
        }
        emit += buffer.slice(0, leak.index);
        const end = skipLeak(buffer, leak.index, leak.kind);
        if (end === null) {
          buffer = buffer.slice(leak.index);
          break;
        }
        buffer = buffer.slice(skipInterstitialWhitespace(buffer, end));
      }
      return emit;
    },
    flush(): string {
      const visible = stripLeakedToolCallMarkup(buffer);
      buffer = "";
      return visible;
    },
  };
}

export function finalizeAssistantResponseText(input: {
  responseText: string;
  stopped: boolean;
  toolCount: number;
}): string {
  const stripped = stripLeakedToolCallMarkup(input.responseText).slice(0, 20_000);
  if (stripped.length > 0) return stripped;
  if (input.stopped) return "Stopped before a reply.";
  if (input.toolCount > 0) return "";
  if (extractLeakedToolCallNames(input.responseText).length > 0) return "";
  return "I couldn't generate a response.";
}

export function isIncompleteToolPreamble(text: string): boolean {
  const stripped = stripLeakedToolCallMarkup(text);
  if (!stripped) return true;
  if (stripped.length > 240) return false;
  const gathering =
    /\b(i['’]ll (gather|check|look|pull|fetch|review)|let me (gather|check|look|pull|fetch|review)|i am going to|from multiple sources|in parallel)\b/i.test(
      stripped,
    );
  if (!gathering) return false;
  return !/\b(\d+(\.\d+)?\s*(h|hours?|%)|waste|attendance|off days|recommend|next steps|risk)\b/i.test(
    stripped,
  );
}
