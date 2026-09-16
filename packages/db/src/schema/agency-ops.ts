import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { workspaceTeam } from "./team";

export type AgencyOpsTimeEntrySource = "timer" | "manual";
export type AgencyOpsProjectTaskStatus = "open" | "in_progress" | "done" | "archived";
export type AgencyOpsProjectTaskKind = "standard" | "journey_anchor" | "journey_milestone";
export type AgencyOpsJourneyStepKind = "start" | "milestone" | "checkpoint" | "destination";
export type AgencyOpsJourneyStepStatus = "planned" | "active" | "done" | "blocked";
export type AgencyOpsProjectTaskMemberStatus = "open" | "in_progress" | "done";
export type AgencyOpsClientCategory = "internal" | "external";
export type AgencyOpsFavoriteKind = "project" | "task";
export type AgencyOpsEntityIconSource = "auto" | "manual";
export type AgencyOpsProjectTemplateMilestone = {
  title: string;
  assigneeUserIds?: string[];
};

export const agencyOpsClient = pgTable(
  "agency_ops_client",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").$type<AgencyOpsClientCategory>().notNull().default("external"),
    /** Agency-currency hourly rate (integer minor units). */
    billableRateAmount: integer("billable_rate_amount"),
    /** Source currency for the rate input. */
    currency: text("currency").notNull().default("USD"),
    sourceBillableRateAmount: integer("source_billable_rate_amount"),
    fxRate: text("fx_rate").notNull().default("1"),
    fxAsOf: timestamp("fx_as_of"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    archivedAt: timestamp("archived_at"),
  },
  (table) => [
    index("agency_ops_client_team_idx").on(table.teamId),
    index("agency_ops_client_team_name_idx").on(table.teamId, table.name),
    index("agency_ops_client_team_archived_idx").on(table.teamId, table.archivedAt),
  ],
);

export const agencyOpsProject = pgTable(
  "agency_ops_project",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => agencyOpsClient.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    colorHueId: integer("color_hue_id"),
    iconKey: text("icon_key"),
    iconSource: text("icon_source").$type<AgencyOpsEntityIconSource>().notNull().default("auto"),
    /** Optional override; null inherits the client billable rate. */
    billableRateAmount: integer("billable_rate_amount"),
    currency: text("currency").notNull().default("USD"),
    sourceBillableRateAmount: integer("source_billable_rate_amount"),
    fxRate: text("fx_rate").notNull().default("1"),
    fxAsOf: timestamp("fx_as_of"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("agency_ops_project_team_idx").on(table.teamId),
    index("agency_ops_project_team_client_idx").on(table.teamId, table.clientId),
    index("agency_ops_project_team_deleted_idx").on(table.teamId, table.deletedAt),
  ],
);

export const agencyOpsProjectTemplate = pgTable(
  "agency_ops_project_template",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    milestones: jsonb("milestones")
      .$type<AgencyOpsProjectTemplateMilestone[]>()
      .notNull()
      .default([]),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_project_template_team_idx").on(table.teamId),
    index("agency_ops_project_template_team_name_idx").on(table.teamId, table.name),
  ],
);

export const agencyOpsProjectJourney = pgTable(
  "agency_ops_project_journey",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => agencyOpsProject.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("agency_ops_project_journey_project_unique").on(table.projectId)],
);

export const agencyOpsProjectTask = pgTable(
  "agency_ops_project_task",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => agencyOpsProject.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    iconKey: text("icon_key"),
    iconSource: text("icon_source").$type<AgencyOpsEntityIconSource>().notNull().default("auto"),
    status: text("status").$type<AgencyOpsProjectTaskStatus>().notNull().default("open"),
    taskKind: text("task_kind").$type<AgencyOpsProjectTaskKind>().notNull().default("standard"),
    assignedToTeam: boolean("assigned_to_team").notNull().default(false),
    isWaste: boolean("is_waste").notNull().default(false),
    estimateMinutes: integer("estimate_minutes"),
    /** Optional override; null inherits project then client billable rate. */
    billableRateAmount: integer("billable_rate_amount"),
    currency: text("currency").notNull().default("USD"),
    sourceBillableRateAmount: integer("source_billable_rate_amount"),
    fxRate: text("fx_rate").notNull().default("1"),
    fxAsOf: timestamp("fx_as_of"),
    dueDate: timestamp("due_date"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_project_task_team_idx").on(table.teamId),
    index("agency_ops_project_task_team_project_idx").on(table.teamId, table.projectId),
    index("agency_ops_project_task_project_created_idx").on(table.projectId, table.createdAt),
    index("agency_ops_project_task_status_idx").on(table.teamId, table.status),
    index("agency_ops_project_task_due_date_idx").on(table.dueDate),
    index("agency_ops_project_task_assigned_to_team_idx").on(table.teamId, table.assignedToTeam),
    index("agency_ops_project_task_task_kind_idx").on(table.teamId, table.taskKind),
    // Must match normalizeTaskTitle() / migration 0013 expression.
    uniqueIndex("agency_ops_project_task_project_title_unique").on(
      table.projectId,
      sql`(lower(trim(regexp_replace(${table.title}, '\\s+', ' ', 'g'))))`,
    ),
  ],
);

