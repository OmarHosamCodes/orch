/** Website-capable @assistant-ui registry items installed for the Orch composer. */

export const ASSISTANT_UI_EXCLUDED_ITEMS = [
  "elements-computer-use",
  "eve-chat",
  "ai-sdk-backend",
  "ai-sdk-backend-resumable",
  "chat/b/ai-sdk-quick-start/json",
] as const;

export const ASSISTANT_UI_UNMOUNTED_LAUNCHERS = [
  "assistant-modal",
  "launcher-bubble",
  "elements-launcher-bubble",
] as const;

export const ASSISTANT_UI_WEBSITE_ITEMS = [
  "elements-surfaces",
  "elements-error-state",
  "elements-artifact-card",
  "elements-composer",
  "elements-empty-state",
  "elements-thread-list",
  "elements-message-queue",
  "elements-canvas-split",
  "elements-conversation-search",
  "elements-thread-search",
  "elements-draft-restore",
  "elements-stopped-run",
  "thread",
  "markdown-text",
  "reasoning",
  "tooltip-icon-button",
  "attachment",
  "tool-fallback",
  "tool-group",
  "image",
  "file",
  "model-selector",
] as const;
export function isAssistantUiExcluded(item: string): boolean {
  return (ASSISTANT_UI_EXCLUDED_ITEMS as readonly string[]).includes(item);
}

export function isAssistantUiLauncherMounted(item: string): boolean {
  if (item === "elements-launcher-bubble") return false;
  return !(ASSISTANT_UI_UNMOUNTED_LAUNCHERS as readonly string[]).includes(item);
}

export function listMountedAssistantUiItems(): string[] {
  return ASSISTANT_UI_WEBSITE_ITEMS.filter(
    (item) => !isAssistantUiExcluded(item) && isAssistantUiLauncherMounted(item),
  );
}
