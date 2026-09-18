import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import type { WorkspaceMarketplacePayload, WorkspaceNode } from "@orch/workspace";

import { user } from "./auth";
import { workspaceTeam } from "./team";

export type WorkspaceNodeRecord = WorkspaceNode;
export type WorkspaceMarketplacePayloadRecord = WorkspaceMarketplacePayload;
export type DashboardConversationMessageContextNodeTitlesRecord = string[];
export type DashboardConversationMessageToolCallRecord = {
  id?: string;
  name: string;
  input?: unknown;
  output?: unknown;
  status?: "completed" | "error" | "in_progress";
  error?: string | null;
  durationMs?: number;
};
export type DashboardConversationMessageToolsCalledRecord = Array<
  string | DashboardConversationMessageToolCallRecord
>;
export type DashboardConversationMessageAttachmentRecord = {
  filename: string;
  mediaType:
    | "text/plain"
    | "text/markdown"
    | "application/json"
    | "image/png"
    | "image/jpeg"
    | "image/webp"
    | "image/gif";
  text: string;
};
/** Persisted generative UI artifacts (validated as AiUiArtifact[] at the API boundary). */
export type DashboardConversationMessageArtifactRecord = {
  id: string;
  kind: "schema" | "react" | "workspaceBlock" | "workspaceNode";
  title: string;
  schema?: unknown;
  code?: string;
  props?: Record<string, unknown>;
  block?: unknown;
  node?: unknown;
  operation?: string;
  nodeId?: string;
  tabId?: string;
};
export type DashboardConversationMessageArtifactsRecord =
  DashboardConversationMessageArtifactRecord[];
export type DashboardConversationUsageLatestRecord = {
  modelId: string;
  contextLength: number | null;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number | null;
};
export type DashboardConversationUsageTotalsRecord = {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number;
};
export type DashboardConversationUsageSummaryRecord = {
  latest: DashboardConversationUsageLatestRecord | null;
  totals: DashboardConversationUsageTotalsRecord;
};

const EMPTY_DASHBOARD_CONVERSATION_USAGE_SUMMARY_RECORD: DashboardConversationUsageSummaryRecord = {
  latest: null,
  totals: {
    inputTokens: 0,
    cachedTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    costUsd: 0,
  },
};

export const dashboardWorkspace = pgTable("dashboard_workspace", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  nodes: jsonb("nodes").$type<WorkspaceNodeRecord[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const workspaceMarketplaceItem = pgTable(
  "workspace_marketplace_item",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<WorkspaceMarketplacePayloadRecord>().notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdByName: text("created_by_name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("workspace_marketplace_item_kind_idx").on(table.kind),
    index("workspace_marketplace_item_created_at_idx").on(table.createdAt),
  ],
);

export const dashboardConversation = pgTable(
  "dashboard_conversation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    model: text("model"),
    toolPreset: text("tool_preset").notNull(),
    usageSummary: jsonb("usage_summary")
      .$type<DashboardConversationUsageSummaryRecord>()
      .notNull()
      .default(EMPTY_DASHBOARD_CONVERSATION_USAGE_SUMMARY_RECORD),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
    lastReadAt: timestamp("last_read_at"),
    archivedAt: timestamp("archived_at"),
    taskId: text("task_id"),
  },
  (table) => [
    index("dashboard_conversation_user_updated_idx").on(table.userId, table.updatedAt),
    index("dashboard_conversation_user_last_message_idx").on(table.userId, table.lastMessageAt),
    uniqueIndex("dashboard_conversation_user_task_unique")
      .on(table.userId, table.taskId)
      .where(sql`${table.taskId} is not null`),
  ],
);

export const dashboardConversationMessage = pgTable(
  "dashboard_conversation_message",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => dashboardConversation.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    attachments: jsonb("attachments")
      .$type<DashboardConversationMessageAttachmentRecord[]>()
      .notNull()
      .default([]),
    contextNodeTitles: jsonb("context_node_titles")
      .$type<DashboardConversationMessageContextNodeTitlesRecord>()
      .notNull()
      .default([]),
    model: text("model"),
    toolsCalled: jsonb("tools_called")
      .$type<DashboardConversationMessageToolsCalledRecord>()
      .notNull()
      .default([]),
    artifacts: jsonb("artifacts")
      .$type<DashboardConversationMessageArtifactsRecord>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("dashboard_conversation_message_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    index("dashboard_conversation_message_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const dashboardComposerDraft = pgTable(
  "dashboard_composer_draft",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(() => dashboardConversation.id, {
      onDelete: "cascade",
    }),
    text: text("text").notNull().default(""),
    attachments: jsonb("attachments")
      .$type<DashboardConversationMessageAttachmentRecord[]>()
      .notNull()
      .default([]),
    savedAt: timestamp("saved_at").defaultNow().notNull(),
  },
  (table) => [index("dashboard_composer_draft_user_idx").on(table.userId)],
);

export type AgentAgencyProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "failed"
  | "expired";

export type AgentProposalDomain = "agency" | "canvas" | "knowledge";

/** Pending agent writes awaiting human Approve/Reject (Agency + Canvas). */
export const agentAgencyProposal = pgTable(
  "agent_agency_proposal",
  {
    id: text("id").primaryKey(),
    domain: text("domain").$type<AgentProposalDomain>().notNull().default("agency"),
    teamId: text("team_id").references(() => workspaceTeam.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(() => dashboardConversation.id, {
      onDelete: "set null",
    }),
    messageId: text("message_id"),
    action: jsonb("action").$type<Record<string, unknown>>().notNull(),
    // null = no prior/resulting entity (creates / deletes)
    beforeState: jsonb("before_state").$type<unknown>(),
    afterState: jsonb("after_state").$type<unknown>(),
    label: text("label").notNull(),
    status: text("status").$type<AgentAgencyProposalStatus>().notNull().default("pending"),
    illustrationArtifactId: text("illustration_artifact_id"),
    error: text("error"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agent_agency_proposal_team_status_idx").on(table.teamId, table.status),
    index("agent_agency_proposal_actor_created_idx").on(table.actorUserId, table.createdAt),
    index("agent_agency_proposal_conversation_idx").on(table.conversationId),
    index("agent_agency_proposal_domain_status_idx").on(table.domain, table.status),
  ],
);
