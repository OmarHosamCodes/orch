import type { AgencyTaskMessage } from "@orch/api/routers/agency-ops/task-messages/schemas";

/** Pure helpers for thread message → Orch / reply quote. */
export function truncateTaskMessagePreview(text: string, max = 80) {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(1, max - 1))}…`;
}

export function taskMessageScopeLabel(message: AgencyTaskMessage) {
  const preview =
    truncateTaskMessagePreview(message.content, 72) ||
    message.attachments[0]?.fileName ||
    "Message";
  return truncateTaskMessagePreview(`${message.userName} · ${preview}`, 160);
}

export function taskMessageReplyPreview(message: AgencyTaskMessage) {
  return (
    truncateTaskMessagePreview(message.content, 120) ||
    message.attachments[0]?.fileName ||
    "Attachment"
  );
}

/** Embed a WhatsApp-style reply quote into outbound content. */
export function composeTaskMessageWithReply(args: { content: string; replyTo: AgencyTaskMessage }) {
  const body = args.content.trim();
  const preview = taskMessageReplyPreview(args.replyTo);
  const quote = `> @${args.replyTo.userName}: ${preview}`;
  if (!body) return `${quote}\n\n`;
  return `${quote}\n\n${body}`;
}

export type ParsedTaskMessageReplyQuote = {
  authorName: string;
  preview: string;
  body: string;
};

const REPLY_QUOTE_PATTERN = /^>\s*@([^:\n]+):\s*([^\n]*)\n\n([\s\S]*)$/;

export function parseTaskMessageReplyQuote(content: string): ParsedTaskMessageReplyQuote | null {
  const match = REPLY_QUOTE_PATTERN.exec(content);
  if (!match) return null;
  return {
    authorName: match[1]!.trim(),
    preview: match[2]!.trim(),
    body: match[3] ?? "",
  };
}

const ORCH_MENTION_PATTERN = /(^|[\s([{])@orch\b/i;

export function contentMentionsOrch(content: string) {
  return ORCH_MENTION_PATTERN.test(content);
}

/** Ensure the composer draft includes an @Orch mention. */
export function ensureOrchMentionInDraft(draft: string) {
  if (contentMentionsOrch(draft)) return draft;
  const trimmed = draft.trim();
  return trimmed ? `${trimmed} @Orch ` : "@Orch ";
}

export function stripOrchMentions(content: string) {
  return content
    .replace(/(^|[\s([{])@orch\b/gi, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function buildThreadOrchAskPrompt(args: {
  taskTitle: string;
  userContent: string;
  replyTo: AgencyTaskMessage | null;
}) {
  const question = stripOrchMentions(args.userContent) || "Please help with this thread.";
  const lines = ["Answer briefly in this task thread.", `Task: ${args.taskTitle}`];
  if (args.replyTo) {
    lines.push(
      `Context message from ${args.replyTo.userName}: ${taskMessageReplyPreview(args.replyTo)}`,
    );
  }
  lines.push(`User: ${question}`);
  return lines.join("\n");
}
