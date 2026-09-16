import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { dashboardConversation } from "./workspace";

export const agentRun = pgTable(
  "agent_run",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => dashboardConversation.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    model: text("model").notNull(),
    lastSeq: integer("last_seq").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    heartbeatAt: timestamp("heartbeat_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agent_run_user_created_idx").on(table.userId, table.createdAt),
    index("agent_run_conversation_status_idx").on(table.conversationId, table.status),
  ],
);

export const agentRunEvent = pgTable(
  "agent_run_event",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => agentRun.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("agent_run_event_run_seq_unique").on(table.runId, table.seq),
    index("agent_run_event_run_seq_idx").on(table.runId, table.seq),
  ],
);
