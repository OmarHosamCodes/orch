import type { WorkspaceNode } from "@orch/workspace";

export type WorkspaceAgentActiveMention = {
  query: string;
  start: number;
  end: number;
};

type WorkspaceAgentComposerTriggerKind = "at" | "slash";

export type WorkspaceAgentComposerTrigger = {
  kind: WorkspaceAgentComposerTriggerKind;
  query: string;
  start: number;
  end: number;
};

export type WorkspaceAgentSlashCandidate = {
  kind: "project" | "task";
  id: string;
  label: string;
};

const ACTIVE_TRIGGER_PATTERN = /(^|[\s([{:;,])([@/])([^\s@/]*)$/;

function normalizeMentionQuery(value: string) {
  return value.trim().toLowerCase();
}

function scoreMentionSuggestion(node: WorkspaceNode, normalizedQuery: string) {
  if (!normalizedQuery) return 1;

  const title = node.title.toLowerCase();
  const label = node.label?.toLowerCase() ?? "";
  const id = node.id.toLowerCase();

  if (title === normalizedQuery) return 100;
  if (id === normalizedQuery) return 95;
  if (label === normalizedQuery) return 90;
  if (title.startsWith(normalizedQuery)) return 80;
  if (label.startsWith(normalizedQuery)) return 70;
  if (id.startsWith(normalizedQuery)) return 60;
  if (title.includes(normalizedQuery)) return 50;
  if (label.includes(normalizedQuery)) return 40;
  if (id.includes(normalizedQuery)) return 30;
  return 0;
}

export function getActiveWorkspaceAgentTrigger(
  draft: string,
): WorkspaceAgentComposerTrigger | null {
  const match = ACTIVE_TRIGGER_PATTERN.exec(draft);
  if (!match) return null;
  const prefix = match[1] ?? "";
  const marker = match[2];
  const query = match[3] ?? "";
  const start = match.index + prefix.length;
  if (marker !== "@" && marker !== "/") return null;
  return {
    kind: marker === "@" ? "at" : "slash",
    query,
    start,
    end: draft.length,
  };
}

export function getActiveWorkspaceAgentMention(draft: string): WorkspaceAgentActiveMention | null {
  const trigger = getActiveWorkspaceAgentTrigger(draft);
  if (!trigger || trigger.kind !== "at") return null;
  return { query: trigger.query, start: trigger.start, end: trigger.end };
}

export function getWorkspaceAgentMentionSuggestions(
  nodes: WorkspaceNode[],
  query: string,
  selectedNodeIds: Set<string>,
  limit = 6,
) {
  const normalizedQuery = normalizeMentionQuery(query);

  return nodes
    .filter((node) => !selectedNodeIds.has(node.id))
    .map((node) => ({
      node,
      score: scoreMentionSuggestion(node, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) => right.score - left.score || left.node.title.localeCompare(right.node.title),
    )
    .slice(0, limit)
    .map(({ node }) => node);
}

export function stripActiveWorkspaceAgentTrigger(draft: string) {
  const trigger = getActiveWorkspaceAgentTrigger(draft);
  if (!trigger) return draft;
  return `${draft.slice(0, trigger.start)}${draft.slice(trigger.end)}`;
}

export function stripActiveWorkspaceAgentMention(draft: string) {
  return stripActiveWorkspaceAgentTrigger(draft);
}

export function getWorkspaceAgentSlashSuggestions(
  candidates: WorkspaceAgentSlashCandidate[],
  query: string,
  selectedIds: Set<string>,
  limit = 6,
) {
  const normalized = query.trim().toLowerCase();
  return candidates
    .filter((entry) => !selectedIds.has(entry.id))
    .filter((entry) => {
      if (!normalized) return true;
      return entry.label.toLowerCase().includes(normalized);
    })
    .slice(0, limit);
}
