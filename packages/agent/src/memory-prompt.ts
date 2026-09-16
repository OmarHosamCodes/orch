export type MemoryPromptParts = {
  facts: string;
  recentObservations: string;
  unreadInbox: string;
};

export function formatMemoryForPrompt(parts: MemoryPromptParts): string {
  const sections = [
    parts.facts.trim() ? `Known facts:\n${parts.facts.trim()}` : "",
    parts.recentObservations.trim()
      ? `Recent observations:\n${parts.recentObservations.trim()}`
      : "",
    parts.unreadInbox.trim() ? `Unread inbox:\n${parts.unreadInbox.trim()}` : "",
  ].filter(Boolean);

  if (sections.length === 0) {
    return "";
  }

  return `You are a personal assistant for this one person. Use this private memory; do not invent facts. Update it with remember_fact.\n\n${sections.join("\n\n")}`;
}