export const agencyOpsUserFavorite = pgTable(
  "agency_ops_user_favorite",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<AgencyOpsFavoriteKind>().notNull(),
    projectId: text("project_id").references(() => agencyOpsProject.id, { onDelete: "cascade" }),
    taskId: text("task_id").references(() => agencyOpsProjectTask.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agency_ops_user_favorite_team_user_idx").on(table.teamId, table.userId),
    uniqueIndex("agency_ops_user_favorite_user_project_unique").on(table.userId, table.projectId),
    uniqueIndex("agency_ops_user_favorite_user_task_unique").on(table.userId, table.taskId),
  ],
);

export const agencyOpsProjectJourneyStep = pgTable(
  "agency_ops_project_journey_step",
  {
    id: text("id").primaryKey(),
    journeyId: text("journey_id")
      .notNull()
      .references(() => agencyOpsProjectJourney.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    label: text("label").notNull(),
    stepKind: text("step_kind").$type<AgencyOpsJourneyStepKind>().notNull(),
    status: text("status").$type<AgencyOpsJourneyStepStatus>().notNull().default("planned"),
    taskId: text("task_id").references(() => agencyOpsProjectTask.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_project_journey_step_journey_idx").on(table.journeyId),
    index("agency_ops_project_journey_step_journey_sort_idx").on(table.journeyId, table.sortOrder),
    index("agency_ops_project_journey_step_task_idx").on(table.taskId),
  ],
);

export const agencyOpsProjectTaskAssignee = pgTable(
  "agency_ops_project_task_assignee",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => agencyOpsProjectTask.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_project_task_assignee_task_user_unique").on(table.taskId, table.userId),
    index("agency_ops_project_task_assignee_user_idx").on(table.userId),
    index("agency_ops_project_task_assignee_task_idx").on(table.taskId),
  ],
);

/** Task team chat messages (keyed by task; no separate thread table). */
export const agencyOpsTaskMessage = pgTable(
  "agency_ops_task_message",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => agencyOpsProjectTask.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_task_message_team_task_created_idx").on(
      table.teamId,
      table.taskId,
      table.createdAt,
    ),
    index("agency_ops_task_message_task_idx").on(table.taskId),
  ],
);

export const agencyOpsTaskAttachment = pgTable(
  "agency_ops_task_attachment",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .notNull()
      .references(() => agencyOpsTaskMessage.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    storageKey: text("storage_key").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agency_ops_task_attachment_message_idx").on(table.messageId),
    index("agency_ops_task_attachment_team_idx").on(table.teamId),
  ],
);

export const agencyOpsProjectTaskMemberStatus = pgTable(
  "agency_ops_project_task_member_status",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => agencyOpsProjectTask.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").$type<AgencyOpsProjectTaskMemberStatus>().notNull().default("open"),
    completionCount: integer("completion_count").notNull().default(0),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_project_task_member_status_task_user_unique").on(
      table.taskId,
      table.userId,
    ),
    index("agency_ops_project_task_member_status_user_status_idx").on(table.userId, table.status),
    index("agency_ops_project_task_member_status_task_idx").on(table.taskId),
  ],
);

export const agencyOpsProjectTaskBlueprint = pgTable(
  "agency_ops_project_task_blueprint",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => agencyOpsProjectTask.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_project_task_blueprint_team_idx").on(table.teamId),
    index("agency_ops_project_task_blueprint_task_idx").on(table.taskId),
    index("agency_ops_project_task_blueprint_user_task_idx").on(table.userId, table.taskId),
  ],
);

export const agencyOpsTag = pgTable(
  "agency_ops_tag",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_tag_team_idx").on(table.teamId),
    index("agency_ops_tag_team_name_idx").on(table.teamId, table.name),
  ],
);

export const agencyOpsDepartment = pgTable(
  "agency_ops_department",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_department_team_idx").on(table.teamId),
    uniqueIndex("agency_ops_department_team_name_uidx").on(table.teamId, table.name),
  ],
);

export const agencyOpsTimeEntry = pgTable(
  "agency_ops_time_entry",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => agencyOpsProject.id, { onDelete: "cascade" }),
    taskId: text("task_id").references(() => agencyOpsProjectTask.id, { onDelete: "set null" }),
    journeyStepId: text("journey_step_id").references(() => agencyOpsProjectJourneyStep.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source").$type<AgencyOpsTimeEntrySource>().notNull().default("timer"),
    description: text("description").notNull().default(""),
    isBillable: boolean("is_billable").notNull().default(true),
    isWaste: boolean("is_waste").notNull().default(false),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("agency_ops_time_entry_team_idx").on(table.teamId),
    index("agency_ops_time_entry_team_started_idx").on(table.teamId, table.startedAt),
    index("agency_ops_time_entry_team_project_idx").on(table.teamId, table.projectId),
    index("agency_ops_time_entry_team_task_idx").on(table.teamId, table.taskId),
    index("agency_ops_time_entry_journey_step_idx").on(table.journeyStepId),
    index("agency_ops_time_entry_team_user_idx").on(table.teamId, table.userId),
    index("agency_ops_time_entry_user_started_idx").on(table.userId, table.startedAt),
    index("agency_ops_time_entry_team_deleted_idx").on(table.teamId, table.deletedAt),
  ],
);

