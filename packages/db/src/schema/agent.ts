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

export const profileNote = pgTable(
  "profile_note",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    runId: text("run_id").references(() => agentRun.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("profile_note_user_created_idx").on(table.userId, table.createdAt),
    index("profile_note_user_read_idx").on(table.userId, table.readAt),
  ],
);

export const agentFact = pgTable(
  "agent_fact",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    sourceRunId: text("source_run_id").references(() => agentRun.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("agent_fact_user_key_unique").on(table.userId, table.key)],
);

export const agentObservation = pgTable(
  "agent_observation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    observedOn: text("observed_on").notNull(),
    kind: text("kind").notNull(),
    summary: text("summary").notNull(),
    evidence: jsonb("evidence").$type<unknown>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("agent_observation_user_observed_idx").on(table.userId, table.observedOn)],
);
