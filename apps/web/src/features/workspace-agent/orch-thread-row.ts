import type { DashboardAgentToolPreset } from "@orch/agent/types";

import type { EclipseMood } from "@/features/workspace-agent/eclipse-mood";

export type OrchThreadStatusKind = "running" | "unread" | "idle";

export type OrchThreadRow = {
  id: string;
  title: string;
  status: string;
  statusKind: OrchThreadStatusKind;
  meta: string;
};

type ConversationThreadSource = {
  id: string;
  title: string;
  lastMessagePreview?: string | null;
  activeRunId?: string | null;
  unread: boolean;
  lastMessageAt: string;
  toolPreset: DashboardAgentToolPreset;
};

const PREVIEW_MAX = 72;

export function stripOrchThreadPreview(preview: string): string {
  const text =
    preview
      .replace(/<\|[^|]+\|>/g, " ")
      .replace(/\[[a-z][\w.]*\([^)]*\)\]/gi, " ")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/(^|\s)\*([^*]+)\*/g, "$1$2")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+[-*+]\s+/g, " · ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" · ")[0]
      ?.replace(/:\s*$/, "")
      .trim() ?? "";

  if (!text) return "";

  const sentence = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  const source = sentence.length >= 20 && sentence.length <= 88 ? sentence : text;
  if (source.length <= PREVIEW_MAX) return source;

  const sliced = source.slice(0, PREVIEW_MAX);
  const lastSpace = sliced.lastIndexOf(" ");
  const clipped = (lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trimEnd();
  return `${clipped}…`;
}

export function formatOrchWorkingStatus(lastMessageAt: string, now: number): string {
  const elapsedMs = now - Date.parse(lastMessageAt);
  const elapsedSec = Number.isFinite(elapsedMs) ? Math.max(0, Math.floor(elapsedMs / 1000)) : 0;
  if (elapsedSec < 60) return `Working ${elapsedSec}s`;
  const minutes = Math.floor(elapsedSec / 60);
  if (minutes < 60) return `Working ${minutes}m`;
  return `Working ${Math.floor(minutes / 60)}h`;
}

export function orchThreadRowMood(kind: OrchThreadStatusKind): EclipseMood {
  switch (kind) {
    case "running":
      return "working";
    case "unread":
      return "needs-you";
    case "idle":
      return "idle";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function formatOrchThreadPreset(preset: DashboardAgentToolPreset): string {
  switch (preset) {
    case "ask":
      return "Ask";
    case "plan":
      return "Plan";
    case "agent":
      return "Agent";
    default: {
      const exhaustive: never = preset;
      return exhaustive;
    }
  }
}

export function mapConversationToOrchThreadRow(
  item: ConversationThreadSource,
  now: number,
  settled = false,
): OrchThreadRow {
  const preview = stripOrchThreadPreview(item.lastMessagePreview ?? "");
  const title = item.title.trim();
  const meta = preview && preview.toLowerCase() !== title.toLowerCase() ? preview : "";
  const running = Boolean(item.activeRunId);
  let statusKind: OrchThreadStatusKind = "idle";
  if (running) statusKind = "running";
  else if (item.unread) statusKind = "unread";
  let status = formatOrchThreadPreset(item.toolPreset);
  if (running) status = formatOrchWorkingStatus(item.lastMessageAt, now);
  else if (item.unread) status = "Needs you";
  else if (settled) status = "Settled";

  return {
    id: item.id,
    title,
    status,
    statusKind,
    meta,
  };
}