export const agencyOpsTimeEntryTag = pgTable(
  "agency_ops_time_entry_tag",
  {
    timeEntryId: text("time_entry_id")
      .notNull()
      .references(() => agencyOpsTimeEntry.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => agencyOpsTag.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.timeEntryId, table.tagId] }),
    index("agency_ops_time_entry_tag_entry_idx").on(table.timeEntryId),
    index("agency_ops_time_entry_tag_tag_idx").on(table.tagId),
  ],
);

export const agencyOpsTimeEntryLink = pgTable(
  "agency_ops_time_entry_link",
  {
    id: text("id").primaryKey(),
    timeEntryId: text("time_entry_id")
      .notNull()
      .references(() => agencyOpsTimeEntry.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agency_ops_time_entry_link_entry_idx").on(table.timeEntryId),
    index("agency_ops_time_entry_link_entry_sort_idx").on(table.timeEntryId, table.sortOrder),
  ],
);

export const agencyOpsActiveTimer = pgTable(
  "agency_ops_active_timer",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    // Nullable so a timer can start before a project/task is chosen; entries still require a project.
    projectId: text("project_id").references(() => agencyOpsProject.id, { onDelete: "cascade" }),
    taskId: text("task_id").references(() => agencyOpsProjectTask.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    description: text("description").notNull().default(""),
    isBillable: boolean("is_billable").notNull().default(true),
    startedAt: timestamp("started_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_active_timer_user_unique").on(table.userId),
    index("agency_ops_active_timer_team_idx").on(table.teamId),
    index("agency_ops_active_timer_team_user_idx").on(table.teamId, table.userId),
    index("agency_ops_active_timer_task_idx").on(table.taskId),
  ],
);

export const agencyOpsActiveTimerTag = pgTable(
  "agency_ops_active_timer_tag",
  {
    activeTimerId: text("active_timer_id")
      .notNull()
      .references(() => agencyOpsActiveTimer.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => agencyOpsTag.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.activeTimerId, table.tagId] }),
    index("agency_ops_active_timer_tag_timer_idx").on(table.activeTimerId),
    index("agency_ops_active_timer_tag_tag_idx").on(table.tagId),
  ],
);

export const agencyOpsActiveTimerLink = pgTable(
  "agency_ops_active_timer_link",
  {
    id: text("id").primaryKey(),
    activeTimerId: text("active_timer_id")
      .notNull()
      .references(() => agencyOpsActiveTimer.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agency_ops_active_timer_link_timer_idx").on(table.activeTimerId),
    index("agency_ops_active_timer_link_timer_sort_idx").on(table.activeTimerId, table.sortOrder),
  ],
);

// ---------------------------------------------------------------------------
// Client contact
// ---------------------------------------------------------------------------

export const agencyOpsClientContact = pgTable(
  "agency_ops_client_contact",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => agencyOpsClient.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_client_contact_client_unique").on(table.clientId),
    index("agency_ops_client_contact_team_idx").on(table.teamId),
  ],
);

// ---------------------------------------------------------------------------
// Member rates
// ---------------------------------------------------------------------------

export const agencyOpsMemberRate = pgTable(
  "agency_ops_member_rate",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Cost to the agency per hour (agency currency, integer minor units). */
    costRateAmount: integer("cost_rate_amount"),
    /** Rate billed to clients per hour (agency currency, integer minor units). */
    billableRateAmount: integer("billable_rate_amount"),
    /** Source currency for rate inputs. */
    currency: text("currency").notNull().default("USD"),
    sourceCostRateAmount: integer("source_cost_rate_amount"),
    sourceBillableRateAmount: integer("source_billable_rate_amount"),
    fxRate: text("fx_rate").notNull().default("1"),
    fxAsOf: timestamp("fx_as_of"),
    effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_member_rate_team_user_unique").on(table.teamId, table.userId),
    index("agency_ops_member_rate_team_idx").on(table.teamId),
  ],
);

// ---------------------------------------------------------------------------
// Member capacity (per week)
// ---------------------------------------------------------------------------

export const agencyOpsMemberCapacity = pgTable(
  "agency_ops_member_capacity",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Team week-start date for this capacity cell (UTC midnight; day from tenure weekStartsOn). */
    weekStart: timestamp("week_start").notNull(),
    /** Capacity in seconds (e.g. requiredDailyHours × workdays × 3600). */
    capacitySeconds: integer("capacity_seconds").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_member_capacity_team_user_week_unique").on(
      table.teamId,
      table.userId,
      table.weekStart,
    ),
    index("agency_ops_member_capacity_team_idx").on(table.teamId),
    index("agency_ops_member_capacity_team_week_idx").on(table.teamId, table.weekStart),
  ],
);

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export type AgencyOpsInvoiceStatus = "draft" | "sent" | "partial" | "paid" | "refunded";

