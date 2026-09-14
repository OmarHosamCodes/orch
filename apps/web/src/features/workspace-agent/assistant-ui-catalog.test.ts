import { existsSync } from "node:fs";
import { describe, expect, test } from "bun:test";

import {
  ASSISTANT_UI_EXCLUDED_ITEMS,
  ASSISTANT_UI_UNMOUNTED_LAUNCHERS,
  ASSISTANT_UI_WEBSITE_ITEMS,
  isAssistantUiExcluded,
  isAssistantUiLauncherMounted,
  listMountedAssistantUiItems,
} from "./assistant-ui-catalog";

describe("assistant-ui catalog", () => {
  test("excludes non-website registry items", () => {
    expect(ASSISTANT_UI_EXCLUDED_ITEMS).toContain("elements-computer-use");
    expect(ASSISTANT_UI_EXCLUDED_ITEMS).toContain("eve-chat");
    expect(ASSISTANT_UI_EXCLUDED_ITEMS).toContain("ai-sdk-backend");
    expect(ASSISTANT_UI_EXCLUDED_ITEMS).toContain("ai-sdk-backend-resumable");
    expect(ASSISTANT_UI_EXCLUDED_ITEMS).toContain("chat/b/ai-sdk-quick-start/json");
    expect(isAssistantUiExcluded("thread")).toBe(false);
    expect(isAssistantUiExcluded("elements-computer-use")).toBe(true);
  });

  test("keeps website items out of the exclude set", () => {
    for (const item of ASSISTANT_UI_WEBSITE_ITEMS) {
      expect(isAssistantUiExcluded(item)).toBe(false);
    }
  });

  test("does not mount extra launchers", () => {
    expect(isAssistantUiLauncherMounted("assistant-modal")).toBe(false);
    expect(isAssistantUiLauncherMounted("launcher-bubble")).toBe(false);
    expect(isAssistantUiLauncherMounted("elements-launcher-bubble")).toBe(false);
    expect(isAssistantUiLauncherMounted("thread")).toBe(true);
    expect(ASSISTANT_UI_UNMOUNTED_LAUNCHERS).toContain("assistant-modal");
    expect(listMountedAssistantUiItems()).not.toContain("assistant-modal");
    expect(listMountedAssistantUiItems()).not.toContain("elements-launcher-bubble");
  });

  test("installs live website-capable source files and does not keep demo chrome", () => {
    const webRoot = `${import.meta.dir}/../../`;
    expect(existsSync(`${webRoot}components/assistant-ui/thread.tsx`)).toBe(true);
    expect(existsSync(`${webRoot}components/assistant-ui/assistant-modal.tsx`)).toBe(false);
    expect(existsSync(`${webRoot}components/elements/launcher-bubble.tsx`)).toBe(false);
    expect(existsSync(`${webRoot}components/elements/composer.tsx`)).toBe(true);
    expect(existsSync(`${webRoot}components/elements/computer-use.tsx`)).toBe(false);
    expect(ASSISTANT_UI_WEBSITE_ITEMS).toContain("thread");
    expect(ASSISTANT_UI_WEBSITE_ITEMS).toContain("elements-composer");
    expect(ASSISTANT_UI_WEBSITE_ITEMS).not.toContain("elements-quota-banner");
    expect(ASSISTANT_UI_WEBSITE_ITEMS).not.toContain("follow-up-suggestions");
  });
});