export const agencyOpsInvoice = pgTable(
  "agency_ops_invoice",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => agencyOpsClient.id, { onDelete: "restrict" }),
    /** Human-readable invoice number, e.g. INV-0001. Unique per team. */
    number: text("number").notNull(),
    status: text("status").$type<AgencyOpsInvoiceStatus>().notNull().default("draft"),
    /** Total in agency currency (integer minor units). Derived from line items. */
    amount: integer("amount").notNull().default(0),
    /** Cash collected toward this invoice (agency minor units). Remaining = amount − received. */
    receivedAmount: integer("received_amount").notNull().default(0),
    /** Source currency when composed from foreign inputs (usually agency currency). */
    currency: text("currency").notNull().default("USD"),
    sourceAmount: integer("source_amount"),
    fxRate: text("fx_rate").notNull().default("1"),
    fxAsOf: timestamp("fx_as_of"),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    issuedAt: timestamp("issued_at"),
    paidAt: timestamp("paid_at"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_invoice_team_idx").on(table.teamId),
    index("agency_ops_invoice_team_status_idx").on(table.teamId, table.status),
    index("agency_ops_invoice_team_client_idx").on(table.teamId, table.clientId),
    index("agency_ops_invoice_team_period_idx").on(
      table.teamId,
      table.periodStart,
      table.periodEnd,
    ),
    uniqueIndex("agency_ops_invoice_team_number_unique").on(table.teamId, table.number),
  ],
);

export const agencyOpsInvoiceLineItem = pgTable(
  "agency_ops_invoice_line_item",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => agencyOpsInvoice.id, { onDelete: "cascade" }),
    description: text("description").notNull().default(""),
    /** For time-derived items: the project name + date range. */
    projectId: text("project_id").references(() => agencyOpsProject.id, { onDelete: "set null" }),
    /** Duration in seconds (stored as integer seconds; divide by 3600 to get hours). */
    durationSeconds: integer("hours_seconds").notNull().default(0),
    rateAmount: integer("rate_amount").notNull().default(0),
    amount: integer("amount").notNull().default(0),
    /** Whether this line item was auto-generated from time entries. */
    fromTimeEntries: boolean("from_time_entries").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("agency_ops_invoice_line_item_invoice_idx").on(table.invoiceId)],
);

// ---------------------------------------------------------------------------
// Pending Money adjustments (compose-on-demand — apply on next export)
// ---------------------------------------------------------------------------

export type AgencyOpsMoneyPendingPartyType = "client" | "member";
export type AgencyOpsMoneyPendingAdjustmentKind = "discount" | "surcharge" | "debt";

export const agencyOpsMoneyPendingAdjustment = pgTable(
  "agency_ops_money_pending_adjustment",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    partyType: text("party_type").$type<AgencyOpsMoneyPendingPartyType>().notNull(),
    /** Client id or member user id. */
    partyId: text("party_id").notNull(),
    /** Optional obligation period this adjustment scopes to. */
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    /** Invoice id or synthetic ready id (`ready:client:…`). */
    obligationId: text("obligation_id"),
    /** Set when this adjustment is baked into an invoice. */
    appliedInvoiceId: text("applied_invoice_id").references(() => agencyOpsInvoice.id, {
      onDelete: "set null",
    }),
    invoiceLineItemId: text("invoice_line_item_id").references(() => agencyOpsInvoiceLineItem.id, {
      onDelete: "set null",
    }),
    kind: text("kind").$type<AgencyOpsMoneyPendingAdjustmentKind>().notNull(),
    /** Agency-currency amount (integer minor units). */
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("USD"),
    sourceAmount: integer("source_amount"),
    fxRate: text("fx_rate").notNull().default("1"),
    fxAsOf: timestamp("fx_as_of"),
    note: text("note").notNull().default(""),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_money_pending_adj_team_idx").on(table.teamId),
    index("agency_ops_money_pending_adj_team_party_idx").on(
      table.teamId,
      table.partyType,
      table.partyId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Money formula chip tokens (settings + payout run snapshots)
// ---------------------------------------------------------------------------

export type AgencyOpsMoneyFormulaToken =
  | { kind: "var"; id: string }
  | { kind: "number"; value: number }
  | { kind: "op"; op: "+" | "-" | "*" | "/" }
  | { kind: "paren"; value: "(" | ")" };

export type AgencyOpsMoneyFormulaOutput = "amount" | "ratio" | "hours";

export type AgencyOpsMoneyFormulaDef = {
  id: string;
  key: string;
  label: string;
  locked: boolean;
  enabled: boolean;
  tokens: AgencyOpsMoneyFormulaToken[];
  output: AgencyOpsMoneyFormulaOutput;
  metricId: string | null;
  sectionKey: string | null;
  /** Money Rules id that decides who qualifies. Null = no eligibility filter. */
  ruleId: string | null;
};

// ---------------------------------------------------------------------------
// Payout runs (Team Bills / money out)
// ---------------------------------------------------------------------------

export type AgencyOpsPayoutRunStatus = "draft" | "paying" | "paid";
export type AgencyOpsPayoutSectionKey =
  | "salaries"
  | "team_loss"
  | "device_comp"
  | "paid_vacation"
  | "debt_discount"
  | "charity"
  | "pbc"
  | "extra";
export type AgencyOpsPayoutLineStatus = "draft" | "partial" | "paid";

export const agencyOpsPayoutRun = pgTable(
  "agency_ops_payout_run",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    status: text("status").$type<AgencyOpsPayoutRunStatus>().notNull().default("draft"),
    currency: text("currency").notNull().default("USD"),
    /** Enabled Money formulas pinned when the run is ensured / formula-synced. */
    formulaSnapshotJson: jsonb("formula_snapshot_json").$type<AgencyOpsMoneyFormulaDef[]>(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_payout_run_team_idx").on(table.teamId),
    index("agency_ops_payout_run_team_period_idx").on(
      table.teamId,
      table.periodStart,
      table.periodEnd,
    ),
    uniqueIndex("agency_ops_payout_run_team_period_unique").on(
      table.teamId,
      table.periodStart,
      table.periodEnd,
    ),
  ],
);

export const agencyOpsPayoutSection = pgTable(
  "agency_ops_payout_section",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => agencyOpsPayoutRun.id, { onDelete: "cascade" }),
    key: text("key").$type<AgencyOpsPayoutSectionKey>().notNull(),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agency_ops_payout_section_run_idx").on(table.runId),
    uniqueIndex("agency_ops_payout_section_run_key_unique").on(table.runId, table.key),
  ],
);

export const agencyOpsPayoutLine = pgTable(
  "agency_ops_payout_line",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => agencyOpsPayoutSection.id, { onDelete: "cascade" }),
    /** Null for non-member adjustment lines (debt, charity, ops). */
    payeeUserId: text("payee_user_id").references(() => user.id, { onDelete: "restrict" }),
    label: text("label").notNull().default(""),
    /** Optional cohort bucket label (Money settings rules). */
    cohortKey: text("cohort_key"),
    /**
     * When set, this line was materialised from a money formula (`AgencyOpsMoneyFormulaDef.id`).
     * Null = manual / Adjust line. Formula sync never overwrites null-source lines.
     */
    sourceFormulaId: text("source_formula_id"),
    amount: integer("amount").notNull().default(0),
    paidAmount: integer("paid_amount").notNull().default(0),
    status: text("status").$type<AgencyOpsPayoutLineStatus>().notNull().default("draft"),
    /** Snapshot of tracked seconds used to derive amount (hours × cost). */
    durationSeconds: integer("duration_seconds").notNull().default(0),
    /** Snapshot of member cost rate (agency minor units/hour) at draft time. */
    rateAmount: integer("rate_amount").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_payout_line_section_idx").on(table.sectionId),
    index("agency_ops_payout_line_payee_idx").on(table.payeeUserId),
    // Manual lines: one per member payee; one label per non-member line.
    uniqueIndex("agency_ops_payout_line_section_payee_manual_unique")
      .on(table.sectionId, table.payeeUserId)
      .where(sql`${table.payeeUserId} is not null and ${table.sourceFormulaId} is null`),
    uniqueIndex("agency_ops_payout_line_section_label_manual_unique")
      .on(table.sectionId, table.label)
      .where(sql`${table.payeeUserId} is null and ${table.sourceFormulaId} is null`),
    // Formula lines: keyed by formula id (multiple formulas may share a section).
    uniqueIndex("agency_ops_payout_line_section_formula_payee_unique")
      .on(table.sectionId, table.sourceFormulaId, table.payeeUserId)
      .where(sql`${table.payeeUserId} is not null and ${table.sourceFormulaId} is not null`),
    uniqueIndex("agency_ops_payout_line_section_formula_pool_unique")
      .on(table.sectionId, table.sourceFormulaId)
      .where(sql`${table.payeeUserId} is null and ${table.sourceFormulaId} is not null`),
  ],
);

// ---------------------------------------------------------------------------
// Team salary pool (manual period total + pool-level payments)
// ---------------------------------------------------------------------------

export const agencyOpsSalaryPool = pgTable(
  "agency_ops_salary_pool",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => agencyOpsPayoutRun.id, { onDelete: "cascade" }),
    /** Full Team salaries cost for formulas (agency minor units). */
    totalAmount: integer("total_amount").notNull(),
    /** Cumulative pool payments recorded (agency minor units). */
    paidAmount: integer("paid_amount").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    sourceAmount: integer("source_amount"),
    fxRate: text("fx_rate").notNull().default("1"),
    fxAsOf: timestamp("fx_as_of"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_salary_pool_team_idx").on(table.teamId),
    uniqueIndex("agency_ops_salary_pool_run_unique").on(table.runId),
  ],
);

/** @deprecated Legacy per-member settlement rows from before pool-level `paid_amount`. Not written by current API — keep for historical rows only. */
export const agencyOpsSalaryMemberSettlement = pgTable(
  "agency_ops_salary_member_settlement",
  {
    id: text("id").primaryKey(),
    poolId: text("pool_id")
      .notNull()
      .references(() => agencyOpsSalaryPool.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    paidAmount: integer("paid_amount").notNull().default(0),
    finalizedAt: timestamp("finalized_at"),
    finalizedByUserId: text("finalized_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_salary_member_settlement_pool_idx").on(table.poolId),
    index("agency_ops_salary_member_settlement_user_idx").on(table.userId),
    uniqueIndex("agency_ops_salary_member_settlement_pool_user_unique").on(
      table.poolId,
      table.userId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Money settings (rules / formulas persistence)
// ---------------------------------------------------------------------------

export type AgencyOpsMoneyRulesJson = {
  enabledRuleIds: string[];
  notesByRuleId?: Record<string, string>;
  /** Display labels for custom rules (system labels stay in the web fixture). */
  labelByRuleId?: Record<string, string>;
  /** Cohort label shown on Rules (e.g. "All members except interns"). */
  cohortByRuleId?: Record<string, string>;
  /** Explicit member cohort when the rule uses a member picker. */
  memberIdsByRuleId?: Record<string, string[]>;
};

export type AgencyOpsMoneyCalcOptionsJson = {
  enabledOptionIds: string[];
  notesByOptionId?: Record<string, string>;
  /** Formula summary shown on Formulas (legacy). */
  summaryByOptionId?: Record<string, string>;
  /** Numeric param (e.g. paid vacation hours) (legacy). */
  valueByOptionId?: Record<string, number>;
  /** Chip/token formulas (system templates + custom). */
  formulas?: AgencyOpsMoneyFormulaDef[];
};

export const agencyOpsMoneySettings = pgTable("agency_ops_money_settings", {
  teamId: text("team_id")
    .primaryKey()
    .references(() => workspaceTeam.id, { onDelete: "cascade" }),
  /** Agency ledger currency (ISO 4217). Soft-locked after money exists. */
  currency: text("currency").notNull().default("USD"),
  currencyLockedAt: timestamp("currency_locked_at"),
  rulesJson: jsonb("rules_json")
    .$type<AgencyOpsMoneyRulesJson>()
    .notNull()
    .default({ enabledRuleIds: [] }),
  calcOptionsJson: jsonb("calc_options_json")
    .$type<AgencyOpsMoneyCalcOptionsJson>()
    .notNull()
    .default({ enabledOptionIds: [] }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// ---------------------------------------------------------------------------
// FX rates (agency-owned; optional live suggest from Frankfurter)
// ---------------------------------------------------------------------------

export const agencyOpsFxRate = pgTable(
  "agency_ops_fx_rate",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    /** Decimal string: 1 fromCurrency = rate toCurrency */
    rate: text("rate").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_fx_rate_team_idx").on(table.teamId),
    uniqueIndex("agency_ops_fx_rate_team_pair_unique").on(
      table.teamId,
      table.fromCurrency,
      table.toCurrency,
    ),
  ],
);

/** Locked team FX copy for one Money period range. Missing pairs copy in; existing rows never overwrite. */
export const agencyOpsPeriodFx = pgTable(
  "agency_ops_period_fx",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    /** Decimal string: 1 fromCurrency = rate toCurrency */
    rate: text("rate").notNull(),
    fxAsOf: timestamp("fx_as_of"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agency_ops_period_fx_team_idx").on(table.teamId),
    uniqueIndex("agency_ops_period_fx_team_period_pair_unique").on(
      table.teamId,
      table.periodStart,
      table.periodEnd,
      table.fromCurrency,
      table.toCurrency,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Ops expenses (vendor / subscription spend — Money Expenses card)
// ---------------------------------------------------------------------------

export type AgencyOpsExpenseKind = "one_time" | "subscription";
export type AgencyOpsExpenseAmountMode = "fixed" | "variable";
export type AgencyOpsExpensePeriod = "weekly" | "monthly" | "quarterly" | "yearly";
export type AgencyOpsExpenseStatus = "due" | "partial" | "paid";

export const agencyOpsExpense = pgTable(
  "agency_ops_expense",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").$type<AgencyOpsExpenseKind>().notNull(),
    period: text("period").$type<AgencyOpsExpensePeriod>(),
    note: text("note").notNull().default(""),
    /** Agency-currency amount (integer minor units). */
    amount: integer("amount").notNull().default(0),
    amountMode: text("amount_mode").$type<AgencyOpsExpenseAmountMode>().notNull().default("fixed"),
    currency: text("currency").notNull().default("USD"),
    sourceAmount: integer("source_amount"),
    fxRate: text("fx_rate").notNull().default("1"),
    fxAsOf: timestamp("fx_as_of"),
    status: text("status").$type<AgencyOpsExpenseStatus>().notNull().default("due"),
    paidAmount: integer("paid_amount").notNull().default(0),
    /** Billing anchor / first charge date for subscriptions. */
    startsAt: timestamp("starts_at"),
    /** Next due date for subscriptions. */
    nextDueAt: timestamp("next_due_at"),
    /** Spend date for one-time expenses. */
    occurredAt: timestamp("occurred_at"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_expense_team_idx").on(table.teamId),
    index("agency_ops_expense_team_kind_idx").on(table.teamId, table.kind),
    index("agency_ops_expense_team_next_due_idx").on(table.teamId, table.nextDueAt),
  ],
);

export const agencyOpsExpenseOccurrence = pgTable(
  "agency_ops_expense_occurrence",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => agencyOpsExpense.id, { onDelete: "cascade" }),
    /** Subscription cycle due date; immutable accounting period ownership. */
    dueAt: timestamp("due_at").notNull(),
    /** Agency-currency amount snapshotted when the cycle receives a payment. */
    amount: integer("amount").notNull(),
    paidAmount: integer("paid_amount").notNull().default(0),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_expense_occurrence_expense_due_unique").on(
      table.expenseId,
      table.dueAt,
    ),
    index("agency_ops_expense_occurrence_due_idx").on(table.dueAt),
  ],
);

// ---------------------------------------------------------------------------
// Member tenure (agency time)
// ---------------------------------------------------------------------------

export const agencyOpsTenurePolicy = pgTable(
  "agency_ops_tenure_policy",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    /** Calendar month (1–12) when the fiscal year starts, e.g. 4 = April. */
    fiscalYearStartMonth: integer("fiscal_year_start_month").notNull().default(1),
    /** Day of month when each fiscal month/year begins (e.g. 26 → periods run 26th–25th). */
    fiscalYearStartDay: integer("fiscal_year_start_day").notNull().default(1),
    quarterlyMinHours: integer("quarterly_min_hours").notNull().default(525),
    monthlyMinHours: integer("monthly_min_hours").notNull().default(200),
    penaltyMonths: integer("penalty_months").notNull().default(6),
    internDurationMonths: integer("intern_duration_months").notNull().default(4),
    internDurationWeeks: integer("intern_duration_weeks").notNull().default(0),
    /** Required hours per working day for the team baseline. */
    requiredDailyHours: integer("required_daily_hours").notNull().default(8),
    /** JS getDay() week start: 0=Sunday … 6=Saturday. */
    weekStartsOn: integer("week_starts_on").notNull().default(1),
    /** Trailing weekend length within the team week (1–3). */
    weekendDurationDays: integer("weekend_duration_days").notNull().default(2),
    /** Hours credited per weekday off day when lowering month/quarter min and target (minute precision). */
    offDayReduceHours: doublePrecision("off_day_reduce_hours").notNull().default(8),
    policyEffectiveFrom: timestamp("policy_effective_from").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("agency_ops_tenure_policy_team_unique").on(table.teamId)],
);

export const agencyOpsMemberTenureProfile = pgTable(
  "agency_ops_member_tenure_profile",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Manual override; when null, derived from first tracked time + policy duration. */
    internStart: timestamp("intern_start"),
    internEnd: timestamp("intern_end"),
    internCountsTowardTenure: boolean("intern_counts_toward_tenure").notNull().default(false),
    internExemptFromQuarterMin: boolean("intern_exempt_from_quarter_min").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_member_tenure_profile_team_user_unique").on(table.teamId, table.userId),
    index("agency_ops_member_tenure_profile_team_idx").on(table.teamId),
  ],
);

// ---------------------------------------------------------------------------
// Saved reports
// ---------------------------------------------------------------------------

export type AgencyOpsReportActivityAction =
  | "created"
  | "renamed"
  | "entries_excluded"
  | "entries_restored"
  | "entry_edited"
  | "waste_toggled"
  | "exported";

export const agencyOpsReport = pgTable(
  "agency_ops_report",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rangePreset: text("range_preset").notNull(),
    customFromDate: text("custom_from_date").notNull().default(""),
    customToDate: text("custom_to_date").notNull().default(""),
    rangeFrom: timestamp("range_from").notNull(),
    rangeTo: timestamp("range_to").notNull(),
    clientId: text("client_id").notNull().default(""),
    projectId: text("project_id").notNull().default(""),
    memberUserId: text("member_user_id").notNull().default(""),
    fieldIds: jsonb("field_ids").$type<string[]>().notNull().default([]),
    excludedEntryIds: jsonb("excluded_entry_ids").$type<string[]>().notNull().default([]),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_report_team_idx").on(table.teamId),
    index("agency_ops_report_team_updated_idx").on(table.teamId, table.updatedAt),
    index("agency_ops_report_team_range_from_idx").on(table.teamId, table.rangeFrom),
  ],
);

export const agencyOpsReportActivity = pgTable(
  "agency_ops_report_activity",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => agencyOpsReport.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").$type<AgencyOpsReportActivityAction>().notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agency_ops_report_activity_report_idx").on(table.reportId),
    index("agency_ops_report_activity_report_created_idx").on(table.reportId, table.createdAt),
  ],
);

export type AgencyOpsTenureExemptionType =
  | "team_holiday"
  | "member_waiver"
  | "member_reduced_min"
  | "member_frozen_month";

export const agencyOpsTenureQuarterExemption = pgTable(
  "agency_ops_tenure_quarter_exemption",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    type: text("type").$type<AgencyOpsTenureExemptionType>().notNull(),
    fiscalYear: integer("fiscal_year").notNull(),
    fiscalQuarter: integer("fiscal_quarter").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    reducedMinHours: integer("reduced_min_hours"),
    /** Calendar month (1–12) within the fiscal quarter for frozen-month exemptions. */
    frozenMonth: integer("frozen_month"),
    reason: text("reason"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_tenure_quarter_exemption_team_idx").on(table.teamId),
    index("agency_ops_tenure_quarter_exemption_team_quarter_idx").on(
      table.teamId,
      table.fiscalYear,
      table.fiscalQuarter,
    ),
    index("agency_ops_tenure_quarter_exemption_team_user_quarter_idx").on(
      table.teamId,
      table.userId,
      table.fiscalYear,
      table.fiscalQuarter,
    ),
  ],
);

/** Calendar leave: member-specific (`userId` set) or team-wide holiday (`userId` null). */
export type AgencyOpsMemberLeaveType = "pto" | "sick" | "team_holiday" | "other";

export const agencyOpsMemberLeave = pgTable(
  "agency_ops_member_leave",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    /** Null = team-wide holiday inherited by every member profile. */
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    type: text("type").$type<AgencyOpsMemberLeaveType>().notNull(),
    reason: text("reason"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_member_leave_team_idx").on(table.teamId),
    index("agency_ops_member_leave_team_user_idx").on(table.teamId, table.userId),
    index("agency_ops_member_leave_team_dates_idx").on(
      table.teamId,
      table.startDate,
      table.endDate,
    ),
  ],
);

export const agencyOpsMemberReview = pgTable(
  "agency_ops_member_review",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    subjectUserId: text("subject_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reviewDate: text("review_date").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agency_ops_member_review_team_subject_idx").on(table.teamId, table.subjectUserId),
    index("agency_ops_member_review_team_subject_date_idx").on(
      table.teamId,
      table.subjectUserId,
      table.reviewDate,
    ),
  ],
);

export type AgencyOpsMemberProfileAlertKind =
  | "abnormal_day"
  | "month_pace"
  | "quarter_pace"
  | "waste_spike"
  | "custom";
export type AgencyOpsMemberProfileAlertSource = "system" | "custom";
export type AgencyOpsMemberProfileAlertStatus = "open" | "snoozed" | "removed";

export type AgencyOpsMemberProfileAlertContext = {
  dateKey?: string;
  hours?: number;
  requiredHours?: number;
  loggedHours?: number;
  projectedHours?: number;
  wasteRatio?: number;
  periodKey?: string;
  defaultSnoozeUntil?: string;
};

export const agencyOpsMemberProfileAlert = pgTable(
  "agency_ops_member_profile_alert",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    subjectUserId: text("subject_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    kind: text("kind").$type<AgencyOpsMemberProfileAlertKind>().notNull(),
    source: text("source").$type<AgencyOpsMemberProfileAlertSource>().notNull(),
    status: text("status").$type<AgencyOpsMemberProfileAlertStatus>().notNull().default("open"),
    fingerprint: text("fingerprint").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    note: text("note"),
    contextJson: jsonb("context_json")
      .$type<AgencyOpsMemberProfileAlertContext>()
      .notNull()
      .default({}),
    sentAt: timestamp("sent_at"),
    snoozedUntil: timestamp("snoozed_until"),
    removedAt: timestamp("removed_at"),
    removedByUserId: text("removed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_member_profile_alert_fingerprint_uidx").on(
      table.teamId,
      table.subjectUserId,
      table.fingerprint,
    ),
    index("agency_ops_member_profile_alert_team_subject_idx").on(
      table.teamId,
      table.subjectUserId,
      table.status,
    ),
  ],
);

export const agencyOpsMemberProfileAlertPolicy = pgTable("agency_ops_member_profile_alert_policy", {
  teamId: text("team_id")
    .primaryKey()
    .references(() => workspaceTeam.id, { onDelete: "cascade" }),
  abnormalDayEnabled: boolean("abnormal_day_enabled").notNull().default(true),
  abnormalDayExtraHours: integer("abnormal_day_extra_hours").notNull().default(4),
  monthPaceEnabled: boolean("month_pace_enabled").notNull().default(true),
  monthPacePercent: integer("month_pace_percent").notNull().default(85),
  quarterPaceEnabled: boolean("quarter_pace_enabled").notNull().default(true),
  quarterPacePercent: integer("quarter_pace_percent").notNull().default(85),
  wasteSpikeEnabled: boolean("waste_spike_enabled").notNull().default(true),
  wasteSpikePercent: integer("waste_spike_percent").notNull().default(20),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type AgencyOpsMemberEmploymentType = "full_time" | "part_time" | "contractor" | "intern";
export type AgencyOpsMemberWorkModel = "onsite" | "hybrid" | "remote";
export type AgencyOpsMemberEmploymentStatus = "active" | "inactive";
export type AgencyOpsMemberLeaveAllowancePeriod = "year" | "quarter" | "month";

export const agencyOpsMemberHrProfile = pgTable(
  "agency_ops_member_hr_profile",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    departmentId: text("department_id").references(() => agencyOpsDepartment.id, {
      onDelete: "set null",
    }),
    status: text("status").$type<AgencyOpsMemberEmploymentStatus>().notNull().default("active"),
    employmentType: text("employment_type").$type<AgencyOpsMemberEmploymentType>(),
    workModel: text("work_model").$type<AgencyOpsMemberWorkModel>(),
    gender: text("gender"),
    dateOfBirth: text("date_of_birth"),
    phone: text("phone"),
    address: text("address"),
    linkedinUrl: text("linkedin_url"),
    xUrl: text("x_url"),
    instagramUrl: text("instagram_url"),
    offAllowanceDays: integer("off_allowance_days").notNull().default(15),
    leaveAllowancePeriod: text("leave_allowance_period")
      .$type<AgencyOpsMemberLeaveAllowancePeriod>()
      .notNull()
      .default("year"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agency_ops_member_hr_profile_team_user_uidx").on(table.teamId, table.userId),
    index("agency_ops_member_hr_profile_team_idx").on(table.teamId),
    index("agency_ops_member_hr_profile_team_department_idx").on(table.teamId, table.departmentId),
  ],
);
